
import { GameState } from "@shared/schema";
import { LogEntry } from "./rules/events";

export type ButtonLevelKey = 
  | 'caveExplore'
  | 'mineStone'
  | 'mineIron'
  | 'mineCoal'
  | 'mineSulfur'
  | 'mineObsidian'
  | 'mineAdamant'
  | 'hunt'
  | 'chopWood';

// Level requirements: clicks needed to reach each level
const LEVEL_REQUIREMENTS = [
  10,   // Level 1
  25,   // Level 2
  50,   // Level 3
  100,  // Level 4
  200,  // Level 5
  400,  // Level 6
  800,  // Level 7
  1600, // Level 8 (max)
];

// Bonus per level (5% per level)
const BONUS_PER_LEVEL = 0.05;

// Maximum level
export const MAX_LEVEL = 8;

// Map action IDs to button level keys
const ACTION_TO_BUTTON_KEY: Record<string, ButtonLevelKey> = {
  'exploreCave': 'caveExplore',
  'ventureDeeper': 'caveExplore',
  'descendFurther': 'caveExplore',
  'exploreRuins': 'caveExplore',
  'exploreTemple': 'caveExplore',
  'exploreCitadel': 'caveExplore',
  'mineStone': 'mineStone',
  'mineIron': 'mineIron',
  'mineCoal': 'mineCoal',
  'mineSulfur': 'mineSulfur',
  'mineObsidian': 'mineObsidian',
  'mineAdamant': 'mineAdamant',
  'hunt': 'hunt',
  'chopWood': 'chopWood',
};

// Display names for each button type
const BUTTON_DISPLAY_NAMES: Record<ButtonLevelKey, string> = {
  'caveExplore': 'Cave Exploration',
  'mineStone': 'Mining Stone',
  'mineIron': 'Mining Iron',
  'mineCoal': 'Mining Coal',
  'mineSulfur': 'Mining Sulfur',
  'mineObsidian': 'Mining Obsidian',
  'mineAdamant': 'Mining Adamant',
  'hunt': 'Hunting',
  'chopWood': 'Wood Gathering',
};

export function getButtonLevelKey(actionId: string): ButtonLevelKey | null {
  return ACTION_TO_BUTTON_KEY[actionId] || null;
}

export function getButtonLevel(state: GameState, buttonKey: ButtonLevelKey): number {
  return state.buttonLevels?.[buttonKey]?.level || 0;
}

export function getButtonClicks(state: GameState, buttonKey: ButtonLevelKey): number {
  return state.buttonLevels?.[buttonKey]?.clicks || 0;
}

export function getButtonBonus(state: GameState, buttonKey: ButtonLevelKey): number {
  const level = getButtonLevel(state, buttonKey);
  return 1 + (level * BONUS_PER_LEVEL);
}

export function getClicksForNextLevel(currentLevel: number): number | null {
  if (currentLevel >= MAX_LEVEL) return null;
  return LEVEL_REQUIREMENTS[currentLevel] || null;
}

export function getClicksNeeded(state: GameState, buttonKey: ButtonLevelKey): number | null {
  const currentLevel = getButtonLevel(state, buttonKey);
  const currentClicks = getButtonClicks(state, buttonKey);
  const nextLevelClicks = getClicksForNextLevel(currentLevel);
  
  if (nextLevelClicks === null) return null;
  return Math.max(0, nextLevelClicks - currentClicks);
}

export function checkLevelUp(
  state: GameState,
  buttonKey: ButtonLevelKey
): { leveledUp: boolean; newLevel: number; logEntry?: LogEntry } {
  const currentLevel = getButtonLevel(state, buttonKey);
  const currentClicks = getButtonClicks(state, buttonKey);
  
  if (currentLevel >= MAX_LEVEL) {
    return { leveledUp: false, newLevel: currentLevel };
  }
  
  const requiredClicks = LEVEL_REQUIREMENTS[currentLevel];
  
  if (currentClicks >= requiredClicks) {
    const newLevel = currentLevel + 1;
    const bonusPercent = Math.round(newLevel * BONUS_PER_LEVEL * 100);
    
    const logEntry: LogEntry = {
      id: `level-up-${buttonKey}-${Date.now()}`,
      message: `You got better at ${BUTTON_DISPLAY_NAMES[buttonKey]}! Level ${newLevel} reached (+${bonusPercent}% resource bonus).`,
      timestamp: Date.now(),
      type: 'system',
    };
    
    return { leveledUp: true, newLevel, logEntry };
  }
  
  return { leveledUp: false, newLevel: currentLevel };
}

export function incrementButtonClick(
  state: GameState,
  actionId: string
): { stateUpdates: Partial<GameState>; logEntry?: LogEntry } {
  const buttonKey = getButtonLevelKey(actionId);
  
  if (!buttonKey) {
    return { stateUpdates: {} };
  }
  
  const currentClicks = getButtonClicks(state, buttonKey);
  const newClicks = currentClicks + 1;
  
  const updatedButtonLevels = {
    ...state.buttonLevels,
    [buttonKey]: {
      ...state.buttonLevels[buttonKey],
      clicks: newClicks,
    },
  };
  
  // Create a temporary state to check for level up
  const tempState = {
    ...state,
    buttonLevels: updatedButtonLevels,
  };
  
  const { leveledUp, newLevel, logEntry } = checkLevelUp(tempState, buttonKey);
  
  if (leveledUp) {
    updatedButtonLevels[buttonKey] = {
      clicks: newClicks,
      level: newLevel,
    };
  }
  
  return {
    stateUpdates: { buttonLevels: updatedButtonLevels },
    logEntry,
  };
}

export function getButtonLevelTooltip(state: GameState, buttonKey: ButtonLevelKey): string {
  const level = getButtonLevel(state, buttonKey);
  const clicks = getButtonClicks(state, buttonKey);
  const bonus = Math.round((getButtonBonus(state, buttonKey) - 1) * 100);
  const clicksNeeded = getClicksNeeded(state, buttonKey);
  
  if (level >= MAX_LEVEL) {
    return `Level ${level} (MAX)\n+${bonus}% Bonus\n${clicks} total clicks`;
  }
  
  return `Level ${level}\n+${bonus}% Bonus\n${clicks} clicks\n${clicksNeeded} more needed`;
}
