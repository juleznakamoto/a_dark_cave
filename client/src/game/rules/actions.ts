
import { Action } from "@shared/schema";

export const basicActions: Record<string, Action> = {
  lightFire: {
    id: "lightFire",
    label: "Light Fire",
    show_when: { "flags.fireLit": false },
    cost: {},
    effects: {
      "flags.fireLit": true,
      "story.seen.fireLit": true,
    },
    cooldown: 1,
  },

  gatherWood: {
    id: "gatherWood",
    label: "Gather Wood",
    show_when: {
      "flags.fireLit": true,
    },
    cost: {},
    effects: {
      "resources.wood": "random(1,3)",
      "story.seen.hasWood": true,
    },
    cooldown: 3,
  },

  exploreCave: {
    id: "exploreCave",
    label: "Explore Cave",
    show_when: {
      "flags.fireLit": true,
      "story.seen.actionBuildTorch": true,
    },
    cost: {
      "resources.torch": 5,
    },
    effects: {
      "resources.torch": -5,
      "resources.stone": "random(2,5)",
      "resources.coal": { probability: 0.1, value: "random(1,4)" },
      "resources.iron": { probability: 0.1, value: "random(1,4)" },
      "resources.bones": { probability: 0.05, value: "random(1,4)" },
      "clothing.tarnished_amulet": {
        probability: 0.05,
        value: true,
        logMessage: "In the shadows of the cave, something glints. You reach down and find a tarnished amulet, its surface worn but emanating an ancient power. When you wear it, an uncanny calm settles over you."
      },
      "flags.caveExplored": true,
      "story.seen.hasStone": true,
    },
    cooldown: 10,
  },

  mineIron: {
    id: "mineIron",
    label: "Mine Iron",
    show_when: {
      "tools.stone_pickaxe": true,
    },
    cost: {
      "resources.torch": 10,
      "resources.food": 5
    },
    effects: {
      "resources.torch": -10,
      "resources.food": -5,
      "resources.iron": "random(2,5)",
      "story.seen.hasIron": true,
    },
    cooldown: 8,
  },

  ventureDeeper: {
    id: "ventureDeeper",
    label: "Venture Deeper",
    show_when: {
      "buildings.lodges": 1,
    },
    cost: {
      "resources.torch": 10,
      "resources.food": 20,
    },
    effects: {
      "resources.torch": -10,
      "resources.food": -20,
      "resources.stone": "random(3,8)",
      "resources.coal": { probability: 0.2, value: "random(2,5)" },
      "resources.iron": { probability: 0.15, value: "random(2,4)" },
      "resources.bones": { probability: 0.1, value: "random(1,3)" },
      "clothing.tarnished_amulet": {
        probability: 0.05,
        value: true,
        logMessage: "In the shadows of the cave, something glints. You reach down and find a tarnished amulet, its surface worn but emanating an ancient power. When you wear it, an uncanny calm settles over you."
      },
      "flags.venturedDeeper": true,
      "story.seen.venturedDeeper": true,
    },
    cooldown: 15,
  },
};
