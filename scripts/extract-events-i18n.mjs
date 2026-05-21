/**
 * Extract event strings into en/events.json with choices and log.outcomeN keys.
 * Run before migrate-events-i18n.mjs while TS files still contain source strings.
 *
 * Usage:
 *   node scripts/extract-events-i18n.mjs           # from working tree
 *   node scripts/extract-events-i18n.mjs --git     # from git HEAD (restore after migration)
 *   node scripts/extract-events-i18n.mjs --git --merge  # merge into existing catalog
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const RULES = path.join(ROOT, "client/src/game/rules");
const OUT = path.join(ROOT, "client/src/i18n/locales/en");
const useGit = process.argv.includes("--git");
const merge = process.argv.includes("--merge");

function unescape(s) {
  return s.replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\\\/g, "\\");
}

function setNested(obj, keys, value) {
  let cur = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    cur[keys[i]] ??= {};
    cur = cur[keys[i]];
  }
  cur[keys[keys.length - 1]] = value;
}

function sortDeep(obj) {
  if (Array.isArray(obj)) return obj.map(sortDeep);
  if (obj && typeof obj === "object") {
    return Object.keys(obj)
      .sort()
      .reduce((acc, k) => {
        acc[k] = sortDeep(obj[k]);
        return acc;
      }, {});
  }
  return obj;
}

function deepMergeMissing(target, source) {
  for (const [key, value] of Object.entries(source)) {
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      target[key] &&
      typeof target[key] === "object"
    ) {
      deepMergeMissing(target[key], value);
    } else if (!(key in target)) {
      target[key] = value;
    }
  }
  return target;
}

function readSource(file) {
  if (!useGit) {
    return fs.readFileSync(path.join(RULES, file), "utf8");
  }
  try {
    return execSync(`git show HEAD:client/src/game/rules/${file}`, {
      cwd: ROOT,
      encoding: "utf8",
    });
  } catch {
    return fs.readFileSync(path.join(RULES, file), "utf8");
  }
}

function extractFromSource(src) {
  const events = {};
  const eventRe = /\n\s{2}([\w]+):\s*\{\s*\n\s{4}id:\s*"([^"]+)"/g;
  let match;
  while ((match = eventRe.exec(src)) !== null) {
    const eventId = match[2];
    const start = match.index;
    const rest = src.slice(start + 1);
    const nextIdx = rest.search(/\n\s{2}[\w]+:\s*\{\s*\n\s{4}id:/);
    const block = src.slice(start, nextIdx === -1 ? src.length : start + 1 + nextIdx);

    const title = block.match(/\n\s{4}title:\s*"((?:\\.|[^"\\])*)"/)?.[1];
    if (title) setNested(events, [eventId, "title"], unescape(title));

    const msgInline = block.match(/\n\s{4}message:\s*\n\s+"((?:\\.|[^"\\])*)"/)?.[1];
    const msgSameLine = block.match(/\n\s{4}message:\s*"((?:\\.|[^"\\])*)"/)?.[1];
    const staticMsg = msgInline ?? msgSameLine;
    if (staticMsg) setNested(events, [eventId, "message"], unescape(staticMsg));

    const fnFirst = block.match(
      /message:\s*\(state[^)]*\)\s*=>\s*\{[\s\S]*?if\s*\([^)]+\)\s*\{\s*return\s*`([^`]*)`/,
    );
    if (fnFirst) {
      setNested(events, [eventId, "message", "firstTime"], unescape(fnFirst[1]));
      const fnElse = block.match(/else\s*\{\s*return\s*`([^`]*)`/);
      if (fnElse) {
        setNested(events, [eventId, "message", "repeat"], unescape(fnElse[1]));
      }
    }

    const choiceRe =
      /\{\s*\n\s{8}id:\s*"([^"]+)"[\s\S]*?\n\s{8}label:\s*"((?:\\.|[^"\\])*)"/g;
    let cm;
    while ((cm = choiceRe.exec(block)) !== null) {
      const [, choiceId, label] = cm;
      setNested(events, [eventId, "choices", choiceId, "label"], unescape(label));
      const choiceSlice = block.slice(cm.index, cm.index + 400);
      const cost = choiceSlice.match(/cost:\s*"((?:\\.|[^"\\])*)"/)?.[1];
      if (cost) {
        setNested(events, [eventId, "choices", choiceId, "cost"], unescape(cost));
      }
    }

    const templateLabelRe =
      /\{\s*\n\s{8}id:\s*"([^"]+)"[\s\S]*?\n\s{8}label:\s*`([^`]*)`/g;
    let tlm;
    while ((tlm = templateLabelRe.exec(block)) !== null) {
      const [, choiceId, label] = tlm;
      setNested(events, [eventId, "choices", choiceId, "label"], unescape(label));
    }

    const fallbackLabel = block.match(
      /\n\s{4}fallbackChoice:\s*\{[\s\S]*?\n\s{6}label:\s*"((?:\\.|[^"\\])*)"/,
    )?.[1];
    const fallbackId = block.match(
      /\n\s{4}fallbackChoice:\s*\{[\s\S]*?\n\s{6}id:\s*"([^"]+)"/,
    )?.[1];
    if (fallbackId && fallbackLabel) {
      setNested(events, [eventId, "choices", fallbackId, "label"], unescape(fallbackLabel));
    }

    let logIdx = 0;
    const logRe = /_logMessage:\s*(?:\n\s*)?("((?:\\.|[^"\\])*)"|`([^`]*)`)/g;
    let lm;
    while ((lm = logRe.exec(block)) !== null) {
      const text = unescape(lm[2] ?? lm[3] ?? "");
      setNested(events, [eventId, "log", `outcome${logIdx++}`], text);
    }
  }
  return events;
}

function extractEvents() {
  const events = {};
  const files = fs
    .readdirSync(RULES)
    .filter(
      (f) =>
        f.startsWith("events") &&
        f.endsWith(".ts") &&
        f !== "events.ts" &&
        !f.includes(".test."),
    );

  for (const file of files) {
    const src = readSource(file);
    const extracted = extractFromSource(src);
    for (const [id, data] of Object.entries(extracted)) {
      events[id] ??= {};
      deepMergeMissing(events[id], data);
    }
  }
  return events;
}

const extracted = extractEvents();
const outPath = path.join(OUT, "events.json");
let events = extracted;

if (merge && fs.existsSync(outPath)) {
  const existing = JSON.parse(fs.readFileSync(outPath, "utf8"));
  events = { ...existing };
  for (const [id, data] of Object.entries(extracted)) {
    events[id] ??= {};
    deepMergeMissing(events[id], data);
    for (const [key, value] of Object.entries(data)) {
      if (!(key in events[id])) {
        events[id][key] = value;
      } else if (
        value &&
        typeof value === "object" &&
        events[id][key] &&
        typeof events[id][key] === "object"
      ) {
        deepMergeMissing(events[id][key], value);
      }
    }
  }
  for (const [id, data] of Object.entries(extracted)) {
    if (!existing[id]) {
      events[id] = data;
    } else {
      deepMergeMissing(events[id], data);
    }
  }
}

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(sortDeep(events), null, 2) + "\n");
console.log(
  `Extracted events: ${Object.keys(extracted).length}${merge ? `, catalog total: ${Object.keys(events).length}` : ""}${useGit ? " (from git HEAD)" : ""}`,
);
