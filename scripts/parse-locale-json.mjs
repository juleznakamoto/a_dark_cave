/**
 * Parse locale JSON files that may contain trailing // line comments.
 */

const LENGTH_COMMENT_RE = /^x[\d.]+$/i;
const LENGTH_COMMENT_LEGACY_RE = /^[\d.]+X(?: the length of English Version\.)?$/i;
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
  const t = comment.trim();
  return LENGTH_COMMENT_RE.test(t) || LENGTH_COMMENT_LEGACY_RE.test(t);
}

export function formatLengthComment(ratio) {
  return `//x${ratio.toFixed(1)}`;
}

export function parseLengthCommentRatio(comment) {
  const t = comment.trim();
  let m = t.match(/^x([\d.]+)$/i);
  if (m) return parseFloat(m[1]);
  m = t.match(/^([\d.]+)X(?: the length of English Version\.)?$/i);
  return m ? parseFloat(m[1]) : null;
}
/** Split file content into lines; drop trailing empties from a final newline. */
export function splitLocaleFileLines(content) {
  const lines = content.split("\n");
  while (lines.length > 0 && lines[lines.length - 1] === "") {
    lines.pop();
  }
  return lines;
}

/** Join lines with exactly one trailing newline (POSIX text file). */
export function joinLocaleFileLines(lines) {
  if (lines.length === 0) return "\n";
  return `${lines.join("\n")}\n`;
}

export function stripJsonComments(text) {
  return splitLocaleFileLines(text)
    .map((line) => stripTrailingLineComment(line))
    .join("\n");
}

export function parseLocaleJson(text) {
  return JSON.parse(stripJsonComments(text));
}

export function readLocaleJson(filePath, fs) {
  return parseLocaleJson(fs.readFileSync(filePath, "utf8"));
}
