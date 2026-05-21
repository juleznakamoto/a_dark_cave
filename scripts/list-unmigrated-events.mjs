import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RULES = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "client/src/game/rules",
);

let failed = false;

for (const file of fs
  .readdirSync(RULES)
  .filter(
    (f) =>
      f.startsWith("events") &&
      f.endsWith(".ts") &&
      !f.includes(".test.") &&
      f !== "events.ts",
  )) {
  const src = fs.readFileSync(path.join(RULES, file), "utf8");
  const issues = [];
  if (/\btitle:\s*["']/.test(src)) issues.push("title");
  if (/\blabel:\s*["']/.test(src)) issues.push("label");
  if (/message:\s*["'][A-Za-z]/.test(src)) issues.push("message");
  if (/_logMessage:/.test(src)) issues.push("_logMessage");
  if (issues.length) {
    console.log(file, issues.join(", "));
    failed = true;
  }
}

if (failed) process.exit(1);
