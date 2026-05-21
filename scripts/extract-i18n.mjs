/**
 * Extract user-facing strings from game source into English i18n catalogs.
 * Run: node scripts/extract-i18n.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const RULES = path.join(ROOT, "client/src/game/rules");
const ACHIEVEMENTS = path.join(ROOT, "client/src/achievements/configs");
const SHOP = path.join(ROOT, "shared/shopItems.ts");
const OUT = path.join(ROOT, "client/src/i18n/locales/en");

function readFile(p) {
  return fs.readFileSync(p, "utf8");
}

function writeJson(name, data) {
  fs.mkdirSync(OUT, { recursive: true });
  const sorted = sortDeep(data);
  fs.writeFileSync(
    path.join(OUT, `${name}.json`),
    JSON.stringify(sorted, null, 2) + "\n",
  );
}

function sortDeep(obj) {
  if (Array.isArray(obj)) return obj.map(sortDeep);
  if (obj && typeof obj === "object") {
    return Object.keys(obj)
      .sort()
      .reduce((acc, k) => {
        acc[k] = sortDeep(obj[k]);
        return acc;
      }, {});
  }
  return obj;
}

function setNested(obj, keys, value) {
  let cur = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    cur[keys[i]] ??= {};
    cur = cur[keys[i]];
  }
  cur[keys[keys.length - 1]] = value;
}

function extractActions() {
  const actions = {};
  const files = fs
    .readdirSync(RULES)
    .filter(
      (f) =>
        f.endsWith("Actions.ts") ||
        f.startsWith("caveCraft") ||
        f === "bastionActions.ts",
    );

  for (const file of files) {
    const src = readFile(path.join(RULES, file));
    const blocks = src.split(/\n\s{2}(\w+):\s*\{/);
    for (let i = 1; i < blocks.length; i += 2) {
      const id = blocks[i];
      const body = blocks[i + 1] ?? "";
      if (!/^\w+$/.test(id)) continue;
      const label = body.match(/label:\s*"((?:\\.|[^"\\])*)"/)?.[1];
      const description = body.match(
        /description:\s*"((?:\\.|[^"\\])*)"/,
      )?.[1];
      if (label) setNested(actions, [id, "label"], unescape(label));
      if (description)
        setNested(actions, [id, "description"], unescape(description));
    }
  }
  return actions;
}

function unescape(s) {
  return s.replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\\\/g, "\\");
}

function extractEffects() {
  const effects = {};
  const src = readFile(path.join(RULES, "effects.ts"));
  const categories = [
    "toolEffects",
    "weaponEffects",
    "clothingEffects",
    "bookEffects",
    "fellowshipEffects",
  ];
  const catMap = {
    toolEffects: "tools",
    weaponEffects: "weapons",
    clothingEffects: "clothing",
    bookEffects: "books",
    fellowshipEffects: "fellowship",
  };

  for (const exportName of categories) {
    const cat = catMap[exportName];
    const re = new RegExp(
      `${exportName}:\\s*Record<string,\\s*EffectDefinition>\\s*=\\s*\\{([\\s\\S]*?)\\n\\};`,
    );
    const m = src.match(re);
    if (!m) continue;
    const block = m[1];
    const items = block.split(/\n\s{2}([\w]+):\s*\{/);
    for (let i = 1; i < items.length; i += 2) {
      const id = items[i];
      const body = items[i + 1] ?? "";
      const name = body.match(/name:\s*"((?:\\.|[^"\\])*)"/)?.[1];
      const description = body.match(
        /description:\s*"((?:\\.|[^"\\])*)"/,
      )?.[1];
      if (name) setNested(effects, [cat, id, "name"], unescape(name));
      if (description)
        setNested(effects, [cat, id, "description"], unescape(description));
    }
  }
  return effects;
}

function extractEvents() {
  const events = {};
  const files = fs
    .readdirSync(RULES)
    .filter((f) => f.startsWith("events") && f.endsWith(".ts"));

  for (const file of files) {
    const src = readFile(path.join(RULES, file));
    const eventBlocks = src.split(/\n\s{2}(\w+):\s*\{/);
    for (let i = 1; i < eventBlocks.length; i += 2) {
      const id = eventBlocks[i];
      const body = eventBlocks[i + 1] ?? "";
      if (!/^\w+$/.test(id) || id === "export") continue;
      if (!body.includes("id:") && !body.includes("condition:")) continue;

      const title = body.match(/title:\s*"((?:\\.|[^"\\])*)"/)?.[1];
      const messageStatic = body.match(
        /message:\s*\n?\s*"((?:\\.|[^"\\])*)"/,
      )?.[1];
      if (title) setNested(events, [id, "title"], unescape(title));
      if (messageStatic)
        setNested(events, [id, "message"], unescape(messageStatic));

      const choiceBlocks = body.split(/\n\s{6}(\w+):\s*\{/);
      for (let j = 1; j < choiceBlocks.length; j += 2) {
        const choiceId = choiceBlocks[j];
        const choiceBody = choiceBlocks[j + 1] ?? "";
        const label = choiceBody.match(/label:\s*"((?:\\.|[^"\\])*)"/)?.[1];
        if (label && choiceId !== "effect")
          setNested(
            events,
            [id, "choices", choiceId, "label"],
            unescape(label),
          );
      }

      const logMessages = [
        ...body.matchAll(/_logMessage:\s*\n?\s*"((?:\\.|[^"\\])*)"/g),
        ...body.matchAll(/_logMessage:\s*`([^`]*)`/g),
      ];
      logMessages.forEach((m, idx) => {
        const msg = unescape(m[1]);
        setNested(events, [id, "log", `outcome${idx}`], msg);
      });
    }
  }
  return events;
}

function extractShop() {
  const shop = {};
  const src = readFile(SHOP);
  const blocks = src.split(/\n\s{2}(\w+):\s*\{/);
  for (let i = 1; i < blocks.length; i += 2) {
    const id = blocks[i];
    const body = blocks[i + 1] ?? "";
    if (!/^\w+$/.test(id)) continue;
    const name = body.match(/name:\s*"((?:\\.|[^"\\])*)"/)?.[1];
    const description = body.match(
      /description:\s*\n?\s*"((?:\\.|[^"\\])*)"/,
    )?.[1];
    const activationMessage = body.match(
      /activationMessage:\s*\n?\s*"((?:\\.|[^"\\])*)"/,
    )?.[1];
    if (name) setNested(shop, [id, "name"], unescape(name));
    if (description) setNested(shop, [id, "description"], unescape(description));
    if (activationMessage)
      setNested(shop, [id, "activationMessage"], unescape(activationMessage));
  }
  return shop;
}

function extractAchievements() {
  const achievements = {};
  const files = fs.readdirSync(ACHIEVEMENTS).filter((f) => f.endsWith(".ts"));
  for (const file of files) {
    const src = readFile(path.join(ACHIEVEMENTS, file));
    const prefix = src.match(/idPrefix:\s*"(\w+)"/)?.[1];
    if (!prefix) continue;
    const labels = [...src.matchAll(/label:\s*"((?:\\.|[^"\\])*)"/g)];
    const ids = [...src.matchAll(/segmentId:\s*"([^"]+)"/g)];
    ids.forEach((idMatch, idx) => {
      const segmentId = idMatch[1];
      const label = labels[idx]?.[1];
      if (label)
        setNested(
          achievements,
          [prefix, segmentId, "label"],
          unescape(label),
        );
    });
  }
  return achievements;
}

const actions = extractActions();
const effects = extractEffects();
const events = extractEvents();
const shop = extractShop();
const achievements = extractAchievements();

writeJson("actions", actions);
writeJson("effects", effects);
writeJson("events", events);
writeJson("shop", shop);
writeJson("achievements", achievements);

console.log("Extracted i18n catalogs:");
console.log("  actions:", Object.keys(actions).length);
console.log("  effects categories:", Object.keys(effects).length);
console.log("  events:", Object.keys(events).length);
console.log("  shop:", Object.keys(shop).length);
console.log("  achievements:", Object.keys(achievements).length);
