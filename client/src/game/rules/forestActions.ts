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
      "resources.food": 5 + "getBowHuntingBonus()",
      "story.seen.hasHunted": true,
      "event.blacksmithHammer": { probability: 0.25 },
    },
    cooldown: 10,
  },
};