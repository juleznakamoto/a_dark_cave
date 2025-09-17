
import { Action } from "@shared/schema";

export const forestActions: Record<string, Action> = {
  hunt: {
    id: "hunt",
    label: "Hunt",
    show_when: {
      "flags.forestUnlocked": true,
    },
    cost: {},
    effects: {
      "resources.food": "random(3,8)", // Base hunting without bow
      "story.seen.hunted": true,
    },
    cooldown: 10,
  },
  hunt: {
    id: "hunt",
    label: "Hunt",
    show_when: {
      "weapons.crude_bow": true,
    },
    cost: {},
    effects: {
      "resources.food": "getBowHuntingBonus()",
      "story.seen.hasHunted": true,
    },
    cooldown: 10,
  },
};
