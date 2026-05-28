/**

 * Fix Spanish locale JSON where ISO-8859-1 accents were saved as "?" (mojibake).

 * Run: node scripts/fix-es-locale-encoding.mjs [--check]

 */

import fs from "node:fs";

import path from "node:path";

import { fileURLToPath } from "node:url";



const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const ES_DIR = path.join(ROOT, "client/src/i18n/locales/es");

const CHECK = process.argv.includes("--check");



/** Longest-first literal replacements. */

const REPLACEMENTS = [

  // Undo over-aggressive prior fixes

  ["diseó", "diseño"],

  ["sonré", "sonríe"],

  ["envenenarón", "envenenarán"],

  ["seíala", "señala"],

  ["ónimos", "ánimos"],

  ["enseían", "enseñan"],

  ["grué.", "gruñe."],

  ["ásala", "úsala"],

  ["leíador", "leñador"],



  ["exploraci?n", "exploración"],

  ["extracci?n", "extracción"],

  ["fabricaci?n", "fabricación"],

  ["fundici?n", "fundición"],

  ["rendici?n", "rendición"],

  ["indecisi?n", "indecisión"],

  ["precisi?n", "precisión"],

  ["curtidur?a", "curtiduría"],

  ["protecci?n", "protección"],

  ["organizaci?n", "organización"],

  ["lic?ntropos", "licántropos"],

  ["esquel?tico", "esquelético"],

  ["esquel?ticas", "esqueléticas"],

  ["esquel?ticos", "esqueléticos"],

  ["cad?veres", "cadáveres"],

  ["br?jula", "brújula"],

  ["desva?dos", "desvaídos"],

  ["d?bil", "débil"],

  ["n?madas", "nómadas"],

  ["?rboles", "árboles"],

  ["metr?polis", "metrópolis"],

  ["t?temes", "tótems"],

  ["pabell?n", "pabellón"],

  ["peque?a", "pequeña"],

  ["energ?a", "energía"],

  ["monta?a", "montaña"],

  ["p?lida", "pálida"],

  ["podr?a", "podría"],

  ["tambi?n", "también"],

  ["magn?fica", "magnífica"],

  ["magn?fico", "magnífico"],

  ["dif?cil", "difícil"],

  ["coraz?n", "corazón"],

  ["carb?n", "carbón"],

  ["ej?rcito", "ejército"],

  ["basti?n", "bastión"],

  ["can?bales", "caníbales"],

  ["can?bal", "caníbal"],

  ["prop?sito", "propósito"],

  ["per?metro", "perímetro"],

  ["c?maras", "cámaras"],

  ["c?mara", "cámara"],

  ["C?mara", "Cámara"],

  ["c?lido", "cálido"],

  ["Ning?n", "Ningún"],

  ["Quiz? ", "Quizá "],

  ["a ?l ", "a él "],

  ["a ?l.", "a él."],

  ["a ?l,", "a él,"],

  ["re?nen", "reúnen"],

  ["a?n ", "aún "],

  ["a?n.", "aún."],

  ["m?s ", "más "],

  ["m?s.", "más."],

  ["m?s,", "más,"],

  ["d?as", "días"],

  ["?spera", "áspera"],



  ["interpret? ", "interpretó "],

  ["interpret?.", "interpretó."],

  ["volver?.", "volverá."],

  ["asegurar? ", "asegurará "],

  ["cruzar? ", "cruzará "],

  ["intent? ", "intentó "],

  ["frenes?", "frenesí"],

  ["guiar?", "guiará"],

  ["servir?", "servirá"],

  ["unir?", "uniré"],

  ["descubr?", "descubrí"],

  ["destruy?", "destruyó"],

  ["ocult?", "ocultó"],

  ["Susurrar?", "Susurrará"],

  ["aventur?", "aventuró"],

  ["traer?", "traeré"],

  ["Aprend?", "Aprendí"],

  ["Naci?", "Nació"],



  ["?Los aldeanos hacen retroceder", "¡Los aldeanos hacen retroceder"],

  ["?Los aldeanos luchan con valentía", "¡Los aldeanos luchan con valentía"],

  ["?Los aldeanos se reúnen", "¡Los aldeanos se reúnen"],



  ["??Quieres", "¿Quieres"],

  ["??Qu? ", "¿Qué "],

  ["?Qu? dices??", "¿Qué dices?»"],

  ["?Qu? ", "¿Qué "],



  ["T? me", "Tú me"],

  ["tras de s?.", "tras de sí."],



  ["?Busco", "«Busco"],

  ["?Pago", "«Pago"],

  ["plata.?", "plata.»"],

  ["plata.?", "plata.»"],

];



function walkJson(dir, out = []) {

  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {

    const p = path.join(dir, ent.name);

    if (ent.isDirectory()) walkJson(p, out);

    else if (ent.name.endsWith(".json")) out.push(p);

  }

  return out;

}



function fixText(text) {

  let out = text;

  for (const [from, to] of REPLACEMENTS) {

    out = out.split(from).join(to);

  }



  // Dialogue openers: ": ?Word" or ". ?Word" (not ¿)

  out = out.replace(/([:.]\s*)\?([A-ZÁÉÍÓÚÑ])/g, "$1«$2");

  // Standalone opener after space at line start in JSON value patterns

  out = out.replace(/(\s)\?([A-ZÁÉÍÓÚÑ][a-záéíóúñü])/g, "$1«$2");



  // Closing guillemets: corrupted ? before punctuation at end of quoted speech

  out = out.replace(/\.(\?)(["\s])/g, ".»$2");

  out = out.replace(/,(\?)(["\s])/g, ",»$2");

  out = out.replace(/\?\.(\?)/g, "».»"); // e.g. guiar?.?

  out = out.replace(/\?\."/g, ".»\"");

  out = out.replace(/ \?"/g, " »\"");



  // Remaining mid-word accent holes (letter?letter)

  out = out.replace(

    /([a-záéíóúñü])\?([a-záéíóúñü])/gi,

    (_, a, b) => {

      const pairs = {

        n: { m: "ó", c: "á", t: "ó", d: "í", g: "ó" },

        e: { t: "é", s: "é", q: "é" },

        i: { h: "í" },

        o: { n: "ó" },

        u: { j: "ú" },

        a: { d: "á", v: "á" },

        r: { j: "ú" },

        l: { t: "í" },

        d: { v: "í", b: "é" },

      };

      const low = a.toLowerCase();

      const repl = pairs[low]?.[b.toLowerCase()];

      if (!repl) return `${a}?${b}`;

      const accent =

        repl === "ó"

          ? "ó"

          : repl === "é"

            ? "é"

            : repl === "í"

              ? "í"

              : repl === "ú"

                ? "ú"

                : repl === "á"

                  ? "á"

                  : repl;

      return a + accent + b;

    },

  );



  return out;

}



function hasCorruption(text) {

  if (/[a-záéíóúñü]\?[a-záéíóúñü]/i.test(text)) return true;

  if (/(^|[^¿])\?([A-ZÁÉÍÓÚÑ])/m.test(text)) return true;

  if (/diseó|sonré|enseían|seíala|leíador|ónimos/.test(text)) return true;

  return false;

}



let changedFiles = 0;

let remaining = 0;



for (const filePath of walkJson(ES_DIR)) {

  const before = fs.readFileSync(filePath, "utf8");

  if (!hasCorruption(before)) continue;



  const after = fixText(before);

  if (after === before) {

    remaining++;

    console.error(`Still corrupted: ${path.relative(ROOT, filePath)}`);

    continue;

  }



  if (CHECK) {

    console.log(`Would fix: ${path.relative(ROOT, filePath)}`);

  } else {

    fs.writeFileSync(filePath, after, "utf8");

    console.log(`Fixed: ${path.relative(ROOT, filePath)}`);

  }

  changedFiles++;

}



if (CHECK) {

  console.log(`\n${changedFiles} file(s) need fixes.`);

} else {

  console.log(`\nFixed ${changedFiles} file(s).`);

}

if (remaining > 0) process.exit(1);


