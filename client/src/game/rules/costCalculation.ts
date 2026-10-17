
import { GameState } from "@shared/schema";
import {
  FULL_DARK_ESTATE_RESOURCE_COST,
  getDarkEstateResourceCost,
} from "@/game/demoLimit";
import {
  getLanternTorchCostReduction,
  getTotalCraftingCostReduction,
  getTotalBuildingCostReduction,
} from "./effectsCalculation";

function isTorchResourcePath(resourcePath?: string): boolean {
  return resourcePath === "torch" || resourcePath === "resources.torch";
}

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
  resourcePath?: string,
): number {
  if (!isResourceCost) {
    return baseCost;
  }

  if (
    actionId === "buildDarkEstate" &&
    baseCost === FULL_DARK_ESTATE_RESOURCE_COST
  ) {
    baseCost = getDarkEstateResourceCost();
  }

  // Determine if this is a crafting or building action
  const isCraftingAction = actionCategory === "crafting" || actionId.startsWith("craft");
  const isBuildingAction = actionCategory === "building" || actionId.startsWith("build");

  let adjusted = baseCost;
  if (isCraftingAction) {
    adjusted = calculateCraftingCost(baseCost, state);
  } else if (isBuildingAction) {
    adjusted = calculateBuildingCost(baseCost, state);
  }

  if (isTorchResourcePath(resourcePath)) {
    adjusted = Math.max(0, adjusted - getLanternTorchCostReduction(state));
  }

  return adjusted;
}
