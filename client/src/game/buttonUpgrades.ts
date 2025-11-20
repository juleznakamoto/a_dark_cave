
import { GameState } from "@shared/schema";

// Define upgrade thresholds and bonuses
export const UPGRADE_LEVELS = [
  { clicks: 5, bonus: 0.05, label: "slightly better" },
  { clicks: 25, bonus: 0.10, label: "better" },
  { clicks: 50, bonus: 0.15, label: "much better" },
  { clicks: 100, bonus: 0.20, label: "significantly better" },
  { clicks: 200, bonus: 0.25, label: "exceptionally better" },
  { clicks: 400, bonus: 0.30, label: "masterful" },
  { clicks: 800, bonus: 0.35, label: "legendary" },
];

// Map actions to upgrade keys
export const ACTION_TO_UPGRADE_KEY: Record<string, keyof GameState["buttonUpgrades"]> = {
  // Cave exploration group
  exploreCave: "caveExplore",
  ventureDeeper: "caveExplore",
  descendFurther: "caveExplore",
  exploreRuins: "caveExplore",
  exploreTemple: "caveExplore",
  exploreCitadel: "caveExplore",
  
  // Chop wood group
  chopWood: "chopWood",
  
  // Hunt
  hunt: "hunt",
  
  // Mine actions (individual)
  mineStone: "mineStone",
  mineIron: "mineIron",
  mineCoal: "mineCoal",
  mineSulfur: "mineSulfur",
  mineObsidian: "mineObsidian",
  mineAdamant: "mineAdamant",
};

// Get friendly name for upgrade key
export const UPGRADE_KEY_NAMES: Record<keyof GameState["buttonUpgrades"], string> = {
  caveExplore: "cave exploration",
  chopWood: "wood gathering",
  hunt: "hunting",
  mineStone: "stone mining",
  mineIron: "iron mining",
  mineCoal: "coal mining",
  mineSulfur: "sulfur mining",
  mineObsidian: "obsidian mining",
  mineAdamant: "adamant mining",
};

// Get current level and bonus for a button
export function getButtonUpgradeInfo(upgradeKey: keyof GameState["buttonUpgrades"], clicks: number): {
  level: number;
  bonus: number;
  nextLevelClicks: number | null;
  clicksToNext: number | null;
} {
  let level = 0;
  let bonus = 0;
  
  for (let i = 0; i < UPGRADE_LEVELS.length; i++) {
    if (clicks >= UPGRADE_LEVELS[i].clicks) {
      level = i + 1;
      bonus = UPGRADE_LEVELS[i].bonus;
    } else {
      break;
    }
  }
  
  const nextLevel = UPGRADE_LEVELS[level];
  const nextLevelClicks = nextLevel ? nextLevel.clicks : null;
  const clicksToNext = nextLevelClicks ? nextLevelClicks - clicks : null;
  
  return { level, bonus, nextLevelClicks, clicksToNext };
}

// Check if a level up occurred and return level info
export function checkLevelUp(
  upgradeKey: keyof GameState["buttonUpgrades"],
  oldClicks: number,
  newClicks: number
): { leveledUp: boolean; newLevel: number; bonus: number; label: string } | null {
  const oldInfo = getButtonUpgradeInfo(upgradeKey, oldClicks);
  const newInfo = getButtonUpgradeInfo(upgradeKey, newClicks);
  
  if (newInfo.level > oldInfo.level) {
    return {
      leveledUp: true,
      newLevel: newInfo.level,
      bonus: newInfo.bonus,
      label: UPGRADE_LEVELS[newInfo.level - 1].label,
    };
  }
  
  return null;
}

// Get resource bonus multiplier for an action
export function getButtonUpgradeBonus(actionId: string, state: GameState): number {
  const upgradeKey = ACTION_TO_UPGRADE_KEY[actionId];
  if (!upgradeKey) return 0;
  
  const clicks = state.buttonUpgrades[upgradeKey];
  const info = getButtonUpgradeInfo(upgradeKey, clicks);
  return info.bonus;
}
