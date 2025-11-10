import { Action, GameState } from "@shared/schema";
import { ActionResult } from "../actions";
import { applyActionEffects } from "./index";
import { getActionBonuses } from "@/game/rules/effectsCalculation";

// Helper function to get dynamic cost for bone totems
export function getBoneTotemsCost(state: GameState): number {
  const usageCount = Number(state.story?.seen?.boneTotemsUsageCount) || 0;
  return 10 + usageCount;
}

export const forestSacrificeActions: Record<string, Action> = {
  boneTotems: {
    id: "boneTotems",
    label: "Bone Totems",
    show_when: {
      "buildings.altar": 1,
    },
    cost: {
      "resources.bone_totem": 5,
    },
    effects: {
      "resources.silver": "random(10,20)",
      "story.seen.actionBoneTotems": true,
    },
    cooldown: 60,
  },

  leatherTotems: {
    id: "leatherTotems",
    label: "Leather Totems",
    show_when: {
      "buildings.temple": 1,
    },
    cost: {
      "resources.leather_totem": 5,
    },
    effects: {
      "resources.gold": "random(10,20)",
      "story.seen.actionLeatherTotems": true,
    },
    cooldown: 60,
  },
};

// Action handlers
export function handleBoneTotems(
  state: GameState,
  result: ActionResult,
): ActionResult {
  // Track how many times this action has been used
  const usageCount = Number(state.story?.seen?.boneTotemsUsageCount) || 0;
  const currentCost = 5 + usageCount;

  // Check if player has enough bone totems for the current price
  if ((state.resources.bone_totem || 0) < currentCost) {
    return result; // Not enough resources
  }

  // Apply the dynamic cost
  const effectUpdates = applyActionEffects("boneTotems", state);

  if (!effectUpdates.resources) {
    effectUpdates.resources = { ...state.resources };
  }

  // Apply 5% bonus per usage to gold and silver rewards
  const bonusMultiplier = 1 + (usageCount * 0.05);
  if (effectUpdates.resources.gold !== undefined) {
    const baseGold = effectUpdates.resources.gold - (state.resources.gold || 0);
    if (baseGold > 0) {
      effectUpdates.resources.gold = (state.resources.gold || 0) + Math.floor(baseGold * bonusMultiplier);
    }
  }
  if (effectUpdates.resources.silver !== undefined) {
    const baseSilver = effectUpdates.resources.silver - (state.resources.silver || 0);
    if (baseSilver > 0) {
      effectUpdates.resources.silver = (state.resources.silver || 0) + Math.floor(baseSilver * bonusMultiplier);
    }
  }

  // Override the cost with dynamic pricing
  effectUpdates.resources.bone_totem =
    (state.resources.bone_totem || 0) - currentCost;

  // Track usage count for next time
  if (!effectUpdates.story) {
    effectUpdates.story = { ...state.story };
  }
  if (!effectUpdates.story.seen) {
    effectUpdates.story.seen = { ...state.story.seen };
  }
  effectUpdates.story.seen.boneTotemsUsageCount = usageCount + 1;

  // Apply sacrifice bonuses and multipliers from relics/items
  const actionBonuses = getActionBonuses("boneTotems", state);

  // Apply resource multipliers (like 20% bonus from ebony ring)
  if (
    actionBonuses.resourceMultiplier &&
    actionBonuses.resourceMultiplier !== 1
  ) {
    ["gold", "silver"].forEach((resource) => {
      const currentAmount =
        effectUpdates.resources[resource] || state.resources[resource] || 0;
      const baseAmount = currentAmount - (state.resources[resource] || 0);
      if (baseAmount > 0) {
        // Only apply multiplier to positive gains
        const bonusAmount = Math.ceil(
          baseAmount * (actionBonuses.resourceMultiplier - 1),
        );
        effectUpdates.resources[resource] = currentAmount + bonusAmount;
      }
    });
  }

  // Check for Ring of Clarity discovery BEFORE assigning to result
  if (!state.clothing.ring_of_clarity) {
    const baseProbability = 0.02; // 2%
    const bonusPerUse = 0.01; // 1%
    const totalProbability = baseProbability + usageCount * bonusPerUse;
    const roll = Math.random();

    console.log(`[Ring of Clarity] Usage count: ${usageCount}, Probability: ${(totalProbability * 100).toFixed(1)}%, Roll: ${(roll * 100).toFixed(1)}%`);

    if (roll < totalProbability) {
      // Add ring directly to relics
      if (!effectUpdates.clothing) {
        effectUpdates.clothing = { ...state.clothing };
      }
      effectUpdates.clothing.ring_of_clarity = true;

      // Add log entry for the ring discovery
      result.logEntries!.push({
        id: `ring-of-clarity-${Date.now()}`,
        message: "Among the offerings, you discover a crystal-clear ring, its surface perfectly smooth and radiating a sense of peace.",
        timestamp: Date.now(),
        type: "system",
        visualEffect: {
          type: "glow",
          duration: 3,
        },
      });
    }
  }

  Object.assign(result.stateUpdates, effectUpdates);

  return result;
}

export function handleLeatherTotems(
  state: GameState,
  result: ActionResult,
): ActionResult {
  // Track how many times this action has been used
  const usageCount = Number(state.story?.seen?.leatherTotemsUsageCount) || 0;
  const currentCost = 5 + usageCount;

  // Check if player has enough leather totems for the current price
  if ((state.resources.leather_totem || 0) < currentCost) {
    return result; // Not enough resources
  }

  // Apply the dynamic cost
  const effectUpdates = applyActionEffects("leatherTotems", state);

  if (!effectUpdates.resources) {
    effectUpdates.resources = { ...state.resources };
  }

  // Apply 5% bonus per usage to gold and silver rewards
  const bonusMultiplier = 1 + (usageCount * 0.05);
  if (effectUpdates.resources.gold !== undefined) {
    const baseGold = effectUpdates.resources.gold - (state.resources.gold || 0);
    if (baseGold > 0) {
      effectUpdates.resources.gold = (state.resources.gold || 0) + Math.floor(baseGold * bonusMultiplier);
    }
  }
  if (effectUpdates.resources.silver !== undefined) {
    const baseSilver = effectUpdates.resources.silver - (state.resources.silver || 0);
    if (baseSilver > 0) {
      effectUpdates.resources.silver = (state.resources.silver || 0) + Math.floor(baseSilver * bonusMultiplier);
    }
  }

  // Override the cost with dynamic pricing
  effectUpdates.resources.leather_totem =
    (state.resources.leather_totem || 0) - currentCost;

  // Track usage count for next time
  if (!effectUpdates.story) {
    effectUpdates.story = { ...state.story };
  }
  if (!effectUpdates.story.seen) {
    effectUpdates.story.seen = { ...state.story.seen };
  }
  effectUpdates.story.seen.leatherTotemsUsageCount = usageCount + 1;

  // Apply sacrifice bonuses and multipliers from relics/items
  const actionBonuses = getActionBonuses("leatherTotems", state);

  // Apply resource multipliers (like 20% bonus from ebony ring)
  if (
    actionBonuses.resourceMultiplier &&
    actionBonuses.resourceMultiplier !== 1
  ) {
    ["gold", "silver"].forEach((resource) => {
      const currentAmount =
        effectUpdates.resources[resource] || state.resources[resource] || 0;
      const baseAmount = currentAmount - (state.resources[resource] || 0);
      if (baseAmount > 0) {
        // Only apply multiplier to positive gains
        const bonusAmount = Math.ceil(
          baseAmount * (actionBonuses.resourceMultiplier - 1),
        );
        effectUpdates.resources[resource] = currentAmount + bonusAmount;
      }
    });
  }

  Object.assign(result.stateUpdates, effectUpdates);

  return result;
}