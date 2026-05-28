/**
 * Audit locale strings that are much longer than English and maintain trailing
 * line comments in locale JSON files, e.g.:
 *   "key": "Long translation",  //1.6X
 *
 * Non-English locale files use JSONC-style trailing comments. VS Code/Cursor
 * treats them as jsonc via .vscode/settings.json (files.associations).
 * Runtime and scripts strip comments before parsing (parse-locale-json.mjs).
 *
 * Add //ok or //Ok on a line to skip that key entirely. If any locale has //ok
 * on a key, that key is allowed in all locales (length comments are omitted).
 *
 * For sensitive UI keys, both the ratio rule and an absolute length must pass:
 *   actions.json  *.label              > 22 chars
 *   effects.json  *.name               > 22 chars
 *   effects.json  *.description        > 140 chars
 *   events.json   *.title              > 28 chars
 *   events.json   *.choices.*.label     > 22 chars
 *   events.json   *.outcome*            > 140 chars
 *
 * Skipped entirely: events.json *.choices.*.cost
 * Run:
 *   node scripts/audit-locale-length.mjs --write   # update locale files
 *   node scripts/audit-locale-length.mjs --check   # verify (used in tests)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { listCatalogPaths } from "./locale-catalog.mjs";
import {
  extractTrailingComment,
  formatLengthComment,
  isLengthComment,
  isOkComment,
  parseLengthCommentRatio,
  parseLocaleJson,
  stripTrailingLineComment,
} from "./parse-locale-json.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const EN_DIR = path.join(ROOT, "client/src/i18n/locales/en");
const LOCALES = ["de", "fr", "es", "zh-CN", "ru"];
const MIN_TEXT_LENGTH = 10;
const MIN_RATIO = 1.2;
const MIN_RATIO_LONG_TEXT = 1.35;
const MIN_RATIO_SHORT_EN = 1.5;
const SHORT_EN_MAX_LENGTH = 8;
const LONG_TEXT_MIN_WORDS = 5;

/** Absolute max length for translated text on sensitive UI keys (by catalog file). */
const ABSOLUTE_LENGTH_RULES = [
  {
    catalog: "actions",
    testKey: (key) => key.endsWith(".label"),
    maxLen: 22,
  },
  {
    catalog: "effects",
    testKey: (key) => key.endsWith(".name"),
    maxLen: 22,
  },
  {
    catalog: "effects",
    testKey: (key) => key.endsWith(".description"),
    maxLen: 140,
  },
  {
    catalog: "events",
    testKey: (key) => key.endsWith(".title"),
    maxLen: 28,
  },
  {
    catalog: "events",
    testKey: (key) => /\.choices\.[^.]+\.label$/.test(key),
    maxLen: 22,
  },
  {
    catalog: "events",
    testKey: (key) => /\.outcome\d+$/.test(key),
    maxLen: 140,
  },
];

function catalogFromRel(rel) {
  return rel.startsWith("ui/") ? "ui" : rel.replace(/\.json$/, "");
}

function absoluteRuleForKey(rel, fullKey) {
  const catalog = catalogFromRel(rel);
  return ABSOLUTE_LENGTH_RULES.find(
    (rule) => catalog === rule.catalog && rule.testKey(fullKey),
  );
}

function qualifiesAbsolute(rel, fullKey, locVal) {
  const rule = absoluteRuleForKey(rel, fullKey);
  return rule != null && locVal.length > rule.maxLen;
}

function shouldSkipKey(rel, fullKey) {
  if (catalogFromRel(rel) !== "events") return false;
  return /\.choices\.[^.]+\.cost$/.test(fullKey);
}

const mode = process.argv.includes("--write")
  ? "write"
  : process.argv.includes("--check")
    ? "check"
    : "check";

function flatten(obj, p = "") {
  const r = [];
  for (const [k, v] of Object.entries(obj || {})) {
    const key = p ? `${p}.${k}` : k;
    if (typeof v === "string") r.push([key, v]);
    else if (v && typeof v === "object") r.push(...flatten(v, key));
  }
  return r;
}

function expectedRatio(locLen, enLen) {
  return Math.round((locLen / enLen) * 10) / 10;
}

function wordCount(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function minRatioForText(locVal, enVal) {
  if (enVal.length <= SHORT_EN_MAX_LENGTH) return MIN_RATIO_SHORT_EN;
  if (wordCount(locVal) >= LONG_TEXT_MIN_WORDS) return MIN_RATIO_LONG_TEXT;
  return MIN_RATIO;
}

function qualifiesRatio(locVal, enVal) {
  if (!enVal || locVal.length <= MIN_TEXT_LENGTH) return false;
  if (locVal.length < enVal.length * minRatioForText(locVal, enVal)) return false;
  return true;
}

function qualifies(locVal, enVal, rel, fullKey) {
  const ratioOk = qualifiesRatio(locVal, enVal);
  if (absoluteRuleForKey(rel, fullKey)) {
    return ratioOk && qualifiesAbsolute(rel, fullKey, locVal);
  }
  return ratioOk;
}

/** Walk nested JSON source and collect string entries with line metadata. */
function scanStringLines(content) {
  const lines = content.split("\n");
  const stack = [];
  const entries = [];

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const rawLine = lines[lineIndex];
    const line = stripTrailingLineComment(rawLine);
    const indent = line.match(/^(\s*)/)?.[1]?.length ?? 0;

    while (stack.length > 0 && stack[stack.length - 1].indent >= indent) {
      stack.pop();
    }

    const keyMatch = line.match(/^(\s*)"([^"\\]*(?:\\.[^"\\]*)*)":\s*(.*)$/);
    if (!keyMatch) continue;

    const key = JSON.parse(`"${keyMatch[2]}"`);
    const rest = keyMatch[3].trim();

    const stringMatch = rest.match(
      /^"((?:\\.|[^"\\])*)"\s*(,?)\s*$/,
    );
    if (stringMatch) {
      const value = JSON.parse(`"${stringMatch[1]}"`);
      const fullKey = [...stack.map((s) => s.key), key].join(".");
      const comment = extractTrailingComment(rawLine);
      entries.push({
        lineIndex,
        fullKey,
        value,
        comment,
        codeLine: stripTrailingLineComment(rawLine).trimEnd(),
        comma: stringMatch[2],
      });
      continue;
    }

    if (rest.startsWith("{")) {
      stack.push({ indent, key });
    }
  }

  return { lines, entries };
}

function buildCommentSuffix(comment, expectedLengthComment) {
  if (isOkComment(comment)) return `//${comment}`;
  if (expectedLengthComment) return expectedLengthComment;
  if (comment && !isLengthComment(comment)) return `//${comment}`;
  return "";
}

function applyLineUpdate(rawLine, codeLine, comma, suffix) {
  const base = codeLine.endsWith(",") ? codeLine : `${codeLine}${comma}`;
  if (!suffix) return base;
  return `${base}  ${suffix}`;
}

function collectOkKeysForCatalog(rel) {
  const okKeys = new Set();
  for (const locale of LOCALES) {
    const locPath = path.join(ROOT, "client/src/i18n/locales", locale, rel);
    if (!fs.existsSync(locPath)) continue;
    const content = fs.readFileSync(locPath, "utf8");
    const { entries } = scanStringLines(content);
    for (const entry of entries) {
      if (isOkComment(entry.comment)) {
        okKeys.add(entry.fullKey);
      }
    }
  }
  return okKeys;
}

function processLocaleFile(rel, locale, enFlat, okKeys) {
  const locPath = path.join(ROOT, "client/src/i18n/locales", locale, rel);
  if (!fs.existsSync(locPath)) return { updated: false, issues: [] };

  const content = fs.readFileSync(locPath, "utf8");
  const { lines, entries } = scanStringLines(content);
  const issues = [];
  let changed = false;

  for (const entry of entries) {
    const enVal = enFlat[entry.fullKey];
    if (typeof enVal !== "string") continue;

    if (shouldSkipKey(rel, entry.fullKey)) {
      if (entry.comment && isLengthComment(entry.comment)) {
        const newLine = applyLineUpdate(
          lines[entry.lineIndex],
          entry.codeLine,
          entry.comma,
          "",
        );
        if (newLine !== lines[entry.lineIndex].trimEnd()) {
          lines[entry.lineIndex] = newLine;
          changed = true;
        }
      }
      continue;
    }

    const locVal = entry.value;
    const globallyOk = okKeys.has(entry.fullKey);

    if (globallyOk) {
      if (entry.comment && isLengthComment(entry.comment)) {
        const newLine = applyLineUpdate(
          lines[entry.lineIndex],
          entry.codeLine,
          entry.comma,
          isOkComment(entry.comment) ? `//${entry.comment}` : "",
        );
        if (newLine !== lines[entry.lineIndex].trimEnd()) {
          lines[entry.lineIndex] = newLine;
          changed = true;
        }
      }
      continue;
    }

    const shouldFlag = qualifies(locVal, enVal, rel, entry.fullKey);

    if (isOkComment(entry.comment)) continue;

    if (!shouldFlag) {
      if (entry.comment && isLengthComment(entry.comment)) {
        const newLine = applyLineUpdate(
          lines[entry.lineIndex],
          entry.codeLine,
          entry.comma,
          "",
        );
        if (newLine !== lines[entry.lineIndex].trimEnd()) {
          lines[entry.lineIndex] = newLine;
          changed = true;
        }
      }
      continue;
    }

    const ratio = expectedRatio(locVal.length, enVal.length);
    const expectedComment = formatLengthComment(ratio);

    if (mode === "check") {
      const actualRatio = parseLengthCommentRatio(entry.comment ?? "");
      if (!isLengthComment(entry.comment ?? "") || actualRatio !== ratio) {
        issues.push({
          locale,
          file: rel,
          key: entry.fullKey,
          en: enVal,
          loc: locVal,
          expectedComment,
          actualComment: entry.comment ? `//${entry.comment}` : "(missing)",
        });
      }
      continue;
    }

    const suffix = buildCommentSuffix(entry.comment, expectedComment);
    const newLine = applyLineUpdate(
      lines[entry.lineIndex],
      entry.codeLine,
      entry.comma,
      suffix,
    );
    if (newLine !== lines[entry.lineIndex].trimEnd()) {
      lines[entry.lineIndex] = newLine;
      changed = true;
    }
  }

  if (mode === "write" && changed) {
    fs.writeFileSync(locPath, `${lines.join("\n")}\n`);
  }

  return { updated: changed, issues };
}

function loadEnglishFlat(rel) {
  const enPath = path.join(EN_DIR, rel);
  const en = parseLocaleJson(fs.readFileSync(enPath, "utf8"));
  return Object.fromEntries(flatten(en));
}

const allIssues = [];
let filesUpdated = 0;

for (const rel of listCatalogPaths(EN_DIR)) {
  const enFlat = loadEnglishFlat(rel);
  const okKeys = collectOkKeysForCatalog(rel);
  for (const locale of LOCALES) {
    const { updated, issues } = processLocaleFile(rel, locale, enFlat, okKeys);
    if (updated) filesUpdated++;
    allIssues.push(...issues);
  }
}

if (mode === "write") {
  console.log(
    `Locale length audit (--write): updated ${filesUpdated} file(s).`,
  );
  if (filesUpdated > 0) {
    console.log("Run tests to verify, or add //ok on accepted long strings.");
  }
  process.exit(0);
}

if (allIssues.length > 0) {
  console.error(
    `Locale length audit FAILED: ${allIssues.length} string(s) missing or stale length comment.`,
  );
  console.error("Run: node scripts/audit-locale-length.mjs --write");
  console.error("Or add //ok on any locale's line to allow that key everywhere.\n");
  for (const issue of allIssues.slice(0, 30)) {
    console.error(
      `  ${issue.locale}/${issue.file} ${issue.key}\n    en: "${issue.en}"\n    ${issue.locale}: "${issue.loc}"\n    expected: ${issue.expectedComment}\n    actual: ${issue.actualComment}`,
    );
  }
  if (allIssues.length > 30) {
    console.error(`  ... and ${allIssues.length - 30} more`);
  }
  process.exit(1);
}

console.log("Locale length audit PASSED");
