/**
 * Apply explicit German overrides from scripts/de-fix-translations.json
 * to all de locale namespaces (including split ui/*.json shards).
 * Run: node scripts/apply-de-fix-translations.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  loadNamespace,
  writeUiKey,
  setDeep,
} from "./i18n-ui-shards.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DE_DIR = path.join(ROOT, "client/src/i18n/locales/de");
const NS = ["common", "ui", "events", "actions", "effects", "shop", "achievements"];

const OVERRIDES = JSON.parse(
  fs.readFileSync(path.join(ROOT, "scripts/de-fix-translations.json"), "utf8"),
);

const counts = Object.fromEntries(NS.map((n) => [n, 0]));
const uiDir = path.join(DE_DIR, "ui");
const useUiShards = fs.existsSync(uiDir);

for (const [fullKey, tr] of Object.entries(OVERRIDES)) {
  const dot = fullKey.indexOf(".");
  if (dot === -1) continue;
  const ns = fullKey.slice(0, dot);
  const key = fullKey.slice(dot + 1);
  if (!NS.includes(ns)) continue;

  if (ns === "ui" && useUiShards) {
    writeUiKey(DE_DIR, key, tr);
  } else {
    const dePath = path.join(DE_DIR, `${ns}.json`);
    const de = JSON.parse(fs.readFileSync(dePath, "utf8"));
    setDeep(de, key, tr);
    fs.writeFileSync(dePath, JSON.stringify(de, null, 2) + "\n");
  }
  counts[ns]++;
}

console.log("Applied de-fix-translations.json overrides per namespace:");
for (const [ns, n] of Object.entries(counts)) {
  console.log(`  ${ns}: ${n}`);
}
console.log(`  total: ${Object.values(counts).reduce((a, b) => a + b, 0)}`);
if (useUiShards) console.log("  (ui written to de/ui/*.json shards)");
