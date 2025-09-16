
import { Action } from "@shared/schema";

export const forestActions: Record<string, Action> = {
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
