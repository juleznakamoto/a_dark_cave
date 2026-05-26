/**
 * Apply cube event translations from scripts/cube-events-translations.json
 * into fr/es/zh-CN/ru events.json catalogs.
 *
 * Usage: node scripts/apply-cube-translations.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const TRANSLATIONS_PATH = path.join(__dirname, "cube-events-translations.json");
const LOCALES = ["fr", "es", "zh-CN", "ru"];

const translations = JSON.parse(fs.readFileSync(TRANSLATIONS_PATH, "utf8"));

for (const locale of LOCALES) {
  const localeCube = translations[locale];
  if (!localeCube) {
    console.warn(`Skip ${locale}: no translations`);
    continue;
  }
  const eventsPath = path.join(
    ROOT,
    "client/src/i18n/locales",
    locale,
    "events.json",
  );
  const events = JSON.parse(fs.readFileSync(eventsPath, "utf8"));
  let updated = 0;
  for (const [id, entry] of Object.entries(localeCube)) {
    events[id] = entry;
    updated++;
  }
  fs.writeFileSync(eventsPath, JSON.stringify(events, null, 2) + "\n");
  console.log(`${locale}: updated ${updated} cube events`);
}
