/**
 * Parse locale JSON files that may contain trailing // line comments.
 */

const LENGTH_COMMENT_RE = /^[\d.]+X(?: the length of English Version\.)?$/i;
/** Strip trailing // comment outside JSON string literals. */
export function stripTrailingLineComment(line) {
  let inString = false;
  let escape = false;
  for (let i = 0; i < line.length - 1; i++) {
    const c = line[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (inString) {
      if (c === "\\") escape = true;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') {
      inString = true;
      continue;
    }
    if (c === "/" && line[i + 1] === "/") {
      return line.slice(0, i).trimEnd();
    }
  }
  return line;
}

export function extractTrailingComment(line) {
  let inString = false;
  let escape = false;
  for (let i = 0; i < line.length - 1; i++) {
    const c = line[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (inString) {
      if (c === "\\") escape = true;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') {
      inString = true;
      continue;
    }
    if (c === "/" && line[i + 1] === "/") {
      return line.slice(i + 2).trim();
    }
  }
  return "";
}

export function isOkComment(comment) {
  return /^\s*ok\b/i.test(comment);
}

export function isLengthComment(comment) {
  return LENGTH_COMMENT_RE.test(comment.trim());
}

export function formatLengthComment(ratio) {
  return `//${ratio.toFixed(1)}X`;
}

export function parseLengthCommentRatio(comment) {
  const m = comment
    .trim()
    .match(/^([\d.]+)X(?: the length of English Version\.)?$/i);
  return m ? parseFloat(m[1]) : null;
}
export function stripJsonComments(text) {
  return text
    .split("\n")
    .map((line) => stripTrailingLineComment(line))
    .join("\n");
}

export function parseLocaleJson(text) {
  return JSON.parse(stripJsonComments(text));
}

export function readLocaleJson(filePath, fs) {
  return parseLocaleJson(fs.readFileSync(filePath, "utf8"));
}
