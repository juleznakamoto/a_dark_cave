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
      "resources.gold": {
        probability: 0.20 + (state.stats.luck * 0.005),
        value: "random(5,15)",
      },
      "resources.silver": {
        probability: "0.20 + (stats.luck * 0.005)",
        value: "random(15,30)",
      },
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

  // Calculate luck-based probabilities manually
  const totalLuck = getTotalLuck(state);
  const goldProbability = 0.20 + (totalLuck * 0.005);
  const silverProbability = 0.20 + (totalLuck * 0.005);

  // Roll for gold
  if (Math.random() < goldProbability) {
    const goldAmount = Math.floor(Math.random() * 11) + 5; // random(5,15)
    effectUpdates.resources.gold = (state.resources.gold || 0) + goldAmount;
    
    result.logEntries!.push({
      id: `bone-totems-gold-${Date.now()}`,
      message: `The forest spirits reward your offering with ${goldAmount} gold.`,
      timestamp: Date.now(),
      type: 'system',
    });
  }

  // Roll for silver
  if (Math.random() < silverProbability) {
    const silverAmount = Math.floor(Math.random() * 16) + 15; // random(15,30)
    effectUpdates.resources.silver = (state.resources.silver || 0) + silverAmount;
    
    result.logEntries!.push({
      id: `bone-totems-silver-${Date.now()}`,
      message: `The ancient powers bestow ${silverAmount} silver upon you.`,
      timestamp: Date.now(),
      type: 'system',
    });
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