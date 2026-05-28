/** Parse locale JSON files that may contain trailing // line comments. */

export function stripTrailingLineComment(line: string): string {
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

/** Split file content into lines; drop trailing empties from a final newline. */
export function splitLocaleFileLines(content: string): string[] {
  const lines = content.split("\n");
  while (lines.length > 0 && lines[lines.length - 1] === "") {
    lines.pop();
  }
  return lines;
}

/** Join lines with exactly one trailing newline (POSIX text file). */
export function joinLocaleFileLines(lines: string[]): string {
  if (lines.length === 0) return "\n";
  return `${lines.join("\n")}\n`;
}

export function stripJsonComments(text: string): string {
  return splitLocaleFileLines(text)
    .map((line) => stripTrailingLineComment(line))
    .join("\n");
}

export function parseLocaleJson(text: string): Record<string, unknown> {
  return JSON.parse(stripJsonComments(text)) as Record<string, unknown>;
}
