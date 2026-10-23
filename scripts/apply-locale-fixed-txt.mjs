/**
 * Apply a reviewed flat locale dump (*.fixed.txt) onto
 * client/src/i18n/locales/<locale>/.
 *
 * Format (from the review export):
 *   FILE: achievements.json
 *   achievements.action.0-chopWood.label = …
 *   FILE: ui/shell.json
 *   ui.shell.footer.wishlistOnSteam = …
 *
 * Literal \n / \t in values are unescaped to real control characters.
 * Keys present in EN but missing from the dump keep the current locale value
 * (or EN if the locale has no string yet).
 * Extra locale-only keys in the dump (e.g. Polish *_few / *_many) are applied
 * on top of the EN-shaped tree.
 *
 * Usage:
 *   node scripts/apply-locale-fixed-txt.mjs <locale> [path/to/<locale>.fixed.txt]
 *
 * Examples:
 *   node scripts/apply-locale-fixed-txt.mjs es
 *   node scripts/apply-locale-fixed-txt.mjs pt-BR ~/Downloads/pt-BR.fixed.txt
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { listCatalogPaths } from "./locale-catalog.mjs";
import { flatten } from "./i18n-ui-shards.mjs";
import { readLocaleJson } from "./parse-locale-json.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LOCALES_DIR = path.join(ROOT, "client/src/i18n/locales");
const EN_DIR = path.join(LOCALES_DIR, "en");

const KNOWN_LOCALES = [
  "de",
  "es",
  "fr",
  "it",
  "pt-BR",
  "pl",
  "ru",
  "ja",
  "zh-CN",
];

/** Soft post-review tweaks per locale (on top of the dump). */
const POST_FIXES = {
  de: {
    "ui.shell.footer.wishlistOnSteam": "Zur Steam-Wunschliste hinzufügen",
    "events.raggedYouth.message":
      "Ein junger Mann in zerlumpter Kleidung taucht auf. „Ich kampiere vor dem Dorf. Meine Familie braucht Felle, um die Kälte zu überleben. Ich kann jetzt nicht zahlen, aber später werde ich es tun.“",
  },
};

function unescapeFlatValue(value) {
  return value
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t")
    .replace(/\\r/g, "\r")
    .replace(/\\\\/g, "\\");
}

function parseFixedTxt(text) {
  /** @type {Map<string, string>} */
  const map = new Map();
  for (const raw of text.split(/\r?\n/)) {
    const line = raw;
    if (!line || line.startsWith("=") || line.startsWith("FILE:")) continue;
    if (line.startsWith("A Dark Cave") || line.startsWith("Generated from")) {
      continue;
    }
    if (line.startsWith("Format:")) continue;
    const eq = line.indexOf(" = ");
    if (eq === -1) continue;
    const key = line.slice(0, eq);
    // Allow spaces in leaf key segments (nordicWarAxe "Buy for 500 gold").
    if (!/^[a-zA-Z0-9_./ -]+$/.test(key) || key.includes(" = ")) continue;
    if (!/^[a-zA-Z]/.test(key)) continue;
    map.set(key, unescapeFlatValue(line.slice(eq + 3)));
  }
  return map;
}

/** Flat lookup key for a catalog relative path + in-file key path. */
function flatKeyFor(relPath, keyPath) {
  if (relPath.startsWith("ui/")) {
    const shard = relPath.slice(3).replace(/\.json$/, "");
    return `ui.${shard}.${keyPath}`;
  }
  const ns = relPath.replace(/\.json$/, "");
  return `${ns}.${keyPath}`;
}

function getDeep(obj, keyPath) {
  const parts = keyPath.split(".");
  let cur = obj;
  for (const p of parts) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = cur[p];
  }
  return cur;
}

function setDeep(obj, keyPath, value) {
  const parts = keyPath.split(".");
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i];
    if (cur[p] == null || typeof cur[p] !== "object") cur[p] = {};
    cur = cur[p];
  }
  cur[parts[parts.length - 1]] = value;
}

function rebuildNode(enObj, locObj, relPath, prefix, fixed) {
  const out = {};
  for (const [k, v] of Object.entries(enObj)) {
    const keyPath = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "string") {
      const full = flatKeyFor(relPath, keyPath);
      const fromFixed = fixed.get(full);
      if (fromFixed !== undefined) {
        out[k] = fromFixed;
      } else if (typeof locObj?.[k] === "string") {
        out[k] = locObj[k];
      } else {
        out[k] = v;
      }
    } else if (v && typeof v === "object" && !Array.isArray(v)) {
      out[k] = rebuildNode(v, locObj?.[k], relPath, keyPath, fixed);
    } else {
      out[k] = locObj?.[k] !== undefined ? locObj[k] : v;
    }
  }
  return out;
}

function defaultFixedPath(locale) {
  const downloads = path.join(
    process.env.USERPROFILE || process.env.HOME || "",
    "Downloads",
  );
  const reviewed = path.join(
    downloads,
    "adc-translations-reviewed",
    `${locale}.fixed.txt`,
  );
  if (fs.existsSync(reviewed)) return reviewed;
  return path.join(downloads, `${locale}.fixed.txt`);
}

function main() {
  const locale = process.argv[2];
  if (!locale || !KNOWN_LOCALES.includes(locale)) {
    console.error(
      `Usage: node scripts/apply-locale-fixed-txt.mjs <locale> [fixed.txt]\n` +
        `Locales: ${KNOWN_LOCALES.join(", ")}`,
    );
    process.exit(1);
  }

  const locDir = path.join(LOCALES_DIR, locale);
  if (!fs.existsSync(locDir)) {
    console.error(`Missing locale dir: ${locDir}`);
    process.exit(1);
  }

  const fixedPath = path.resolve(process.argv[3] || defaultFixedPath(locale));
  if (!fs.existsSync(fixedPath)) {
    console.error(`Missing fixed dump: ${fixedPath}`);
    process.exit(1);
  }

  const fixed = parseFixedTxt(fs.readFileSync(fixedPath, "utf8"));
  for (const [k, v] of Object.entries(POST_FIXES[locale] || {})) {
    fixed.set(k, v);
  }

  const enPaths = listCatalogPaths(EN_DIR);
  /** @type {Map<string, object>} */
  const rebuiltByRel = new Map();
  let applied = 0;
  let keptLoc = 0;
  let fellBackEn = 0;
  const usedKeys = new Set();

  for (const rel of enPaths) {
    const enPath = path.join(EN_DIR, rel);
    const locPath = path.join(locDir, rel);
    const en = readLocaleJson(enPath, fs);
    const loc = fs.existsSync(locPath) ? readLocaleJson(locPath, fs) : {};

    for (const [keyPath, enVal] of flatten(en)) {
      if (typeof enVal !== "string") continue;
      const full = flatKeyFor(rel, keyPath);
      if (fixed.has(full)) {
        applied++;
        usedKeys.add(full);
      } else if (typeof getDeep(loc, keyPath) === "string") {
        keptLoc++;
      } else {
        fellBackEn++;
      }
    }

    rebuiltByRel.set(rel, rebuildNode(en, loc, rel, "", fixed));
  }

  // Apply locale-only keys from the dump (e.g. Polish *_few / *_many).
  let extraApplied = 0;
  for (const [full, value] of fixed) {
    if (usedKeys.has(full)) continue;
    let rel;
    let keyPath;
    if (full.startsWith("ui.")) {
      const rest = full.slice(3);
      const dot = rest.indexOf(".");
      if (dot === -1) continue;
      const shard = rest.slice(0, dot);
      keyPath = rest.slice(dot + 1);
      rel = `ui/${shard}.json`;
    } else {
      const dot = full.indexOf(".");
      if (dot === -1) continue;
      const ns = full.slice(0, dot);
      keyPath = full.slice(dot + 1);
      rel = `${ns}.json`;
    }
    if (!rebuiltByRel.has(rel)) continue;
    setDeep(rebuiltByRel.get(rel), keyPath, value);
    usedKeys.add(full);
    extraApplied++;
  }

  for (const [rel, data] of rebuiltByRel) {
    const locPath = path.join(locDir, rel);
    fs.mkdirSync(path.dirname(locPath), { recursive: true });
    fs.writeFileSync(locPath, JSON.stringify(data, null, 2) + "\n", "utf8");
  }

  const unused = [...fixed.keys()].filter((k) => !usedKeys.has(k));
  console.log(`Applied ${locale}.fixed.txt from ${fixedPath}`);
  console.log(`  fixed map size: ${fixed.size}`);
  console.log(`  strings from fixed (EN keys): ${applied}`);
  console.log(`  locale-only extras from fixed: ${extraApplied}`);
  console.log(`  kept existing ${locale} (not in dump): ${keptLoc}`);
  console.log(`  fell back to EN: ${fellBackEn}`);
  console.log(`  unused fixed keys: ${unused.length}`);
  if (unused.length) {
    console.log(unused.slice(0, 30).join("\n"));
  }
}

main();
