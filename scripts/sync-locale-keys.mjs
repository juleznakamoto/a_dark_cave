/**
 * Merge missing keys from English locale catalogs into target locales.
 * Run after editing en/*.json: node scripts/sync-locale-keys.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { listCatalogPaths } from "./locale-catalog.mjs";
import { readLocaleJson } from "./parse-locale-json.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const EN_DIR = path.join(ROOT, "client/src/i18n/locales/en");
const TARGETS = ["de", "fr", "es", "zh-CN", "ru"];

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

const catalogPaths = listCatalogPaths(EN_DIR);

for (const locale of TARGETS) {
  for (const rel of catalogPaths) {
    const en = JSON.parse(fs.readFileSync(path.join(EN_DIR, rel), "utf8"));
    const outPath = path.join(ROOT, "client/src/i18n/locales", locale, rel);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    const existing = fs.existsSync(outPath)
      ? readLocaleJson(outPath, fs)
      : {};
    const merged = deepMergeMissing(existing, en);
    fs.writeFileSync(outPath, JSON.stringify(merged, null, 2) + "\n");
  }
}

console.log("Synced missing keys from en to target locales.");
