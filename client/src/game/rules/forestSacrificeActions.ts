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

  animals: {
    id: "animals",
    label: "Animals",
    show_when: {
      1: {
        "buildings.blackMonolith": 1,
      },
      2: {
        "buildings.blackMonolith": 1,
      },
      3: {
        "buildings.blackMonolith": 1,
      },
      4: {
        "buildings.blackMonolith": 1,
      },
      5: {
        "buildings.blackMonolith": 1,
      },
      6: {
        "buildings.blackMonolith": 1,
      },
      7: {
        "buildings.blackMonolith": 1,
      },
      8: {
        "buildings.blackMonolith": 1,
      },
      9: {
        "buildings.blackMonolith": 1,
      },
      10: {
        "buildings.blackMonolith": 1,
      },
    },
    cost: {
      1: {
        "resources.food": 500,
      },
      2: {
        "resources.food": 1000,
      },
      3: {
        "resources.food": 1500,
      },
      4: {
        "resources.food": 2000,
      },
      5: {
        "resources.food": 2500,
      },
      6: {
        "resources.food": 3000,
      },
      7: {
        "resources.food": 3500,
      },
      8: {
        "resources.food": 4000,
      },
      9: {
        "resources.food": 4500,
      },
      10: {
        "resources.food": 5000,
      },
    },
    effects: {
      1: {
        "story.seen.animalsSacrificeLevel": 1,
      },
      2: {
        "story.seen.animalsSacrificeLevel": 2,
      },
      3: {
        "story.seen.animalsSacrificeLevel": 3,
      },
      4: {
        "story.seen.animalsSacrificeLevel": 4,
      },
      5: {
        "story.seen.animalsSacrificeLevel": 5,
      },
      6: {
        "story.seen.animalsSacrificeLevel": 6,
      },
      7: {
        "story.seen.animalsSacrificeLevel": 7,
      },
      8: {
        "story.seen.animalsSacrificeLevel": 8,
      },
      9: {
        "story.seen.animalsSacrificeLevel": 9,
      },
      10: {
        "story.seen.animalsSacrificeLevel": 10,
      },
    },
    statsEffects: {
      1: {
        madness: -1,
      },
      2: {
        madness: -1,
      },
      3: {
        madness: -1,
      },
      4: {
        madness: -1,
      },
      5: {
        madness: -1,
      },
      6: {
        madness: -1,
      },
      7: {
        madness: -1,
      },
      8: {
        madness: -1,
      },
      9: {
        madness: -1,
      },
      10: {
        madness: -1,
      },
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
  },
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
  const bonusMultiplier = 1 + usageCount * 0.05;
  if (effectUpdates.resources.gold !== undefined) {
    const baseGold = effectUpdates.resources.gold - (state.resources.gold || 0);
    if (baseGold > 0) {
      effectUpdates.resources.gold =
        (state.resources.gold || 0) + Math.floor(baseGold * bonusMultiplier);
    }
  }
  if (effectUpdates.resources.silver !== undefined) {
    const baseSilver =
      effectUpdates.resources.silver - (state.resources.silver || 0);
    if (baseSilver > 0) {
      effectUpdates.resources.silver =
        (state.resources.silver || 0) +
        Math.floor(baseSilver * bonusMultiplier);
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
    const totalProbability =
      discoveryConfig.baseProbability +
      usageCount * discoveryConfig.bonusPerUse;
    const roll = Math.random();

    console.log(
      `[${discoveryConfig.itemName}] Usage count: ${usageCount}, Probability: ${(totalProbability * 100).toFixed(1)}%, Roll: ${(roll * 100).toFixed(1)}%`,
    );

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
      discoveryMessage:
        "Among the sacrifice offerings, you discover a crystal-clear ring.",
      baseProbability: 0.02 - CM * 0.01, // 2%
      bonusPerUse: 0.01 - CM * 0.005, // 1%
    },
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
      itemKey: "moon_bracelet" as keyof GameState["clothing"],
      itemName: "Moon Bracelet",
      discoveryMessage:
        "Among the sacrifice offerings, you discover a white stone bracelet.",
      baseProbability: 0.02 - CM * 0.01, // 2%
      bonusPerUse: 0.01 - CM * 0.005, // 1%
    },
  );
}

export function handleAnimals(
  state: GameState,
  result: ActionResult,
): ActionResult {
  const currentLevel = (state.story?.seen?.animalsSacrificeLevel as number) || 0;
  const nextLevel = currentLevel + 1;

  if (nextLevel > 10) {
    return result;
  }

  const action = forestSacrificeActions.animals;
  const actionCosts = action?.cost?.[nextLevel];
  const actionEffects = action?.effects?.[nextLevel];
  const statsEffects = action?.statsEffects?.[nextLevel];

  if (!actionEffects || !actionCosts) {
    return result;
  }

  // Apply resource costs
  const newResources = { ...state.resources };
  for (const [path, cost] of Object.entries(actionCosts) as [string, number][]) {
    if (path.startsWith("resources.")) {
      const resource = path.split(".")[1] as keyof typeof newResources;
      newResources[resource] -= cost;
    }
  }

  result.stateUpdates.resources = newResources;

  // Apply effects
  if (!result.stateUpdates.story) {
    result.stateUpdates.story = { ...state.story };
  }
  if (!result.stateUpdates.story.seen) {
    result.stateUpdates.story.seen = { ...state.story.seen };
  }
  result.stateUpdates.story.seen.animalsSacrificeLevel = nextLevel;

  // Apply madness reduction
  if (statsEffects && statsEffects.madness !== undefined) {
    if (!result.stateUpdates.stats) {
      result.stateUpdates.stats = { ...state.stats };
    }
    result.stateUpdates.stats.madness = (state.stats.madness || 0) + statsEffects.madness;
  }

  // Add log entry
  result.logEntries!.push({
    id: `animals-sacrifice-${nextLevel}-${Date.now()}`,
    message: `Animals are led to the Black Monolith and sacrificed. The dark stone seems to pulse with satisfaction, and the madness plaguing your mind recedes slightly.`,
    timestamp: Date.now(),
    type: "system",
  });

  return result;
}
