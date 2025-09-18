
import { Action } from "@shared/schema";

export const caveForgingActions: Record<string, Action> = {
  forgeSteel: {
    id: "forgeSteel",
    label: "Steel",
    show_when: {
      "story.seen.hasIronAxe": true,
      "story.seen.hasIronPickaxe": true,
      "buildings.foundry": 1,
    },
    cost: {
      "resources.coal": 5,
      "resources.iron": 5,
    },
    effects: {
      "resources.coal": -5,
      "resources.iron": -5,
      "resources.steel": 1,
      "story.seen.hasSteel": true,
    },
    cooldown: 10,
  },

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
    cooldown: 15,
  },
};
