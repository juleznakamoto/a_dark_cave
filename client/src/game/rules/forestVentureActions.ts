
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
      "resources.food": "5 + getBowHuntingBonus()",
      "story.seen.hasHunted": true,
      "tools.blacksmith_hammer": { 
        probability: 0.25, 
        value: true, 
        condition: "!tools.blacksmith_hammer",
        logMessage: "Deep in the forest, you discover the ruin of an old stone building dominated by a massive stone furnace. Skeletal remains lie scattered about - the bones of what must have been a giant. Among the debris, a magnificent hammer catches the light, its head still bearing traces of ancient forge-fire. You take the Blacksmith Hammer with you. (+2 Strength, -10% crafting costs)"
      },
    },
    cooldown: 10,
  },
};
