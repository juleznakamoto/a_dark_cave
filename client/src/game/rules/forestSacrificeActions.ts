import { Action, GameState } from "@shared/schema";
import { ActionResult } from '@/game/actions';
import { applyActionEffects } from '@/game/rules';
import { getActionBonuses, getTotalLuck } from '@/game/rules/effects';

// Helper function to get dynamic cost for bone totems
export function getBoneTotemsCost(state: GameState): number {
  const usageCount = (state.story?.seen?.boneTotemsUsageCount || 0);
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
      "resources.gold": "random(1,10)",
      "resources.silver": "random(1,20)",
      "story.seen.actionBoneTotems": true,
    },
    cooldown: 60,
    dynamicCost: true, // Flag to indicate this action has dynamic pricing
  },
};

// Action handlers
export function handleBoneTotems(state: GameState, result: ActionResult): ActionResult {
  // Track how many times this action has been used
  const usageCount = (state.story?.seen?.boneTotemsUsageCount || 0);
  const currentCost = 10 + usageCount;

  // Check if player has enough bone totems for the current price
  if ((state.resources.bone_totem || 0) < currentCost) {
    return result; // Not enough resources
  }

  // Apply the dynamic cost
  const effectUpdates = applyActionEffects('boneTotems', state);
  
  if (!effectUpdates.resources) {
    effectUpdates.resources = { ...state.resources };
  }

  // Override the cost with dynamic pricing
  effectUpdates.resources.bone_totem = (state.resources.bone_totem || 0) - currentCost;

  // Track usage count for next time
  if (!effectUpdates.story) {
    effectUpdates.story = { ...state.story };
  }
  if (!effectUpdates.story.seen) {
    effectUpdates.story.seen = { ...state.story.seen };
  }
  effectUpdates.story.seen.boneTotemsUsageCount = usageCount + 1;

  // Apply sacrifice bonuses and multipliers from relics/items
  const actionBonuses = getActionBonuses('boneTotems', state);

  // Apply resource multipliers (like 20% bonus from ebony ring)
  if (actionBonuses.resourceMultiplier && actionBonuses.resourceMultiplier !== 1) {
    ['gold', 'silver'].forEach((resource) => {
      const currentAmount = effectUpdates.resources[resource] || state.resources[resource] || 0;
      const baseAmount = currentAmount - (state.resources[resource] || 0);
      if (baseAmount > 0) { // Only apply multiplier to positive gains
        const bonusAmount = Math.ceil(baseAmount * (actionBonuses.resourceMultiplier - 1));
        effectUpdates.resources[resource] = currentAmount + bonusAmount;
      }
    });
  }

  Object.assign(result.stateUpdates, effectUpdates);

  return result;
}