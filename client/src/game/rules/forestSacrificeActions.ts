import { Action, GameState } from "@shared/schema";
import { ActionResult } from '@/game/actions';
import { applyActionEffects } from '@/game/rules';
import { getActionBonuses } from '@/game/rules/effects';

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
      "resources.gold": {
        probability: "0.20 + (stats.luck * 0.005)",
        value: "random(5,15)",
      },
      "resources.silver": {
        probability: "0.20 + (stats.luck * 0.005)",
        value: "random(15,30)",
      },
      "story.seen.actionBoneTotems": true,
    },
    cooldown: 30,
  },
};

// Action handlers
export function handleBoneTotems(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('boneTotems', state);

  // Apply sacrifice bonuses and multipliers
  const actionBonuses = getActionBonuses('boneTotems', state);

  if (!effectUpdates.resources) {
    effectUpdates.resources = { ...state.resources };
  }

  // Apply fixed resource bonuses
  if (actionBonuses.resourceBonus) {
    Object.entries(actionBonuses.resourceBonus).forEach(([resource, bonus]) => {
      effectUpdates.resources[resource] = (effectUpdates.resources[resource] || 0) + bonus;
    });
  }

  // Apply resource multipliers (like 20% bonus from ebony ring)
  if (actionBonuses.resourceMultiplier && actionBonuses.resourceMultiplier !== 1) {
    Object.keys(effectUpdates.resources).forEach((resource) => {
      const currentAmount = effectUpdates.resources[resource] || 0;
      const baseAmount = currentAmount - (state.resources[resource] || 0);
      if (baseAmount > 0) { // Only apply multiplier to positive gains
        const bonusAmount = Math.floor(baseAmount * (actionBonuses.resourceMultiplier - 1));
        effectUpdates.resources[resource] = currentAmount + bonusAmount;
      }
    });
  }

  Object.assign(result.stateUpdates, effectUpdates);

  // Add a basic message - more complex events will be handled later
  result.logEntries!.push({
    id: `bone-totems-sacrifice-${Date.now()}`,
    message: 'The bone totems are consumed by the altar. The forest seems to stir in response.',
    timestamp: Date.now(),
    type: 'system',
  });

  return result;
}