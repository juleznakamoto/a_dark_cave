/**
 * Check every non-English i18n string against English.
 *
 * A leftover is a locale value that is still exactly the English string.
 * Brands and interpolation-only templates are skipped (not leftover English).
 *
 * --check (default, used by i18n:verify):
 *   Print every leftover. Fail only if a NEW leftover appears
 *   (not already in scripts/i18n-identical-baseline.json).
 *
 * --strict:
 *   Fail if any leftover remains. Use this when you want a hard "no English" gate.
 *
 * --write:
 *   Refresh the new-leak baseline from the current leftover set.
 *
 * Intentional same-as-English keys belong in SKIP_IDENTICAL.
 *
 * Run:
 *   node scripts/audit-locale-identical.mjs --check
 *   node scripts/audit-locale-identical.mjs --strict
 *   node scripts/audit-locale-identical.mjs --write
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { listCatalogPaths, normalizeCatalogRel } from "./locale-catalog.mjs";
import { readLocaleJson } from "./parse-locale-json.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const EN_DIR = path.join(ROOT, "client/src/i18n/locales/en");
const BASELINE_PATH = path.join(ROOT, "scripts/i18n-identical-baseline.json");
export const TARGET_LOCALES = ["de", "fr", "es", "it", "pt-BR", "zh-CN", "ru"];

/** Keys that are the same as English on purpose (names, gold packs, placeholders). */
const SKIP_IDENTICAL = new Set([
  "common.tabs.bastion",
  "common.resources.obsidian",
  "common.resources.adamant",
  "common.resources.gold",
  "common.currency.goldAmount",
  "actions.buildAltar.label",
  "actions.buildBank.label",
  "actions.buildBastion.label",
  "shop.gold_1000.name",
  "shop.gold_20000.name",
  "shop.gold_2500.name",
  "shop.gold_5000.name",
  "shop.gold_250.name",
  "events.merchant.tradeCost",
  "events.merchant.tradeLabel",
  "ui.combat.criticalParen",
  "ui.badges.bonusPercent",
  "ui.auth.emailPlaceholder",
]);

/** Whole-string brands / proper nouns that stay English in every locale. */
const BRAND_VALUES = new Set([
  "Steam",
  "Instagram",
  "Reddit",
  "FAQ",
  "Scriptorium",
]);

/**
 * Values that are the same word in the target language (not leftover English).
 * Gold amounts are handled separately via leftoverLatinWords().
 */
const IDENTICAL_OK_VALUES = new Set([
  "Adamant",
  "Obsidian",
  "Bastion",
  "Investor",
  "Wolf",
  "Hand",
  "Wind",
  "Gold",
  "Poison",
  "Pause",
  "Bonus:",
  "Feedback",
  "Temple",
  "Village",
  "Actions",
  "Torches",
  "Mine",
  "Combat",
  "Social",
  "Profit",
  "Menu",
  "Total",
  "Normal",
  "Cycle",
  "Fortifications",
  "Population",
  "Error",
  "Email",
  "Password",
  "Privacy",
  "Dev",
  "Prod",
  "{{count}} min",
  "Base: {{percent}}%",
  "100+ structures",
  "Use ",
]);

function flatten(obj, prefix = "") {
  const rows = [];
  for (const [key, value] of Object.entries(obj || {})) {
    const full = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") rows.push([full, value]);
    else if (value && typeof value === "object" && !Array.isArray(value)) {
      rows.push(...flatten(value, full));
    }
  }
  return rows;
}

function catalogNamespace(rel) {
  const norm = normalizeCatalogRel(rel);
  return norm.startsWith("ui/") ? "ui" : norm.replace(/\.json$/, "");
}

/** Latin words left after stripping {{placeholders}}. */
export function leftoverLatinWords(val) {
  const stripped = String(val).replace(/\{\{[^}]+\}\}/g, " ");
  return stripped.match(/[A-Za-z]{2,}/g) ?? [];
}

export function isInterpolationOnly(val) {
  return leftoverLatinWords(val).length === 0;
}

function isSameWordAsEnglish(val) {
  if (IDENTICAL_OK_VALUES.has(val) || IDENTICAL_OK_VALUES.has(val.trim())) {
    return true;
  }
  const words = leftoverLatinWords(val);
  return words.length === 1 && words[0] === "Gold";
}

export function isLeftoverEnglish(enVal, locVal, fullKey) {
  if (typeof enVal !== "string" || enVal !== locVal) return false;
  if (SKIP_IDENTICAL.has(fullKey)) return false;
  if (locVal.length <= 2) return false;
  if (isInterpolationOnly(locVal)) return false;
  if (BRAND_VALUES.has(locVal.trim())) return false;
  if (isSameWordAsEnglish(locVal)) return false;
  return /[a-zA-Z]/.test(locVal);
}

export function collectIdenticalEntries(locale) {
  const locDir = path.join(ROOT, "client/src/i18n/locales", locale);
  const rows = [];
  const seen = new Set();
  for (const rel of listCatalogPaths(EN_DIR)) {
    const locPath = path.join(locDir, rel);
    if (!fs.existsSync(locPath)) continue;
    const ns = catalogNamespace(rel);
    const en = readLocaleJson(path.join(EN_DIR, rel), fs);
    const loc = readLocaleJson(locPath, fs);
    const enMap = Object.fromEntries(flatten(en));
    for (const [key, locVal] of flatten(loc)) {
      const fullKey = `${ns}.${key}`;
      if (seen.has(fullKey)) continue;
      if (!isLeftoverEnglish(enMap[key], locVal, fullKey)) continue;
      seen.add(fullKey);
      rows.push({ key: fullKey, value: locVal });
    }
  }
  rows.sort((a, b) => a.key.localeCompare(b.key));
  return rows;
}

export function collectIdenticalKeys(locale) {
  return collectIdenticalEntries(locale).map((row) => row.key);
}

export function collectAllIdenticalEntries() {
  return Object.fromEntries(
    TARGET_LOCALES.map((locale) => [locale, collectIdenticalEntries(locale)]),
  );
}

function collectAllIdenticalKeys(allEntries = collectAllIdenticalEntries()) {
  return Object.fromEntries(
    TARGET_LOCALES.map((locale) => [
      locale,
      (allEntries[locale] ?? []).map((row) => row.key),
    ]),
  );
}

function leftoverCount(allEntries) {
  return TARGET_LOCALES.reduce(
    (sum, locale) => sum + (allEntries[locale]?.length ?? 0),
    0,
  );
}

function printLeftoverReport(allEntries) {
  const total = leftoverCount(allEntries);
  console.log(
    "Leftover English (locale value still equals English, brands/templates skipped):",
  );
  if (total === 0) {
    console.log("  none");
    return;
  }
  for (const locale of TARGET_LOCALES) {
    const rows = allEntries[locale] ?? [];
    if (rows.length === 0) continue;
    console.log(`\n  ${locale} (${rows.length})`);
    for (const { key, value } of rows) {
      console.log(`    ${key}\t${JSON.stringify(value)}`);
    }
  }
  console.log(`\nTotal leftover-English hits: ${total}`);
}

function readBaseline() {
  if (!fs.existsSync(BASELINE_PATH)) {
    return Object.fromEntries(TARGET_LOCALES.map((locale) => [locale, []]));
  }
  const raw = JSON.parse(fs.readFileSync(BASELINE_PATH, "utf8"));
  return Object.fromEntries(
    TARGET_LOCALES.map((locale) => [
      locale,
      Array.isArray(raw[locale]) ? raw[locale] : [],
    ]),
  );
}

function writeBaseline(current) {
  const payload = Object.fromEntries(
    TARGET_LOCALES.map((locale) => [locale, current[locale] ?? []]),
  );
  fs.writeFileSync(BASELINE_PATH, `${JSON.stringify(payload, null, 2)}\n`);
}

export function findNewLeaks(current, baseline) {
  const leaks = [];
  for (const locale of TARGET_LOCALES) {
    const allowed = new Set(baseline[locale] ?? []);
    for (const key of current[locale] ?? []) {
      if (!allowed.has(key)) leaks.push(`${locale}\t${key}`);
    }
  }
  return leaks;
}

export function runCli(argv = process.argv.slice(2)) {
  if (argv.includes("--help") || argv.includes("-h")) {
    console.log(
      "Usage: node scripts/audit-locale-identical.mjs [--check|--strict|--write]",
    );
    return 0;
  }

  const write = argv.includes("--write");
  const strict = argv.includes("--strict");
  const allEntries = collectAllIdenticalEntries();
  const current = collectAllIdenticalKeys(allEntries);

  if (write) {
    writeBaseline(current);
    console.log(
      `Wrote ${path.relative(ROOT, BASELINE_PATH)} (${leftoverCount(allEntries)} leftover English keys)`,
    );
    return 0;
  }

  printLeftoverReport(allEntries);

  if (strict) {
    const total = leftoverCount(allEntries);
    if (total > 0) {
      console.error(
        `\n--strict: ${total} leftover-English keys. Translate them, or add a proper noun to SKIP_IDENTICAL / BRAND_VALUES.`,
      );
      return 1;
    }
    console.log("No leftover-English keys");
    return 0;
  }

  const baseline = readBaseline();
  const newLeaks = findNewLeaks(current, baseline);

  if (newLeaks.length > 0) {
    console.error(
      `\nNew leftover-English keys (${newLeaks.length}). Translate them, or add a proper noun to SKIP_IDENTICAL. Re-run with --write only if the leftover is intentional:\n`,
    );
    for (const leak of newLeaks) console.error(`  ${leak}`);
    return 1;
  }

  console.log("\nNo new leftover-English keys");
  return 0;
}

const isDirectRun = process.argv[1]
  ? path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
  : false;
if (isDirectRun) {
  process.exit(runCli());
}
