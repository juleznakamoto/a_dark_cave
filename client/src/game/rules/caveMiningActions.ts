
import { Action } from "@shared/schema";

export const caveMiningActions: Record<string, Action> = {
  mineIron: {
    id: "mineIron",
    label: "Mine Iron",
    show_when: {
      "tools.stone_pickaxe": true,
    },
    cost: {
      "resources.food": 5,
      "resources.torch": 1,
    },
    effects: {
      "resources.torch": -1,
      "resources.food": -5,
      "resources.iron": "random(2,5)",
      "story.seen.hasIron": true,
    },
    cooldown: 15,
  },

  mineCoal: {
    id: "mineCoal",
    label: "Mine Coal",
    show_when: {
      "tools.stone_pickaxe": true,
    },
    cost: {
      "resources.food": 5,
      "resources.torch": 1,
    },
    effects: {
      "resources.torch": -1,
      "resources.food": -5,
      "resources.coal": "random(2,5)",
      "story.seen.hasCoal": true,
    },
    cooldown: 15,
  },

  mineSulfur: {
    id: "mineSulfur",
    label: "Mine Sulfur",
    show_when: {
      "tools.iron_pickaxe": true,
    },
    cost: {
      "resources.food": 15,
      "resources.torch": 5,
    },
    effects: {
      "resources.torch": -10,
      "resources.food": -15,
      "resources.sulfur": "random(2,5)",
      "story.seen.hasSulfur": true,
    },
    cooldown: 15,
  },

  mineObsidian: {
    id: "mineObsidian",
    label: "Mine Obsidian",
    show_when: {
      "tools.steel_pickaxe": true,
    },
    cost: {
      "resources.food": 30,
      "resources.torch": 10,
    },
    effects: {
      "resources.torch": -15,
      "resources.food": -30,
      "resources.obsidian": "random(2,5)",
      "story.seen.hasObsidian": true,
    },
    cooldown: 15,
  },

  mineAdamant: {
    id: "mineAdamant",
    label: "Mine Adamant",
    show_when: {
      "tools.obsidian_pickaxe": true,
    },
    cost: {
      "resources.food": 50,
      "resources.torch": 20,
    },
    effects: {
      "resources.torch": -20,
      "resources.food": -50,
      "resources.adamant": "random(2,5)",
      "story.seen.hasAdamant": true,
    },
    cooldown: 20,
  },
};
