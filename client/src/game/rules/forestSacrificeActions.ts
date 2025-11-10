import { Action, GameState } from "@shared/schema";
import { ActionResult } from "../actions";
import { applyActionEffects } from "./index";
import { getActionBonuses } from "@/game/rules/effectsCalculation";

// Helper function to get dynamic cost for bone totems
export function getBoneTotemsCost(state: GameState): number {
  const usageCount = Number(state.story?.seen?.boneTotemsUsageCount) || 0;
  return 5 + usageCount;
}

export function getLeatherTotemsCost(state: GameState): number {
  const usageCount = Number(state.story?.seen?.leatherTotemsUsageCount) || 0;
  return 5 + usageCount;
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

// Helper function to handle totem sacrifice logic
function handleTotemSacrifice(
  actionId: "boneTotems" | "leatherTotems",
  totemResource: "bone_totem" | "leather_totem",
  usageCountKey: "boneTotemsUsageCount" | "leatherTotemsUsageCount",
  state: GameState,
  result: ActionResult,
  discoveryConfig?: {
    itemKey: keyof GameState["clothing"];
    itemName: string;
    discoveryMessage: string;
    baseProbability: number;
    bonusPerUse: number;
  }
): ActionResult {
  // Track how many times this action has been used
  const usageCount = Number(state.story?.seen?.[usageCountKey]) || 0;
  const currentCost = 5 + usageCount;

  // Check if player has enough totems for the current price
  if ((state.resources[totemResource] || 0) < currentCost) {
    return result; // Not enough resources
  }

  // Apply the dynamic cost
  const effectUpdates = applyActionEffects(actionId, state);

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
  effectUpdates.resources[totemResource] =
    (state.resources[totemResource] || 0) - currentCost;

  // Track usage count for next time
  if (!effectUpdates.story) {
    effectUpdates.story = { ...state.story };
  }
  if (!effectUpdates.story.seen) {
    effectUpdates.story.seen = { ...state.story.seen };
  }
  (effectUpdates.story.seen as any)[usageCountKey] = usageCount + 1;

  // Apply sacrifice bonuses and multipliers from relics/items
  const actionBonuses = getActionBonuses(actionId, state);

  // Apply resource multipliers (like 20% bonus from ebony ring)
  if (
    actionBonuses.resourceMultiplier &&
    actionBonuses.resourceMultiplier !== 1 &&
    effectUpdates.resources
  ) {
    ["gold", "silver"].forEach((resource) => {
      const currentAmount =
        effectUpdates.resources![resource] || state.resources[resource] || 0;
      const baseAmount = currentAmount - (state.resources[resource] || 0);
      if (baseAmount > 0) {
        // Only apply multiplier to positive gains
        const bonusAmount = Math.ceil(
          baseAmount * (actionBonuses.resourceMultiplier - 1),
        );
        effectUpdates.resources![resource] = currentAmount + bonusAmount;
      }
    });
  }

  // Check for item discovery if configured
  if (discoveryConfig && !state.clothing[discoveryConfig.itemKey]) {
    const totalProbability = discoveryConfig.baseProbability + usageCount * discoveryConfig.bonusPerUse;
    const roll = Math.random();

    console.log(`[${discoveryConfig.itemName}] Usage count: ${usageCount}, Probability: ${(totalProbability * 100).toFixed(1)}%, Roll: ${(roll * 100).toFixed(1)}%`);

    if (roll < totalProbability) {
      // Add item to clothing
      if (!effectUpdates.clothing) {
        effectUpdates.clothing = { ...state.clothing };
      }
      effectUpdates.clothing[discoveryConfig.itemKey] = true;

      // Add log entry for the discovery
      result.logEntries!.push({
        id: `${discoveryConfig.itemKey}-${Date.now()}`,
        message: discoveryConfig.discoveryMessage,
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

// Action handlers
export function handleBoneTotems(
  state: GameState,
  result: ActionResult,
): ActionResult {
  return handleTotemSacrifice(
    "boneTotems",
    "bone_totem",
    "boneTotemsUsageCount",
    state,
    result,
    {
      itemKey: "ring_of_clarity",
      itemName: "Ring of Clarity",
      discoveryMessage: "Among the offerings, you discover a crystal-clear ring, its surface perfectly smooth and radiating a sense of peace.",
      baseProbability: 0.02, // 2%
      bonusPerUse: 0.01, // 1%
    }
  );
}

export function handleLeatherTotems(
  state: GameState,
  result: ActionResult,
): ActionResult {
  return handleTotemSacrifice(
    "leatherTotems",
    "leather_totem",
    "leatherTotemsUsageCount",
    state,
    result,
    {
        // TODO
      itemKey: "highpriest_robe" as keyof GameState["clothing"],
      itemName: "Highpriest Robe",
      discoveryMessage: "Among the leather offerings, you discover an ornate robe woven with golden threads, radiating divine power.",
      baseProbability: 0.02, // 2%
      bonusPerUse: 0.01, // 1%
    }
  );
}