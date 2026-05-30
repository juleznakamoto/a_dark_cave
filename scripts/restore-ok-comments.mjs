/**
 * Re-apply //ok trailing comments from git HEAD onto current locale JSON files.
 * Matches by exact stripped line and by JSON pointer path (not bare key name).
 *
 * Usage: node scripts/restore-ok-comments.mjs [locale...]
 * Default locales: de, fr, es, zh-CN, ru
 *
 * Env: OK_COMMENTS_GIT_REF (default HEAD)
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { listCatalogPaths } from "./locale-catalog.mjs";
import {
  stripTrailingLineComment,
  extractTrailingComment,
  isOkComment,
  splitLocaleFileLines,
  joinLocaleFileLines,
} from "./parse-locale-json.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DEFAULT_LOCALES = ["de", "fr", "es", "zh-CN", "ru"];
const GIT_REF = process.env.OK_COMMENTS_GIT_REF || "HEAD";
const PATH_SEP = "\0";

function walkJsonLines(content, onLine) {
  const stack = [];

  for (const line of splitLocaleFileLines(content)) {
    const stripped = stripTrailingLineComment(line);
    const comment = extractTrailingComment(line);
    const keyMatch = stripped.match(/^(\s*)"([^"\\]+)"\s*:\s*(.*)$/);

    if (keyMatch) {
      const key = keyMatch[2];
      const rest = keyMatch[3].trim();
      const jsonPath = [...stack, key].join(PATH_SEP);
      onLine({ line, stripped, comment, jsonPath, key, rest });
      if (rest === "{") {
        stack.push(key);
      }
      continue;
    }

    if (/^\s*\},?\s*$/.test(stripped) && stack.length > 0) {
      stack.pop();
    }
  }
}

function buildOkCommentMaps(headContent) {
  const byStrippedLine = new Map();
  const byPath = new Map();

  walkJsonLines(headContent, ({ stripped, comment, jsonPath }) => {
    if (!isOkComment(comment)) return;
    byStrippedLine.set(stripped, " //ok");
    byPath.set(jsonPath, " //ok");
  });

  return { byStrippedLine, byPath };
}

function alignOkComments(headContent, currentContent) {
  const { byStrippedLine, byPath } = buildOkCommentMaps(headContent);
  const stack = [];
  let changed = 0;

  const out = splitLocaleFileLines(currentContent).map((line) => {
    const stripped = stripTrailingLineComment(line);
    const hadOk = isOkComment(extractTrailingComment(line));
    const keyMatch = stripped.match(/^(\s*)"([^"\\]+)"\s*:\s*(.*)$/);

    let jsonPath = null;
    let opensObject = false;

    if (keyMatch) {
      const key = keyMatch[2];
      const rest = keyMatch[3].trim();
      jsonPath = [...stack, key].join(PATH_SEP);
      opensObject = rest === "{";
    }

    let shouldHaveOk = false;
    if (byStrippedLine.has(stripped)) {
      shouldHaveOk = true;
    } else if (jsonPath && byPath.has(jsonPath)) {
      shouldHaveOk = true;
    }

    if (keyMatch && opensObject) {
      stack.push(keyMatch[2]);
    } else if (/^\s*\},?\s*$/.test(stripped) && stack.length > 0) {
      stack.pop();
    }

    if (shouldHaveOk && !hadOk) {
      changed++;
      return stripped + " //ok";
    }
    if (!shouldHaveOk && hadOk) {
      changed++;
      return stripped;
    }
    return line;
  });

  return { content: joinLocaleFileLines(out), changed };
}

function gitShow(relPath) {
  try {
    return execSync(`git show ${GIT_REF}:${relPath.replace(/\\/g, "/")}`, {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });
  } catch {
    return null;
  }
}

const locales = process.argv.length > 2 ? process.argv.slice(2) : DEFAULT_LOCALES;
const catalogPaths = listCatalogPaths(
  path.join(ROOT, "client/src/i18n/locales/en"),
);

let totalChanged = 0;
let filesTouched = 0;

for (const locale of locales) {
  for (const rel of catalogPaths) {
    const relPath = `client/src/i18n/locales/${locale}/${rel}`;
    const outPath = path.join(ROOT, relPath);

    if (!fs.existsSync(outPath)) continue;

    const headContent = gitShow(relPath);
    if (!headContent) continue;

    const currentContent = fs.readFileSync(outPath, "utf8");
    const { content, changed } = alignOkComments(headContent, currentContent);

    if (changed > 0) {
      fs.writeFileSync(outPath, content);
      filesTouched++;
      totalChanged += changed;
      console.log(`${locale}/${rel}: adjusted ${changed} //ok lines`);
    }
  }
}

console.log(
  `Done. Adjusted ${totalChanged} //ok lines across ${filesTouched} files.`,
);
