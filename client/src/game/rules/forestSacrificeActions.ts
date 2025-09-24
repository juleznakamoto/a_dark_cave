import { Action, GameState } from "@shared/schema";
import { ActionResult } from '@/game/actions';
import { applyActionEffects } from '@/game/rules';
import { getActionBonuses, getTotalLuck } from '@/game/rules/effects';

export const forestSacrificeActions: Record<string, Action> = {
  boneTotems: {
    id: "boneTotems",
    label: "Bone Totems",
    show_when: {
      "resources.bone_totem": 10,
      "buildings.altar": 1,
    },
    cost: {
      "resources.bone_totem": 10,
    },
    effects: {
      "resources.gold": "random(1,10)",
      "resources.silver": "random(1,20)",
      "story.seen.actionBoneTotems": true,
    },
    cooldown: 60,
  },
};

// Action handlers
export function handleBoneTotems(state: GameState, result: ActionResult): ActionResult {
  // First apply the base effects (cost and story flags)
  const effectUpdates = applyActionEffects('boneTotems', state);

  if (!effectUpdates.resources) {
    effectUpdates.resources = { ...state.resources };
  }

  // Apply sacrifice bonuses and multipliers from relics/items
  const actionBonuses = getActionBonuses('boneTotems', state);

  // Apply resource multipliers (like 20% bonus from ebony ring)
  if (actionBonuses.resourceMultiplier && actionBonuses.resourceMultiplier !== 1) {
    ['gold', 'silver'].forEach((resource) => {
      const currentAmount = effectUpdates.resources[resource] || state.resources[resource] || 0;
      const baseAmount = currentAmount - (state.resources[resource] || 0);
      if (baseAmount > 0) { // Only apply multiplier to positive gains
        const bonusAmount = Math.floor(baseAmount * (actionBonuses.resourceMultiplier - 1));
        effectUpdates.resources[resource] = currentAmount + bonusAmount;
      }
    });
  }

  Object.assign(result.stateUpdates, effectUpdates);

  return result;
}