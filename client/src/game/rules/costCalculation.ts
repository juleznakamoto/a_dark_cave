import { GameState } from "@shared/schema";
import {
  getTotalCraftingCostReduction,
  getTotalBuildingCostReduction,
} from "./effectsCalculation";
import { capitalizeWords, formatNumber } from "@/lib/utils";

/**
 * Calculate adjusted crafting cost with all applicable discounts
 * This is the SINGLE SOURCE OF TRUTH for crafting costs
 */
export function calculateCraftingCost(
  baseCost: number,
  state: GameState,
): number {
  const reduction = getTotalCraftingCostReduction(state);
  const discountMultiplier = 1 - reduction;
  return Math.floor(baseCost * discountMultiplier);
}

/**
 * Calculate adjusted building cost with all applicable discounts
 * This is the SINGLE SOURCE OF TRUTH for building costs
 */
export function calculateBuildingCost(
  baseCost: number,
  state: GameState,
): number {
  const reduction = getTotalBuildingCostReduction(state);
  const discountMultiplier = 1 - reduction;
  return Math.floor(baseCost * discountMultiplier);
}

/**
 * Calculate adjusted cost based on action type
 * This function determines if the action is crafting or building and applies the correct discount
 */
export function calculateAdjustedCost(
  actionId: string,
  baseCost: number,
  isResourceCost: boolean,
  state: GameState,
  actionCategory?: "crafting" | "building",
): number {
  if (!isResourceCost) {
    return baseCost;
  }

  // Determine if this is a crafting or building action
  const isCraftingAction = actionCategory === "crafting" || actionId.startsWith("craft");
  const isBuildingAction = actionCategory === "building" || actionId.startsWith("build");

  if (isCraftingAction) {
    return calculateCraftingCost(baseCost, state);
  } else if (isBuildingAction) {
    return calculateBuildingCost(baseCost, state);
  }

  return baseCost;
}

// Example of how formatNumber might be used in a breakdown:
/*
      const breakdown = [];
      const reducedCost = calculateAdjustedCost(
        action.id,
        action.cost,
        true,
        state,
        action.category
      );
      const satisfied = reducedCost <= state.resources[resource];

      breakdown.push({
        text: `-${formatNumber(reducedCost)} ${capitalizeWords(resource)}`,
        satisfied,
      });
*/