/**
 * Strip display strings from events*.ts; use _logMessageKey instead of _logMessage.
 * Prerequisite: node scripts/extract-events-i18n.mjs
 * Run: node scripts/migrate-events-i18n.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RULES = path.join(__dirname, "..", "client/src/game/rules");

const DYNAMIC_MESSAGE_REPLACEMENTS = [
  {
    from: /message:\s*\(state:\s*GameState\)\s*=>\s*\{\s*const isFirstTime = !state\.story\.seen\.bloodDrainedVillagersFirstTime;\s*if \(isFirstTime\) \{\s*return `[\s\S]*?`;\s*\} else \{\s*return `[\s\S]*?`;\s*\}\s*\},/,
    to: `message: (state: GameState) =>
      !state.story.seen.bloodDrainedVillagersFirstTime ? "firstTime" : "repeat",`,
  },
];

function migrateEventBlock(block) {
  let out = block;
  let changed = false;

  if (/\n\s{4}title:\s*"/.test(out)) {
    out = out.replace(/\n\s{4}title:\s*"[^"]*",/g, "");
    changed = true;
  }
  if (/\n\s{4}message:\s*\n\s+"/.test(out)) {
    out = out.replace(/\n\s{4}message:\s*\n\s+"[^"]*",/g, "");
    changed = true;
  }
  if (/\n\s{4}message:\s*"/.test(out)) {
    out = out.replace(/\n\s{4}message:\s*"[^"]*",/g, "");
    changed = true;
  }

  for (const { from, to } of DYNAMIC_MESSAGE_REPLACEMENTS) {
    if (from.test(out)) {
      out = out.replace(from, to);
      changed = true;
    }
  }

  if (/\n\s{8}label:\s*"/.test(out)) {
    out = out.replace(/\n\s{8}label:\s*"[^"]*",/g, "");
    changed = true;
  }
  if (/\n\s{10}label:\s*"/.test(out)) {
    out = out.replace(/\n\s{10}label:\s*"[^"]*",/g, "");
    changed = true;
  }
  if (/\n\s{8}label:\s*`/.test(out)) {
    out = out.replace(/\n\s{8}label:\s*`[^`]*`,/g, "");
    changed = true;
  }
  if (/\n\s{6}label:\s*"/.test(out)) {
    out = out.replace(/\n\s{6}label:\s*"[^"]*",/g, "");
    changed = true;
  }

  let logIdx = 0;
  if (/_logMessage:/.test(out)) {
    out = out.replace(
      /_logMessage:\s*(?:\n\s*)?("(?:\\.|[^"\\])*"|`[^`]*`)/g,
      () => {
        changed = true;
        return `_logMessageKey: "outcome${logIdx++}"`;
      },
    );
  }

  return { out, changed };
}

function migrateFile(src) {
  const eventRe = /\n\s{2}([\w]+):\s*\{\s*\n\s{4}id:\s*"([^"]+)"/g;
  const matches = [...src.matchAll(eventRe)];
  if (matches.length === 0) {
    return { out: src, changed: false };
  }

  let changed = false;
  let out = src.slice(0, matches[0].index);
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index;
    const end =
      i + 1 < matches.length ? matches[i + 1].index : src.length;
    const block = src.slice(start, end);
    const { out: migrated, changed: c } = migrateEventBlock(block);
    if (c) changed = true;
    out += migrated;
  }
  out = out.replace(/\n{3,}/g, "\n\n");
  return { out, changed };
}

const files = fs
  .readdirSync(RULES)
  .filter(
    (f) =>
      f.startsWith("events") &&
      f.endsWith(".ts") &&
      !f.includes(".test.") &&
      f !== "events.ts",
  );

let count = 0;
for (const file of files) {
  const filePath = path.join(RULES, file);
  const src = fs.readFileSync(filePath, "utf8");
  const { out, changed } = migrateFile(src);
  if (changed) {
    fs.writeFileSync(filePath, out);
    count++;
  }
}
console.log(`Migrated ${count} event rule files`);
