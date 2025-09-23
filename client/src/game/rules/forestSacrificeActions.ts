import { Action, GameState } from "@shared/schema";
import { ActionResult } from '@/game/actions';
import { gameActions, applyActionEffects } from '@/game/rules';

export const forestSacrificeActions: Record<string, Action> = {
  boneTotems: {
    id: "boneTotems",
    label: "Bone Totems",
    show_when: {
      "resources.bone_totem": 10,
      "buildings.shrine": 1,
    },
    cost: {
      "resources.bone_totem": 10,
    },
    effects: {
      "resources.bone_totem": -10,
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
  Object.assign(result.stateUpdates, effectUpdates);

  // Add a basic message - more complex events will be handled later
  result.logEntries!.push({
    id: `bone-totems-sacrifice-${Date.now()}`,
    message: 'The bone totems are consumed by the shrine. The forest seems to stir in response.',
    timestamp: Date.now(),
    type: 'system',
  });

  return result;
}