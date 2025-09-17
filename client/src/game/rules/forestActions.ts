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
      "resources.food": "getBowHuntingBonus()", // Enhanced hunting with crude bow
      "story.seen.hasHunted": true,
    },
    cooldown: 10,
  },
};