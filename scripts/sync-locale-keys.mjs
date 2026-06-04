/**
 * Merge missing keys from English locale catalogs into target locales.
 * Run after editing en/*.json: node scripts/sync-locale-keys.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { listCatalogPaths } from "./locale-catalog.mjs";
import {
  readLocaleJson,
  splitLocaleFileLines,
  joinLocaleFileLines,
  stripTrailingLineComment,
} from "./parse-locale-json.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const EN_DIR = path.join(ROOT, "client/src/i18n/locales/en");
const TARGETS = ["de", "fr", "es", "it", "pt-BR", "zh-CN", "ru"];

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

/** Insert missing leaf keys as new lines before closing `}`; preserves //ok comments. */
function insertMissingKeys(existingText, enObj, indent = 2) {
  const innerPad = " ".repeat(indent + 2);
  let lines = splitLocaleFileLines(existingText);
  if (lines.length === 0) {
    return `${JSON.stringify(enObj, null, indent)}\n`;
  }

  for (const [key, value] of Object.entries(enObj)) {
    const keyRe = new RegExp(`^${innerPad}"${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"\\s*:`);
    if (lines.some((line) => keyRe.test(stripTrailingLineComment(line)))) {
      if (
        value &&
        typeof value === "object" &&
        !Array.isArray(value) &&
        typeof value !== "string"
      ) {
        const blockStart = lines.findIndex((line) => keyRe.test(stripTrailingLineComment(line)));
        if (blockStart >= 0) {
          let depth = 0;
          let blockEnd = blockStart;
          for (let i = blockStart; i < lines.length; i++) {
            for (const ch of lines[i]) {
              if (ch === "{") depth++;
              if (ch === "}") depth--;
            }
            blockEnd = i;
            if (i > blockStart && depth === 0) break;
          }
          const blockLines = lines.slice(blockStart, blockEnd + 1);
          const nested = insertMissingKeys(
            joinLocaleFileLines(blockLines),
            value,
            indent + 2,
          );
          lines = [
            ...lines.slice(0, blockStart),
            ...splitLocaleFileLines(nested).slice(0, -1),
            ...lines.slice(blockEnd + 1),
          ];
        }
      }
      continue;
    }

    const serialized =
      typeof value === "string"
        ? `${innerPad}"${key}": ${JSON.stringify(value)},\n`
        : `${innerPad}"${key}": ${JSON.stringify(value, null, 2).replace(/\n/g, `\n${innerPad}`)},\n`;

    let insertAt = lines.length - 1;
    while (insertAt > 0 && stripTrailingLineComment(lines[insertAt]).trim() === "") {
      insertAt--;
    }
    while (insertAt >= 0 && lines[insertAt].trim() !== "}") {
      insertAt--;
    }
    if (insertAt < 0) insertAt = lines.length;

    const newLines = splitLocaleFileLines(serialized.trimEnd());
    lines.splice(insertAt, 0, ...newLines);
  }

  return joinLocaleFileLines(lines);
}

const catalogPaths = listCatalogPaths(EN_DIR);

for (const locale of TARGETS) {
  for (const rel of catalogPaths) {
    const en = JSON.parse(fs.readFileSync(path.join(EN_DIR, rel), "utf8"));
    const outPath = path.join(ROOT, "client/src/i18n/locales", locale, rel);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });

    if (!fs.existsSync(outPath)) {
      fs.writeFileSync(outPath, JSON.stringify(en, null, 2) + "\n");
      continue;
    }

    const existingText = fs.readFileSync(outPath, "utf8");
    const existing = readLocaleJson(outPath, fs);
    const missingOnly = structuredClone(en);
    pruneExistingKeys(missingOnly, existing);
    const updated =
      Object.keys(missingOnly).length > 0
        ? insertMissingKeys(existingText, missingOnly)
        : existingText;
    fs.writeFileSync(outPath, updated);
  }
}

console.log("Synced missing keys from en to target locales (preserved //ok comments).");

try {
  execSync("node scripts/restore-ok-comments.mjs", {
    cwd: ROOT,
    stdio: "inherit",
  });
} catch (err) {
  console.warn("restore-ok-comments.mjs failed:", err.message);
}

function pruneExistingKeys(source, existing) {
  for (const key of Object.keys(source)) {
    if (!(key in existing)) continue;
    const sourceVal = source[key];
    const existingVal = existing[key];
    if (
      sourceVal &&
      typeof sourceVal === "object" &&
      !Array.isArray(sourceVal) &&
      existingVal &&
      typeof existingVal === "object" &&
      !Array.isArray(existingVal)
    ) {
      pruneExistingKeys(sourceVal, existingVal);
      if (Object.keys(sourceVal).length === 0) {
        delete source[key];
      }
    } else {
      delete source[key];
    }
  }
}
