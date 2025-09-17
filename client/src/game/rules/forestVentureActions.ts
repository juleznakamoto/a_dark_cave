
import { Action } from "@shared/schema";

export const forestVentureActions: Record<string, Action> = {
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
      "tools.blacksmith_hammer": { 
        probability: 0.25, 
        value: true, 
        condition: "!tools.blacksmith_hammer",
        logMessage: "While hunting, you discover an ancient blacksmith's hammer hidden beneath fallen leaves. Its head gleams with an otherworldly sheen, and strange runes are etched along its handle. You claim the ancient hammer."
      },
    },
    cooldown: 10,
  },
};
