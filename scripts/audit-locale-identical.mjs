/**
 * Fail if a non-English locale gains new strings that still match English.
 * Existing leftovers are allowlisted in scripts/i18n-identical-baseline.json.
 *
 * Proper nouns that should stay English belong in SKIP_IDENTICAL.
 *
 * Run:
 *   node scripts/audit-locale-identical.mjs --check
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
const TARGET_LOCALES = ["de", "fr", "es", "it", "pt-BR", "zh-CN", "ru"];

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

function isLeftoverEnglish(enVal, locVal, fullKey) {
  return (
    typeof enVal === "string" &&
    enVal === locVal &&
    !SKIP_IDENTICAL.has(fullKey) &&
    locVal.length > 2 &&
    /[a-zA-Z]/.test(locVal)
  );
}

export function collectIdenticalKeys(locale) {
  const locDir = path.join(ROOT, "client/src/i18n/locales", locale);
  const keys = [];
  for (const rel of listCatalogPaths(EN_DIR)) {
    const locPath = path.join(locDir, rel);
    if (!fs.existsSync(locPath)) continue;
    const ns = catalogNamespace(rel);
    const en = readLocaleJson(path.join(EN_DIR, rel), fs);
    const loc = readLocaleJson(locPath, fs);
    const enMap = Object.fromEntries(flatten(en));
    for (const [key, locVal] of flatten(loc)) {
      const fullKey = `${ns}.${key}`;
      if (isLeftoverEnglish(enMap[key], locVal, fullKey)) keys.push(fullKey);
    }
  }
  return [...new Set(keys)].sort();
}

function collectAllIdenticalKeys() {
  return Object.fromEntries(
    TARGET_LOCALES.map((locale) => [locale, collectIdenticalKeys(locale)]),
  );
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

function runCli(argv = process.argv.slice(2)) {
  if (argv.includes("--help") || argv.includes("-h")) {
    console.log(
      "Usage: node scripts/audit-locale-identical.mjs [--check|--write]",
    );
    return 0;
  }

  const write = argv.includes("--write");
  const current = collectAllIdenticalKeys();

  if (write) {
    writeBaseline(current);
    const total = TARGET_LOCALES.reduce(
      (sum, locale) => sum + current[locale].length,
      0,
    );
    console.log(
      `Wrote ${path.relative(ROOT, BASELINE_PATH)} (${total} leftover English keys)`,
    );
    return 0;
  }

  const baseline = readBaseline();
  const newLeaks = findNewLeaks(current, baseline);
  const totals = TARGET_LOCALES.map(
    (locale) => `${locale}:${current[locale].length}`,
  ).join(" ");
  console.log(`Leftover English (allowlisted): ${totals}`);

  if (newLeaks.length > 0) {
    console.error(
      `\nNew leftover-English keys (${newLeaks.length}). Translate them, or add a proper noun to SKIP_IDENTICAL. Re-run with --write only if the leftover is intentional:\n`,
    );
    for (const leak of newLeaks) console.error(`  ${leak}`);
    return 1;
  }

  console.log("No new leftover-English keys");
  return 0;
}

const isDirectRun = process.argv[1]
  ? path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
  : false;
if (isDirectRun) {
  process.exit(runCli());
}
