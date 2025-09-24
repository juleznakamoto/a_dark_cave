import { Action, GameState } from "@shared/schema";
import { ActionResult } from '@/game/actions';
import { gameActions, applyActionEffects } from '@/game/rules';

export const caveCraftResources: Record<string, Action> = {
  craftBoneTotem: {
    id: "craftBoneTotem",
    label: "Bone Totem",
    show_when: {
      "buildings.altar": 1,
    },
    cost: {
      "resources.bones": 50,
    },
    effects: {
      "resources.bones": -50,
      "resources.bone_totem": 1,
      "story.seen.hasBoneTotem": true,
    },
    cooldown: 20,
  },
};

// Action handlers
export function handleCraftBoneTotem(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('craftBoneTotem', state);
  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}