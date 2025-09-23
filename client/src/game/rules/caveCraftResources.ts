import { Action, GameState } from "@shared/schema";
import { ActionResult } from '@/game/actions';
import { gameActions, applyActionEffects } from '@/game/rules';

export const caveCraftResources: Record<string, Action> = {
  craftBoneTotem: {
    id: "craftBoneTotem",
    label: "Bone Totem",
    show_when: {
      "buildings.shrine": 1,
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