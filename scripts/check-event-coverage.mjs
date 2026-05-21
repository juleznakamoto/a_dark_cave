import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RULES = path.join(ROOT, "client/src/game/rules");
const files = fs
  .readdirSync(RULES)
  .filter(
    (f) =>
      f.startsWith("events") &&
      f.endsWith(".ts") &&
      f !== "events.ts" &&
      !f.includes(".test."),
  );

const ids = new Set();
for (const file of files) {
  const src = fs.readFileSync(path.join(RULES, file), "utf8");
  const re = /^\s{2}([\w]+):\s*\{\s*\n\s{4}id:\s*"([^"]+)"/gm;
  let m;
  while ((m = re.exec(src))) ids.add(m[2]);
}

const catalog = JSON.parse(
  fs.readFileSync(
    path.join(ROOT, "client/src/i18n/locales/en/events.json"),
    "utf8",
  ),
);

const missing = [...ids].filter((id) => !catalog[id]).sort();
const extra = Object.keys(catalog).filter((id) => !ids.has(id)).sort();

console.log("event ids in code:", ids.size);
console.log("catalog keys:", Object.keys(catalog).length);
console.log("missing from catalog:", missing.length);
if (missing.length) console.log(missing.join("\n"));
console.log("extra in catalog:", extra.length);
if (extra.length) console.log(extra.join("\n"));
