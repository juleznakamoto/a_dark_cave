/**
 * Apply explicit overrides from scripts/{locale}-fix-translations.json
 * Run: node scripts/apply-locale-fix-translations.mjs ru|zh-CN|fr|es
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setDeep, writeUiKey } from "./i18n-ui-shards.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LOCALE = process.argv[2];
const SUPPORTED = ["fr", "es", "ru", "zh-CN"];

if (!LOCALE || !SUPPORTED.includes(LOCALE)) {
  console.error(
    "Usage: node scripts/apply-locale-fix-translations.mjs ru|zh-CN|fr|es",
  );
  process.exit(1);
}

const LOC_DIR = path.join(ROOT, "client/src/i18n/locales", LOCALE);
const FIX_PATH = path.join(ROOT, "scripts", `${LOCALE}-fix-translations.json`);
const NS = ["common", "ui", "events", "actions", "effects", "shop", "achievements"];

const OVERRIDES = JSON.parse(fs.readFileSync(FIX_PATH, "utf8"));
const counts = Object.fromEntries(NS.map((n) => [n, 0]));
const uiDir = path.join(LOC_DIR, "ui");
const useUiShards = fs.existsSync(uiDir);

for (const [fullKey, tr] of Object.entries(OVERRIDES)) {
  const dot = fullKey.indexOf(".");
  if (dot === -1) continue;
  const ns = fullKey.slice(0, dot);
  const key = fullKey.slice(dot + 1);
  if (!NS.includes(ns)) continue;

  if (ns === "ui" && useUiShards) {
    writeUiKey(LOC_DIR, key, tr);
  } else {
    const locPath = path.join(LOC_DIR, `${ns}.json`);
    const loc = JSON.parse(fs.readFileSync(locPath, "utf8"));
    setDeep(loc, key, tr);
    fs.writeFileSync(locPath, JSON.stringify(loc, null, 2) + "\n");
  }
  counts[ns]++;
}

console.log(`Applied ${LOCALE}-fix-translations.json overrides per namespace:`);
for (const [ns, n] of Object.entries(counts)) {
  console.log(`  ${ns}: ${n}`);
}
console.log(`  total: ${Object.values(counts).reduce((a, b) => a + b, 0)}`);
if (useUiShards) console.log(`  (ui written to ${LOCALE}/ui/*.json shards)`);
