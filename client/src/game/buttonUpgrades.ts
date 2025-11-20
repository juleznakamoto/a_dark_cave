import { GameState } from "@shared/schema";

export type UpgradeKey =
  | "exploreCave"
  | "ventureDeeper"
  | "descendFurther"
  | "exploreRuins"
  | "exploreTemple"
  | "exploreCitadel"
  | "mineStone"
  | "mineIron"
  | "mineCoal"
  | "mineSulfur"
  | "mineObsidian"
  | "mineAdamant"
  | "hunt"
  | "chopWood";

export interface UpgradeLevel {
  level: number;
  clicksRequired: number;
  bonus: number; // Percentage bonus (5 = 5%)
  label?: string; // Optional label for display
}

export const MAX_UPGRADE_LEVEL = 8;

// Default upgrade levels (for most actions)
export const UPGRADE_LEVELS: UpgradeLevel[] = [
  { level: 0, clicksRequired: 0, bonus: 0},
  { level: 1, clicksRequired: 10, bonus: 5},
  { level: 2, clicksRequired: 16, bonus: 10},
  { level: 3, clicksRequired: 50, bonus: 15},
  { level: 4, clicksRequired: 100, bonus: 20},
  { level: 5, clicksRequired: 200, bonus: 25},
  { level: 6, clicksRequired: 400, bonus: 30},
  { level: 7, clicksRequired: 750, bonus: 35},
  { level: 8, clicksRequired: 1500, bonus: 40},
];

// Mining upgrade levels (faster progression)
export const MINE_UPGRADE_LEVELS: UpgradeLevel[] = [
  { level: 0, clicksRequired: 0, bonus: 0, label: "" },
  { level: 1, clicksRequired: 5, bonus: 5, label: "" },
  { level: 2, clicksRequired: 15, bonus: 10, label: "" },
  { level: 3, clicksRequired: 30, bonus: 15, label: "" },
  { level: 4, clicksRequired: 60, bonus: 20, label: "" },
  { level: 5, clicksRequired: 120, bonus: 25, label: "" },
  { level: 6, clicksRequired: 240, bonus: 30, label: "" },
  { level: 7, clicksRequired: 450, bonus: 35, label: "" },
  { level: 8, clicksRequired: 900, bonus: 40, label: "" },
];

// Hunt upgrade levels
export const HUNT_UPGRADE_LEVELS: UpgradeLevel[] = [
  { level: 0, clicksRequired: 0, bonus: 0, label: "" },
  { level: 1, clicksRequired: 8, bonus: 5, label: "" },
  { level: 2, clicksRequired: 20, bonus: 10, label: "" },
  { level: 3, clicksRequired: 40, bonus: 15, label: "" },
  { level: 4, clicksRequired: 80, bonus: 20, label: "" },
  { level: 5, clicksRequired: 160, bonus: 25, label: "" },
  { level: 6, clicksRequired: 320, bonus: 30, label: "" },
  { level: 7, clicksRequired: 600, bonus: 35, label: "" },
  { level: 8, clicksRequired: 1200, bonus: 40, label: "" },
];

// Chop wood upgrade levels
export const CHOP_WOOD_UPGRADE_LEVELS: UpgradeLevel[] = [
  { level: 0, clicksRequired: 0, bonus: 0, label: "" },
  { level: 1, clicksRequired: 8, bonus: 5, label: "" },
  { level: 2, clicksRequired: 20, bonus: 10, label: "" },
  { level: 3, clicksRequired: 40, bonus: 15, label: "" },
  { level: 4, clicksRequired: 80, bonus: 20, label: "" },
  { level: 5, clicksRequired: 160, bonus: 25, label: "" },
  { level: 6, clicksRequired: 320, bonus: 30, label: "" },
  { level: 7, clicksRequired: 600, bonus: 35, label: "" },
  { level: 8, clicksRequired: 1200, bonus: 40, label: "" },
];

// Cave explore upgrade levels
export const CAVE_EXPLORE_UPGRADE_LEVELS: UpgradeLevel[] = [
  { level: 0, clicksRequired: 0, bonus: 0, label: "" },
  { level: 1, clicksRequired: 12, bonus: 5, label: "" },
  { level: 2, clicksRequired: 25, bonus: 10, label: "" },
  { level: 3, clicksRequired: 60, bonus: 15, label: "" },
  { level: 4, clicksRequired: 120, bonus: 20, label: "" },
  { level: 5, clicksRequired: 250, bonus: 25, label: "" },
  { level: 6, clicksRequired: 500, bonus: 30, label: "" },
  { level: 7, clicksRequired: 900, bonus: 35, label: "" },
  { level: 8, clicksRequired: 1800, bonus: 40, label: "" },
];

// Get the appropriate upgrade levels for a given key
export function getUpgradeLevelsForKey(key: UpgradeKey): UpgradeLevel[] {
  const mineKeys: UpgradeKey[] = ["mineStone", "mineIron", "mineCoal", "mineSulfur", "mineObsidian", "mineAdamant"];
  const caveExploreKeys: UpgradeKey[] = ["exploreCave", "ventureDeeper", "descendFurther", "exploreRuins", "exploreTemple", "exploreCitadel"];

  if (mineKeys.includes(key)) {
    return MINE_UPGRADE_LEVELS;
  }
  if (key === "hunt") {
    return HUNT_UPGRADE_LEVELS;
  }
  if (key === "chopWood") {
    return CHOP_WOOD_UPGRADE_LEVELS;
  }
  if (caveExploreKeys.includes(key)) {
    return CAVE_EXPLORE_UPGRADE_LEVELS;
  }

  return UPGRADE_LEVELS;
}

export const UPGRADE_LABELS: Record<UpgradeKey, string> = {
  exploreCave: "Cave Exploration",
  ventureDeeper: "Deep Venturing",
  descendFurther: "Deep Descent",
  exploreRuins: "Ruins Exploration",
  exploreTemple: "Temple Exploration",
  exploreCitadel: "Citadel Exploration",
  mineStone: "Stone Mining",
  mineIron: "Iron Mining",
  mineCoal: "Coal Mining",
  mineSulfur: "Sulfur Mining",
  mineObsidian: "Obsidian Mining",
  mineAdamant: "Adamant Mining",
  hunt: "Hunting",
  chopWood: "Woodcutting",
};

// Map action IDs to upgrade keys
export const ACTION_TO_UPGRADE_KEY: Record<string, UpgradeKey | undefined> = {
  exploreCave: "exploreCave",
  ventureDeeper: "ventureDeeper",
  descendFurther: "descendFurther",
  exploreRuins: "exploreRuins",
  exploreTemple: "exploreTemple",
  exploreCitadel: "exploreCitadel",
  mineStone: "mineStone",
  mineIron: "mineIron",
  mineCoal: "mineCoal",
  mineSulfur: "mineSulfur",
  mineObsidian: "mineObsidian",
  mineAdamant: "mineAdamant",
  hunt: "hunt",
  chopWood: "chopWood",
};

/**
 * Get the current level for an upgrade key
 */
export function getUpgradeLevel(key: UpgradeKey, state: GameState): number {
  return state.buttonUpgrades[key]?.level || 0;
}

/**
 * Get the current clicks for an upgrade key
 */
export function getUpgradeClicks(key: UpgradeKey, state: GameState): number {
  return state.buttonUpgrades[key]?.clicks || 0;
}

/**
 * Get the bonus percentage for current level
 */
export function getUpgradeBonus(key: UpgradeKey, state: GameState): number {
  const level = getUpgradeLevel(key, state);
  const upgradeLevels = getUpgradeLevelsForKey(key);
  return upgradeLevels[level]?.bonus || 0;
}

/**
 * Get the bonus multiplier (1.0 + bonus/100)
 */
export function getUpgradeBonusMultiplier(key: UpgradeKey, state: GameState): number {
  const bonus = getUpgradeBonus(key, state);
  return 1 + (bonus / 100);
}

/**
 * Get information about the current upgrade state
 */
export function getButtonUpgradeInfo(key: UpgradeKey, upgrade: { clicks: number; level: number }) {
  const currentLevel = upgrade.level;
  const currentClicks = upgrade.clicks;
  const upgradeLevels = getUpgradeLevelsForKey(key);
  const currentLevelInfo = upgradeLevels[currentLevel];
  const nextLevelInfo = upgradeLevels[currentLevel + 1];

  const clicksNeeded = nextLevelInfo ? nextLevelInfo.clicksRequired - currentClicks : 0;
  const isMaxLevel = currentLevel >= MAX_UPGRADE_LEVEL;

  return {
    level: currentLevel,
    clicks: currentClicks,
    bonus: currentLevelInfo?.bonus || 0,
    clicksNeeded,
    isMaxLevel,
    nextLevel: nextLevelInfo,
    upgradeName: UPGRADE_LABELS[key],
  };
}

/**
 * Check if clicking should result in a level up
 * Returns the new level if level up occurred, or null
 */
export function checkLevelUp(
  key: UpgradeKey,
  currentClicks: number,
  currentLevel: number
): number | null {
  if (currentLevel >= MAX_UPGRADE_LEVEL) {
    return null;
  }

  const upgradeLevels = getUpgradeLevelsForKey(key);
  const nextLevelInfo = upgradeLevels[currentLevel + 1];
  if (!nextLevelInfo) {
    return null;
  }

  if (currentClicks >= nextLevelInfo.clicksRequired) {
    console.log(`[BUTTON_UPGRADE] Level up! ${key}: ${currentLevel} -> ${currentLevel + 1} (${currentClicks} clicks)`);
    return currentLevel + 1;
  }

  return null;
}

/**
 * Increment button usage and check for level up
 * Returns updated upgrade state and level up message if applicable
 */
export function incrementButtonUsage(
  key: UpgradeKey,
  state: GameState
): {
  updatedUpgrade: { clicks: number; level: number };
  levelUpMessage?: string;
} {
  const current = state.buttonUpgrades[key] || { clicks: 0, level: 0 };
  const newClicks = current.clicks + 1;
  const newLevel = checkLevelUp(key, newClicks, current.level);

  console.log(`[BUTTON_UPGRADE] ${key} clicked: ${current.clicks} -> ${newClicks}, level: ${current.level}`);

  if (newLevel !== null) {
    const upgradeLevels = getUpgradeLevelsForKey(key);
    const levelInfo = upgradeLevels[newLevel];
    const upgradeName = UPGRADE_LABELS[key];
    const message = `You got better at ${upgradeName}! (Level ${newLevel} - +${levelInfo.bonus}% bonus)`;

    console.log(`[BUTTON_UPGRADE] ${message}`);

    return {
      updatedUpgrade: { clicks: newClicks, level: newLevel },
      levelUpMessage: message,
    };
  }

  return {
    updatedUpgrade: { clicks: newClicks, level: current.level },
  };
}