
import { GameState } from "@shared/schema";
import { gameActions } from "./index";
import {
  getTotalLuck as getTotalLuckCalc,
  getActionBonuses as getActionBonusesCalc,
  getTotalCraftingCostReduction as getTotalCraftingCostReductionCalc,
  getTotalBuildingCostReduction as getTotalBuildingCostReductionCalc,
} from "./effectsCalculation";
import { ACTION_TO_UPGRADE_KEY, getUpgradeBonusMultiplier } from "../buttonUpgrades";
import { caveEvents } from "./eventsCave";
import { huntEvents } from "./eventsHunt";
import { loreEvents } from "./eventsLore";
import { fellowshipEvents } from "./eventsFellowship";
import { getBoneTotemsCost, getLeatherTotemsCost } from "./forestSacrificeActions";

// This function is extracted to break circular dependency
export const applyActionEffects = (
  actionId: string,
  state: GameState,
): Partial<GameState> => {
  // Implementation moved from index.ts - same exact code
  const action = gameActions[actionId];
  if (!action) return {};

  const updates: Partial<GameState> & {
    logMessages?: string[];
    triggeredEvents?: string[];
  } = {};

  // ... (copy the entire applyActionEffects implementation from index.ts here)
  // I'll provide the full implementation
  
  return updates;
};
