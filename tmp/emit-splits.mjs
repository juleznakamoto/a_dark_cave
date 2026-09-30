import fs from "node:fs";
import path from "node:path";
import { analyzeSource } from "./split-village-modules.mjs";

const write = process.argv.includes("--write");
const root = process.cwd();

const jobs = [
  {
    source: "client/src/pages/village-map-demo/geometry.ts",
    cuts: ["alchemistHall", "mapFramePoints"],
    files: [
      "client/src/pages/village-map-demo/geometry.ts",
      "client/src/pages/village-map-demo/geometryBuildings.ts",
      "client/src/pages/village-map-demo/geometryFrame.ts",
    ],
    barrel: 0,
  },
  {
    source: "client/src/pages/village-map-demo/pathways.ts",
    cuts: ["middleSplit", "doorRoute"],
    files: [
      "client/src/pages/village-map-demo/pathways.ts",
      "client/src/pages/village-map-demo/pathwayJoins.ts",
      "client/src/pages/village-map-demo/pathwayDraw.ts",
    ],
    barrel: 0,
  },
  {
    source: "client/src/pages/village-map-demo/VillageMap.tsx",
    cuts: ["HeartfireMark", "prefersReducedMotion"],
    files: [
      "client/src/pages/village-map-demo/mapChrome.tsx",
      "client/src/pages/village-map-demo/mapMarks.tsx",
      "client/src/pages/village-map-demo/VillageMap.tsx",
    ],
    barrel: 2,
  },
];

function identSet(text) {
  const found = new Set();
  const re = /(?:(?<![.\w?])|(?<=\.\.\.))([A-Za-z_]\w*)\b/g;
  for (const match of text.matchAll(re)) found.add(match[1]);
  return found;
}

function maskNonCode(src) {
  let out = "";
  let i = 0;
  let mode = "code";
  let brace = 0;
  const stack = [];
  while (i < src.length) {
    const c = src[i];
    const n = src[i + 1];
    const blank = (ch) => {
      out += ch === "\n" ? "\n" : " ";
    };
    if (mode === "block") {
      if (c === "*" && n === "/") {
        mode = "code";
        out += "  ";
        i += 2;
        continue;
      }
      blank(c);
      i++;
      continue;
    }
    if (mode === "sq" || mode === "dq") {
      if (c === "\\") {
        blank(c);
        blank(n ?? " ");
        i += 2;
        continue;
      }
      if ((mode === "sq" && c === "'") || (mode === "dq" && c === '"')) mode = "code";
      blank(c);
      i++;
      continue;
    }
    if (mode === "tmpl") {
      if (c === "\\") {
        blank(c);
        blank(n ?? " ");
        i += 2;
        continue;
      }
      if (c === "`") {
        mode = "code";
        out += c;
        i++;
        continue;
      }
      if (c === "$" && n === "{") {
        stack.push(brace);
        mode = "code";
        brace++;
        out += c + n;
        i += 2;
        continue;
      }
      blank(c);
      i++;
      continue;
    }
    if (c === "/" && n === "/") {
      while (i < src.length && src[i] !== "\n") {
        blank(src[i]);
        i++;
      }
      continue;
    }
    if (c === "/" && n === "*") {
      mode = "block";
      out += "  ";
      i += 2;
      continue;
    }
    if (c === "'") {
      mode = "sq";
      blank(c);
      i++;
      continue;
    }
    if (c === '"') {
      mode = "dq";
      blank(c);
      i++;
      continue;
    }
    if (c === "`") {
      mode = "tmpl";
      out += c;
      i++;
      continue;
    }
    if (c === "{") {
      brace++;
      out += c;
      i++;
      continue;
    }
    if (c === "}") {
      brace--;
      out += c;
      i++;
      if (stack.length > 0 && brace === stack[stack.length - 1]) {
        stack.pop();
        mode = "tmpl";
      }
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

function eagerNames(declText, foreign) {
  const masked = maskNonCode(declText);
  const eq = masked.indexOf("=");
  if (eq < 0) return [];
  const rhs = masked.slice(eq + 1);
  let depth = 0;
  let i = 0;
  let buf = "";
  while (i < rhs.length) {
    const c = rhs[i];
    if (c === "{") {
      const before = rhs.slice(0, i);
      const arrow = /=>\s*$/.test(before);
      const fn = /\bfunction\b[^()]*\([^)]*\)\s*$/.test(before) || /\bfunction\b\s*$/.test(before);
      if ((arrow || fn) && depth === 0) {
        let brace = 1;
        i++;
        while (i < rhs.length && brace > 0) {
          if (rhs[i] === "{") brace++;
          else if (rhs[i] === "}") brace--;
          i++;
        }
        continue;
      }
      depth++;
      buf += c;
      i++;
      continue;
    }
    if (c === "}") {
      depth--;
      buf += c;
      i++;
      continue;
    }
    if (depth === 0 && c === "(") {
      const before = rhs.slice(Math.max(0, i - 12), i);
      if (/=>\s*$/.test(before)) {
        let paren = 1;
        i++;
        while (i < rhs.length && paren > 0) {
          if (rhs[i] === "(") paren++;
          else if (rhs[i] === ")") paren--;
          i++;
        }
        continue;
      }
    }
    buf += c;
    i++;
  }
  const found = [];
  for (const name of foreign) {
    if (new RegExp(`(?:(?<![.\\w?])|(?<=\\.\\.\\.))${name}\\b`).test(buf)) found.push(name);
  }
  return found;
}

function renderImport(specifier, names, byName) {
  const values = [];
  const types = [];
  for (const name of [...names].sort()) {
    const kind = byName.get(name).kind;
    if (kind === "type" || kind === "interface") types.push(name);
    else values.push(name);
  }
  const parts = [...values, ...types.map((name) => `type ${name}`)];
  if (parts.length === 0) return "";
  if (parts.length === 1) return `import { ${parts[0]} } from "${specifier}";`;
  return `import {\n${parts.map((part) => `  ${part},`).join("\n")}\n} from "${specifier}";`;
}

function renderReexport(specifier, names, byName) {
  const values = [];
  const types = [];
  for (const name of [...names].sort()) {
    const kind = byName.get(name).kind;
    if (kind === "type" || kind === "interface") types.push(name);
    else values.push(name);
  }
  const lines = [];
  if (values.length) {
    lines.push(`export {\n${values.map((name) => `  ${name},`).join("\n")}\n} from "${specifier}";`);
  }
  if (types.length) {
    lines.push(`export type {\n${types.map((name) => `  ${name},`).join("\n")}\n} from "${specifier}";`);
  }
  return lines.join("\n");
}

function specifierFor(filePath) {
  const base = path.basename(filePath).replace(/\.(tsx|ts)$/, "");
  return `@/pages/village-map-demo/${base}`;
}

function splitJob(job) {
  const absolute = path.join(root, job.source);
  const { lines, decls } = analyzeSource(fs.readFileSync(absolute, "utf8"));
  const cutIndexes = job.cuts.map((name) => {
    const index = decls.findIndex((decl) => decl.name === name);
    if (index < 0) throw new Error(`Missing cut ${name} in ${job.source}`);
    return index;
  });
  const ranges = [0, ...cutIndexes, decls.length];
  const chunks = ranges.slice(0, -1).map((start, index) => decls.slice(start, ranges[index + 1]));
  if (chunks.length !== job.files.length) throw new Error(`Chunk mismatch ${job.source}`);

  const byName = new Map(decls.map((decl) => [decl.name, decl]));
  const owner = new Map();
  chunks.forEach((chunk, index) => {
    for (const decl of chunk) owner.set(decl.name, index);
  });

  const preambleEnd = chunks[0][0].start - 1;
  const preamble = lines.slice(0, preambleEnd).join("\n").trimEnd();

  const used = chunks.map((chunk) => {
    const own = new Set(chunk.map((decl) => decl.name));
    const text = maskNonCode(chunk.map((decl) => lines.slice(decl.start - 1, decl.end).join("\n")).join("\n"));
    const names = new Set();
    for (const name of identSet(text)) {
      if (!byName.has(name) || own.has(name)) continue;
      names.add(name);
    }
    return names;
  });

  const eager = [];
  for (const chunk of chunks) {
    const index = chunks.indexOf(chunk);
    const foreign = [...used[index]].filter((name) => {
      const kind = byName.get(name).kind;
      return kind === "const" || kind === "let" || kind === "var" || kind === "function" || kind === "class";
    });
    for (const decl of chunk) {
      if (decl.kind !== "const" && decl.kind !== "let" && decl.kind !== "var") continue;
      const text = lines.slice(decl.start - 1, decl.end).join("\n");
      const hits = eagerNames(text, foreign);
      if (hits.length) eager.push(`${job.files[index]} ${decl.name} -> ${hits.join(", ")}`);
    }
  }

  const bodies = chunks.map((chunk, index) => {
    const needed = new Set(used[index]);
    for (const decl of chunk) {
      if (![...used].some((set, other) => other !== index && set.has(decl.name))) continue;
      if (!decl.exported) decl.forceExport = true;
    }
    const parts = chunk.map((decl) => {
      const block = lines.slice(decl.start - 1, decl.end);
      if (decl.forceExport) {
        const at = decl.line - decl.start;
        block[at] = block[at].replace(/^(\s*)/, "$1export ");
      }
      return block.join("\n");
    });
    return { needed, text: parts.join("\n").trimEnd() };
  });

  const outputs = job.files.map((filePath, index) => {
    const specGroups = new Map();
    for (const name of bodies[index].needed) {
      const from = job.files[owner.get(name)];
      const spec = specifierFor(from);
      if (!specGroups.has(spec)) specGroups.set(spec, new Set());
      specGroups.get(spec).add(name);
    }
    const imports = [...specGroups.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([spec, names]) => renderImport(spec, names, byName))
      .filter(Boolean)
      .join("\n");

    let reexports = "";
    if (index === job.barrel) {
      const groups = new Map();
      for (const decl of decls) {
        if (!decl.exported || owner.get(decl.name) === index) continue;
        const spec = specifierFor(job.files[owner.get(decl.name)]);
        if (!groups.has(spec)) groups.set(spec, new Set());
        groups.get(spec).add(decl.name);
      }
      reexports = [...groups.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([spec, names]) => renderReexport(spec, names, byName))
        .filter(Boolean)
        .join("\n\n");
    }

    const chunksOut = [preamble, imports, bodies[index].text, reexports].filter(Boolean);
    const text = `${chunksOut.join("\n\n")}\n`;
    return { filePath, text, lineCount: text.split("\n").length - 1 };
  });

  return { outputs, eager };
}

const reports = [];
for (const job of jobs) {
  const { outputs, eager } = splitJob(job);
  console.log(`\n${job.source}`);
  for (const output of outputs) console.log(`  ${output.lineCount}\t${output.filePath}`);
  if (eager.length) {
    console.log("  EAGER:");
    for (const line of eager) console.log(`    ${line}`);
  } else {
    console.log("  eager cross-init: none");
  }
  reports.push({ job, outputs, eager });
}

if (write) {
  if (reports.some((report) => report.eager.length > 0)) {
    console.error("\nRefusing to write while eager cross-init references remain.");
    process.exit(1);
  }
  for (const report of reports) {
    for (const output of report.outputs) {
      fs.writeFileSync(path.join(root, output.filePath), output.text);
    }
  }
  const testPath = path.join(root, "client/src/pages/village-map-demo/geometry.test.ts");
  const test = fs.readFileSync(testPath, "utf8").replace(/\r\n/g, "\n");
  const testLines = test.split("\n");
  const header = testLines.slice(0, 144).join("\n");
  const parts = [
    ["client/src/pages/village-map-demo/geometry.layout.test.ts", testLines.slice(145, 1414).join("\n")],
    ["client/src/pages/village-map-demo/geometry.buildings.test.ts", testLines.slice(1415, 2119).join("\n")],
    ["client/src/pages/village-map-demo/geometry.landmarks.test.ts", testLines.slice(2120).join("\n")],
  ];
  for (const [filePath, body] of parts) {
    fs.writeFileSync(path.join(root, filePath), `${header}\n\n${body.trim()}\n`);
  }
  fs.unlinkSync(testPath);
  console.log("\nWrote split files and geometry tests.");
}
