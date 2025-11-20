import { GameState } from "@shared/schema";

export type UpgradeKey = 
  | "caveExplore"
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
  label: string;
}

export const MAX_UPGRADE_LEVEL = 8;

export const UPGRADE_LEVELS: UpgradeLevel[] = [
  { level: 0, clicksRequired: 0, bonus: 0, label: "Novice" },
  { level: 1, clicksRequired: 10, bonus: 5, label: "Apprentice" },
  { level: 2, clicksRequired: 25, bonus: 10, label: "Skilled" },
  { level: 3, clicksRequired: 50, bonus: 15, label: "Adept" },
  { level: 4, clicksRequired: 100, bonus: 20, label: "Expert" },
  { level: 5, clicksRequired: 200, bonus: 25, label: "Master" },
  { level: 6, clicksRequired: 400, bonus: 30, label: "Grandmaster" },
  { level: 7, clicksRequired: 750, bonus: 35, label: "Legend" },
  { level: 8, clicksRequired: 1500, bonus: 40, label: "Mythic" },
];

export const UPGRADE_LABELS: Record<UpgradeKey, string> = {
  caveExplore: "Cave Exploration",
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
  exploreCave: "caveExplore",
  ventureDeeper: "caveExplore",
  descendFurther: "caveExplore",
  exploreRuins: "caveExplore",
  exploreTemple: "caveExplore",
  exploreCitadel: "caveExplore",
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
  return UPGRADE_LEVELS[level]?.bonus || 0;
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
  const currentLevelInfo = UPGRADE_LEVELS[currentLevel];
  const nextLevelInfo = UPGRADE_LEVELS[currentLevel + 1];
  
  const clicksNeeded = nextLevelInfo ? nextLevelInfo.clicksRequired - currentClicks : 0;
  const isMaxLevel = currentLevel >= MAX_UPGRADE_LEVEL;
  
  return {
    level: currentLevel,
    clicks: currentClicks,
    bonus: currentLevelInfo?.bonus || 0,
    label: currentLevelInfo?.label || "Unknown",
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
  
  const nextLevelInfo = UPGRADE_LEVELS[currentLevel + 1];
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
    const levelInfo = UPGRADE_LEVELS[newLevel];
    const upgradeName = UPGRADE_LABELS[key];
    const message = `You got better at ${upgradeName}! (Level ${newLevel}: ${levelInfo.label} - +${levelInfo.bonus}% bonus)`;
    
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
