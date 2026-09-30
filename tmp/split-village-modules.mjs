import fs from "node:fs";

export function analyzeSource(raw) {
  const src = raw.replace(/\r\n/g, "\n");
  const lines = src.split("\n");

  const declLines = [];
  {
    let i = 0;
    let line = 1;
    let brace = 0;
    let mode = "code";
    let lineStart = true;
    const stack = [];
    const markDecl = () => {
      const text = lines[line - 1] ?? "";
      const trimmed = text.trim();
      if (
        /^(export\s+)?(declare\s+)?(async\s+)?(function|class|interface|enum|type)\b/.test(trimmed) ||
        /^(export\s+)?(const|let|var)\b/.test(trimmed)
      ) {
        declLines.push(line - 1);
      }
    };
    while (i < src.length) {
      const c = src[i];
      const n = src[i + 1];
      if (mode === "block") {
        if (c === "*" && n === "/") {
          mode = "code";
          i += 2;
          lineStart = false;
          continue;
        }
        if (c === "\n") {
          line++;
          lineStart = true;
        }
        i++;
        continue;
      }
      if (mode === "sq" || mode === "dq") {
        if (c === "\\") {
          i += 2;
          continue;
        }
        if ((mode === "sq" && c === "'") || (mode === "dq" && c === '"')) mode = "code";
        if (c === "\n") {
          line++;
          lineStart = true;
        } else lineStart = false;
        i++;
        continue;
      }
      if (mode === "tmpl") {
        if (c === "\\") {
          i += 2;
          continue;
        }
        if (c === "`") {
          mode = "code";
          lineStart = false;
          i++;
          continue;
        }
        if (c === "$" && n === "{") {
          stack.push(brace);
          mode = "code";
          brace++;
          lineStart = false;
          i += 2;
          continue;
        }
        if (c === "\n") {
          line++;
          lineStart = true;
        } else lineStart = false;
        i++;
        continue;
      }
      if (c === "/" && n === "/") {
        while (i < src.length && src[i] !== "\n") i++;
        continue;
      }
      if (c === "/" && n === "*") {
        mode = "block";
        lineStart = false;
        i += 2;
        continue;
      }
      if (c === "'") {
        mode = "sq";
        lineStart = false;
        i++;
        continue;
      }
      if (c === '"') {
        mode = "dq";
        lineStart = false;
        i++;
        continue;
      }
      if (c === "`") {
        mode = "tmpl";
        lineStart = false;
        i++;
        continue;
      }
      if (c === "{") {
        brace++;
        lineStart = false;
        i++;
        continue;
      }
      if (c === "}") {
        brace--;
        i++;
        lineStart = false;
        if (stack.length > 0 && brace === stack[stack.length - 1]) {
          stack.pop();
          mode = "tmpl";
        }
        continue;
      }
      if (c === "\n") {
        line++;
        lineStart = true;
        i++;
        continue;
      }
      if (lineStart && !/\s/.test(c)) {
        if (brace === 0) markDecl();
        lineStart = false;
      } else if (lineStart && /\s/.test(c)) {
        // still at the indent
      } else {
        lineStart = false;
      }
      i++;
    }
    if (brace !== 0 || mode !== "code" || stack.length !== 0) {
      console.error(`SCAN ERROR brace=${brace} mode=${mode} stack=${stack.length} line=${line}`);
    }
  }

  function leadingStart(lineIndex) {
    let start = lineIndex;
    let i = lineIndex - 1;
    while (i >= 0 && lines[i].trim() === "") i--;
    while (i >= 0) {
      const t = lines[i].trim();
      if (t.startsWith("//") || t.startsWith("*") || t.startsWith("/*") || t.endsWith("*/") || t === "") {
        start = i;
        i--;
        continue;
      }
      break;
    }
    while (start < lineIndex && lines[start].trim() === "") start++;
    return start;
  }

  const decls = declLines.map((line, index) => {
    const start = leadingStart(line);
    const end = index + 1 < declLines.length ? leadingStart(declLines[index + 1]) - 1 : lines.length - 1;
    const header = lines[line].trim();
    const exported = header.startsWith("export ");
    const kindMatch = header.replace(/^export\s+/, "").match(/^(async\s+)?(function|class|interface|enum|type|const|let|var)\b/);
    const kind = kindMatch ? kindMatch[2] : "?";
    const nameMatch = header.replace(/^export\s+/, "").match(/^(?:async\s+)?(?:function|class|interface|enum|type|const|let|var)\s+(\w+)/);
    const name = nameMatch ? nameMatch[1] : "?";
    return { name, kind, exported, line: line + 1, start: start + 1, end: end + 1 };
  });

  return { lines, decls };
}

const isMain = process.argv[1]?.endsWith("split-village-modules.mjs");
if (isMain) {
  const file = process.argv[2];
  const { lines, decls } = analyzeSource(fs.readFileSync(file, "utf8"));
  console.log(`file ${file}`);
  console.log(`lines ${lines.length} decls ${decls.length}`);
  for (const decl of decls) {
    const flag = decl.exported ? "export" : "local ";
    console.log(`${String(decl.line).padStart(5)} ${flag} ${decl.kind.padEnd(9)} ${decl.name} (${decl.end - decl.start + 1} lines, ends ${decl.end})`);
  }
}
