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
  extractTrailingComment,
  joinLocaleFileLines,
  readLocaleJson,
  splitLocaleFileLines,
  stripTrailingLineComment,
} from "./parse-locale-json.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const EN_DIR = path.join(ROOT, "client/src/i18n/locales/en");
const TARGETS = ["de", "fr", "es", "it", "pt-BR", "zh-CN", "ru"];

/** Ensure a property line ends with a comma before a trailing // comment (if any). */
export function withTrailingComma(line) {
  const code = stripTrailingLineComment(line);
  if (/,\s*$/.test(code) || /[{\[]\s*$/.test(code)) return line;
  const comment = extractTrailingComment(line);
  const base = code.trimEnd();
  return comment ? `${base}, //${comment}` : `${base},`;
}

/** Index of the closing `}` / `},` of the outermost object in `lines`. */
export function findClosingBraceLine(lines) {
  for (let i = lines.length - 1; i >= 0; i--) {
    if (/^\s*\},?\s*$/.test(stripTrailingLineComment(lines[i]))) {
      return i;
    }
  }
  return -1;
}

/**
 * Insert missing leaf keys as new lines before closing `}`; preserves //ok comments.
 * @param {string} existingText
 * @param {Record<string, unknown>} missingObj keys still missing at this level
 * @param {number} indent spaces before keys at this object level (root content = 2)
 */
export function insertMissingKeys(existingText, missingObj, indent = 2) {
  const innerPad = " ".repeat(indent);
  let lines = splitLocaleFileLines(existingText);
  if (lines.length === 0) {
    return `${JSON.stringify(missingObj, null, 2)}\n`;
  }

  for (const [key, value] of Object.entries(missingObj)) {
    const keyRe = new RegExp(
      `^${innerPad}"${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"\\s*:`,
    );
    if (lines.some((line) => keyRe.test(stripTrailingLineComment(line)))) {
      if (
        value &&
        typeof value === "object" &&
        !Array.isArray(value) &&
        typeof value !== "string"
      ) {
        const blockStart = lines.findIndex((line) =>
          keyRe.test(stripTrailingLineComment(line)),
        );
        if (blockStart >= 0) {
          let depth = 0;
          let blockEnd = blockStart;
          for (let i = blockStart; i < lines.length; i++) {
            for (const ch of stripTrailingLineComment(lines[i])) {
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
            ...splitLocaleFileLines(nested),
            ...lines.slice(blockEnd + 1),
          ];
        }
      }
      continue;
    }

    // Last property before close: no trailing comma on the new key.
    const serialized =
      typeof value === "string"
        ? `${innerPad}"${key}": ${JSON.stringify(value)}`
        : `${innerPad}"${key}": ${JSON.stringify(value, null, 2).replace(/\n/g, `\n${innerPad}`)}`;

    let insertAt = findClosingBraceLine(lines);
    if (insertAt < 0) insertAt = lines.length;

    // Previous property needs a trailing comma.
    let prev = insertAt - 1;
    while (prev >= 0 && stripTrailingLineComment(lines[prev]).trim() === "") {
      prev--;
    }
    if (prev >= 0) {
      lines[prev] = withTrailingComma(lines[prev]);
    }

    const newLines = splitLocaleFileLines(serialized);
    lines.splice(insertAt, 0, ...newLines);
  }

  return joinLocaleFileLines(lines);
}

/** Remove keys from `source` that already exist in `existing` (keeps only missing). */
export function pruneExistingKeys(source, existing) {
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

function syncLocaleKeys() {
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

  console.log(
    "Synced missing keys from en to target locales (preserved //ok comments).",
  );

  try {
    execSync("node scripts/restore-ok-comments.mjs", {
      cwd: ROOT,
      stdio: "inherit",
    });
  } catch (err) {
    console.warn("restore-ok-comments.mjs failed:", err.message);
  }
}

const invokedDirectly =
  process.argv[1] &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (invokedDirectly) {
  syncLocaleKeys();
}
