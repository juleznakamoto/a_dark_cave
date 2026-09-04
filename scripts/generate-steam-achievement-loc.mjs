/**
 * Writes steam/4882240_loc_all.vdf from in-game achievement configs + locales.
 * Token order is create-order: basic, building, item, action, overall (no webOnly).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readLocaleJson } from "./parse-locale-json.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Same walk order as steamAchievements.ts getEntries() (webOnly omitted). */
const CATALOG = [
  ["basic", "0-woodGatherer"],
  ["basic", "0-stoneMiner"],
  ["basic", "0-ironMiner"],
  ["basic", "0-coalMiner"],
  ["basic", "0-steelForger"],
  ["basic", "0-hunter"],
  ["basic", "0-tanner"],
  ["basic", "1-explorer"],
  ["basic", "1-torchCrafter"],
  ["basic", "1-toolCrafter"],
  ["basic", "1-builder"],
  ["basic", "1-communityBuilder"],
  ["building", "0-0"],
  ["building", "0-1"],
  ["building", "0-2"],
  ["building", "0-3"],
  ["building", "1-0"],
  ["building", "1-1"],
  ["building", "1-2"],
  ["building", "1-3"],
  ["building", "2-0"],
  ["building", "3-0"],
  ["building", "3-1"],
  ["building", "3-2"],
  ["building", "3-3"],
  ["building", "4-0"],
  ["building", "4-1"],
  ["item", "0-axes"],
  ["item", "0-pickaxes"],
  ["item", "0-lanterns"],
  ["item", "1-swords"],
  ["item", "1-bows"],
  ["item", "2-explorer_pack"],
  ["item", "2-schematic_weapons"],
  ["item", "3-ancient_books"],
  ["item", "3-fellowship"],
  ["item", "4-blacksteel_tools"],
  ["item", "4-blacksteel_equipment"],
  ["action", "0-exploreCave"],
  ["action", "0-chopWood"],
  ["action", "0-hunt"],
  ["action", "0-craftTorches"],
  ["action", "1-mineStone"],
  ["action", "1-mineIron"],
  ["action", "1-mineCoal"],
  ["action", "1-mineSulfur"],
  ["action", "1-mineObsidian"],
  ["action", "1-mineAdamant"],
  ["action", "1-mineMoonstone"],
  ["action", "2-boneTotems"],
  ["action", "2-leatherTotems"],
  ["action", "2-animals"],
  ["action", "2-craftBoneTotems"],
  ["action", "2-craftLeatherTotems"],
  ["action", "3-emberBombs"],
  ["action", "3-ashfireBombs"],
  ["action", "3-veinfireElixir"],
  ["action", "3-burningVeins"],
  ["action", "4-merchantPurchases"],
  ["action", "0-gamblerWins"],
  ["action", "4-feedFire"],
  ["action", "4-mentalClarity"],
  ["action", "4-wellRested"],
  ["action", "4-solsticeGatherings"],
  ["action", "4-investor"],
  ["action", "4-luckyInvestor"],
  ["action", "4-insightful"],
  ["action", "4-pileOfDead"],
  ["overall", "0-winNormal"],
  ["overall", "0-winCruel"],
  ["overall", "0-caveVeteran"],
  ["overall", "0-speedrunner"],
  ["overall", "0-endurant"],
  ["overall", "0-resourceMaxer"],
  ["overall", "0-upgradeMaxer"],
  ["overall", "0-achievementMaxer"],
];

const STEAM_LANGS = [
  ["english", "en"],
  ["german", "de"],
  ["french", "fr"],
  ["italian", "it"],
  ["spanish", "es"],
  ["schinese", "zh-CN"],
  ["russian", "ru"],
  ["brazilian", "pt-BR"],
];

function escapeVdf(value) {
  return String(value).replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

function loadLocales() {
  const locales = {};
  for (const [, folder] of STEAM_LANGS) {
    locales[folder] = readLocaleJson(
      path.join(root, "client/src/i18n/locales", folder, "achievements.json"),
      fs,
    );
  }
  return locales;
}

function copyFor(locales, langFolder, category, segmentId) {
  const entry = locales[langFolder]?.[category]?.[segmentId];
  if (!entry?.label || !entry?.description) {
    throw new Error(`Missing ${langFolder} ${category}.${segmentId}`);
  }
  return { label: entry.label, description: entry.description };
}

function writeVdf(locales, outPath) {
  const chunks = ['"lang"', "{"];
  for (const [steamLang, folder] of STEAM_LANGS) {
    chunks.push(`\t"${steamLang}"`, "\t{", '\t\t"Tokens"', "\t\t{");
    CATALOG.forEach(([category, segmentId], index) => {
      const { label, description } = copyFor(locales, folder, category, segmentId);
      chunks.push(
        `\t\t\t"NEW_ACHIEVEMENT_1_${index}_NAME"\t"${escapeVdf(label)}"`,
        `\t\t\t"NEW_ACHIEVEMENT_1_${index}_DESC"\t"${escapeVdf(description)}"`,
      );
    });
    chunks.push("\t\t}", "\t}");
  }
  chunks.push("}", "");
  fs.writeFileSync(outPath, chunks.join("\n"), "utf8");
}

const locales = loadLocales();
const vdfPath = path.join(root, "steam/4882240_loc_all.vdf");
writeVdf(locales, vdfPath);
console.log(`Wrote ${CATALOG.length} achievements to ${vdfPath}`);
