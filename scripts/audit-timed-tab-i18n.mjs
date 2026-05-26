import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rulesDir = path.join(__dirname, "..", "client/src/game/rules");
const eventsJson = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "..", "client/src/i18n/locales/en/events.json"),
    "utf8",
  ),
);

const files = fs
  .readdirSync(rulesDir)
  .filter((f) => f.startsWith("events") && f.endsWith(".ts") && f !== "events.ts");

const timedBlocks = [];

for (const file of files) {
  const content = fs.readFileSync(path.join(rulesDir, file), "utf8");
  const re = /\n\s{2}([\w]+):\s*\{[\s\S]*?\n\s{2}\},?\n(?=\n\s{2}[\w]+:|$)/g;
  // simpler: split on event object starts
  const parts = content.split(/\n\s{2}([a-zA-Z][\w]*):\s*\{/);
  for (let i = 1; i < parts.length; i += 2) {
    const name = parts[i];
    const block = parts[i + 1] ?? "";
    if (!block.includes("showAsTimedTab: true")) continue;
    const idMatch = block.match(/\n\s{4}id:\s*"([^"]+)"/);
    const i18nKeyMatch = block.match(/\n\s{4}i18nKey:\s*"([^"]+)"/);
    const id = idMatch?.[1] ?? name;
    const catalogId = i18nKeyMatch?.[1] ?? id;
    timedBlocks.push({ file, id, catalogId, block });
  }
}

// factory events with i18nKey
for (const file of files) {
  const content = fs.readFileSync(path.join(rulesDir, file), "utf8");
  if (!content.includes("showAsTimedTab") || !content.includes("i18nKey")) continue;
  for (const m of content.matchAll(/i18nKey:\s*"([^"]+)"/g)) {
    if (!timedBlocks.some((b) => b.catalogId === m[1])) {
      timedBlocks.push({ file, id: m[1], catalogId: m[1], block: "" });
    }
  }
}

const unique = new Map();
for (const b of timedBlocks) {
  if (!unique.has(b.catalogId)) unique.set(b.catalogId, b);
}

console.log("Timed-tab catalog audit (en/events.json):\n");
for (const [catalogId, meta] of [...unique.entries()].sort()) {
  const cat = eventsJson[catalogId];
  const issues = [];
  if (!cat) issues.push("missing catalog");
  else {
    if (!cat.title && !cat.title?.level1) {
      const hasNestedTitle = cat.title && typeof cat.title === "object";
      if (!cat.title && !hasNestedTitle) issues.push("missing title");
    }
    if (!cat.message) issues.push("missing message");
    if (cat.choices) {
      for (const [cid, c] of Object.entries(cat.choices)) {
        if (!c.label) issues.push(`choice ${cid} missing label`);
      }
    }
  }
  console.log(
    `${issues.length ? "FAIL" : " OK "} ${catalogId.padEnd(28)} (${meta.file})${issues.length ? " -> " + issues.join("; ") : ""}`,
  );
}
