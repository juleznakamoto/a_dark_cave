/**

 * Audit locale files for strings identical to English and cross-locale contamination.

 * Run: node scripts/audit-locale-translations.mjs [ru|zh-CN|fr|es|de]

 */

import fs from "node:fs";

import path from "node:path";

import { fileURLToPath } from "node:url";

import { listCatalogPaths, normalizeCatalogRel } from "./locale-catalog.mjs";
import { readLocaleJson } from "./parse-locale-json.mjs";



const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const EN_DIR = path.join(ROOT, "client/src/i18n/locales/en");

const LOCALE = process.argv[2] || "fr";

const LOC_DIR = path.join(ROOT, "client/src/i18n/locales", LOCALE);



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



/** German fragments that should not appear in fr/es translations. */

const GERMAN_IN_ROMANCE = [

  "Erfordert",

  "Zyklus",

  "Jäger",

  "Schlaflänge",

  "Knochentotem",

  "Abbau",

  "Betäubung",

  "Doppelgewinn",

  "Nächster",

  "durch Gebäude",

  "freie ",

  "freien ",

  "Schlafintensität",

  "Gesundheitskosten",

  "Brandschaden",

  "Schwefel",

  "Gerber",

  "Pulvermacher",

  "Herzfeuer",

  "Bevölkerung",

  "verlierst du",

  "zugewiesene",

  "gleichzeitige",

  "hacken",

  "abbauen",

  "rabatt",

  "Unterhalt",

  "Jagdbonus",

  "Aktionsgewinne",

  "Erwachen in",

  "Lass die Welt",

  "Erhalte 2x",

  "Verdiene 1 Fokuspunkt",

];



/** English fragments that should not appear in ru/zh-CN (mixed strings). */

const ENGLISH_IN_CJK_CYRILLIC = [

  /\bEarn\b/i,

  /\bPoint per\b/i,

  /\bStun\b/i,

  /\bMine\b/i,

  /\bChop\b/i,

  /\bExplore\b/i,

  /\bDiscount\b/i,

  /\bproduction % while\b/i,

  /\bCosts\b/i,

  /\bper Hunter\b/i,

  /\bper Action\b/i,

  /\bsuccess\b/i,

  /\bdamage for\b/i,

  /\bBurn\b/i,

  /\bHealth Cost\b/i,

  /\bEach villager\b/i,

  /\bMax\b/i,

  /\bno limit for\b/i,

  /\bRequires\b/i,

  /\bfree\b/i,

  /\bChance:/i,

  /\bLength\b/i,

  /\bIntensity\b/i,

  /\bPrior\b/i,

  /\bfortifications\b/i,

  /\bMiner\b/i,

  /\bBonus\b/i,

  /\bupkeep per\b/i,

];



function flatten(obj, p = "") {

  const r = [];

  for (const [k, v] of Object.entries(obj || {})) {

    const key = p ? `${p}.${k}` : k;

    if (typeof v === "string") r.push([key, v]);

    else if (v && typeof v === "object") r.push(...flatten(v, key));

  }

  return r;

}



function catalogNamespace(rel) {

  const norm = normalizeCatalogRel(rel);

  return norm.startsWith("ui/") ? "ui" : norm.replace(/\.json$/, "");

}



function stripInterpolation(val) {
  return val.replace(/\{\{[^}]+\}\}/g, " ");
}

function findGermanContamination(val) {
  const text = stripInterpolation(val);
  for (const marker of GERMAN_IN_ROMANCE) {
    if (text.includes(marker)) return marker;
  }
  return null;
}

function findEnglishContamination(val) {
  const text = stripInterpolation(val);
  for (const pattern of ENGLISH_IN_CJK_CYRILLIC) {
    const m = text.match(pattern);
    if (m) return m[0];
  }
  return null;
}



const issues = { identical: [], contamination: [] };

const byNs = {};



for (const rel of listCatalogPaths(EN_DIR)) {

  const ns = catalogNamespace(rel);

  byNs[ns] ??= { identical: 0, contamination: 0 };

  const en = JSON.parse(fs.readFileSync(path.join(EN_DIR, rel), "utf8"));

  const locPath = path.join(LOC_DIR, rel);

  if (!fs.existsSync(locPath)) continue;

  const loc = readLocaleJson(locPath, fs);

  const enMap = Object.fromEntries(flatten(en));



  for (const [key, locVal] of flatten(loc)) {

    const fullKey = `${ns}.${key}`;

    const enVal = enMap[key];



    if (LOCALE === "fr" || LOCALE === "es") {

      const hit = findGermanContamination(locVal);

      if (hit) {

        issues.contamination.push({

          file: rel,

          key: fullKey,

          marker: hit,

          val: locVal,

        });

        byNs[ns].contamination++;

      }

    }



    if (LOCALE === "ru" || LOCALE === "zh-CN") {

      const hit = findEnglishContamination(locVal);

      if (hit) {

        issues.contamination.push({

          file: rel,

          key: fullKey,

          marker: hit,

          val: locVal,

        });

        byNs[ns].contamination++;

      }

    }



    if (

      enVal === locVal &&

      !SKIP_IDENTICAL.has(fullKey) &&

      locVal.length > 2 &&

      /[a-zA-Z]/.test(locVal)

    ) {

      issues.identical.push({ ns, key, val: locVal, en: enVal });

      byNs[ns].identical++;

    }

  }

}



console.log(`=== AUDIT: ${LOCALE} ===\n`);

for (const [ns, counts] of Object.entries(byNs).sort(

  (a, b) =>

    b[1].contamination + b[1].identical - (a[1].contamination + a[1].identical),

)) {

  console.log(

    `  ${ns}: identical=${counts.identical}, contamination=${counts.contamination}`,

  );

}

console.log(`\nTotal identical: ${issues.identical.length}`);

console.log(`Total contamination: ${issues.contamination.length}`);



if (issues.contamination.length > 0) {

  console.log("\n--- Contamination (file:key:marker) ---");

  for (const c of issues.contamination.slice(0, 50)) {

    console.log(`${c.file}:${c.key}:"${c.marker}"`);

  }

  if (issues.contamination.length > 50) {

    console.log(`... and ${issues.contamination.length - 50} more`);

  }

}



const outPath = path.join(ROOT, "scripts", `${LOCALE}-audit-identical.json`);

const auditOut = Object.fromEntries(

  issues.identical.map((i) => [`${i.ns}.${i.key}`, i.en]),

);

fs.writeFileSync(outPath, JSON.stringify(auditOut, null, 2) + "\n");

console.log(`Wrote ${outPath}`);



if (issues.contamination.length > 0) {

  const contamPath = path.join(

    ROOT,

    "scripts",

    `${LOCALE}-audit-contamination.json`,

  );

  fs.writeFileSync(

    contamPath,

    JSON.stringify(

      issues.contamination.map((c) => ({

        key: `${c.file}:${c.key}`,

        marker: c.marker,

        val: c.val,

      })),

      null,

      2,

    ) + "\n",

  );

  console.log(`Wrote ${contamPath}`);

  process.exit(1);

}


