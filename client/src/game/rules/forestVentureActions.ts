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
      "resources.food": "random(1,6)",
      "resources.fur": "random(0,2)",
      "resources.bones": "random(0,2)",
      "story.seen.hasHunted": true,
      "relics.blacksmith_hammer": {
        probability: 0.0025,
        value: true,
        condition: "!relics.blacksmith_hammer",
        logMessage:
          "Deep in the forest, you discover the ruin of an old stone building dominated by a massive stone furnace. Skeletal remains lie scattered about - the bones of what must have been a giant. Among the debris, a magnificent blacksmith hammer catches the light, its head still bearing traces of ancient forge-fire. You take the hammer with you.",
      },
    },
    cooldown: 10,
  },

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

  layTrap: {
    id: "layTrap",
    label: "Lay Trap",
    show_when: {
      "tools.giant_trap": true,
    },
    cost: {
      "resources.food": 500,
    },
    effects: {
      "resources.food": -500,
      "story.seen.trapLaid": true,
    },
    cooldown: 20,
  },
};