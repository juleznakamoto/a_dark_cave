
import { Action } from "@shared/schema";

export const craftingActions: Record<string, Action> = {
  buildTorch: {
    id: "buildTorch",
    label: "Torch",
    show_when: {
      "story.seen.hasWood": true,
    },
    cost: {
      "resources.wood": 10,
    },
    effects: {
      "resources.wood": -10,
      "resources.torch": 1,
      "story.seen.actionBuildTorch": true,
    },
    unlocks: ["exploreDeeper"],
    cooldown: 5,
  },

  craftStoneAxe: {
    id: "craftStoneAxe",
    label: "StoneAxe",
    show_when: {
      "flags.caveExplored": true,
      "tools.stone_axe": false,
    },
    cost: {
      "resources.wood": 5,
      "resources.stone": 10,
    },
    effects: {
      "resources.wood": -5,
      "resources.stone": -10,
      "tools.stone_axe": true,
      "flags.villageUnlocked": true,
      "story.seen.hasStoneAxe": true,
      "story.seen.actionCraftStoneAxe": true,
    },
    cooldown: 1,
  },

  craftStonePickaxe: {
    id: "craftStonePickaxe",
    label: "Stone Pickaxe",
    show_when: {
      "buildings.blacksmiths": 1,
      "tools.stone_pickaxe": false,
    },
    cost: {
      "resources.wood": 10,
      "resources.stone": 20,
    },
    effects: {
      "resources.wood": -10,
      "resources.stone": -20,
      "tools.stone_pickaxe": true,
      "story.seen.hasStonePickaxe": true,
      "story.seen.actionCraftStonePickaxe": true,
    },
    cooldown: 5,
  },

  craftIronAxe: {
    id: "craftIronAxe",
    label: "Iron Axe",
    show_when: {
      "buildings.blacksmiths": 1,
      "tools.iron_axe": false,
    },
    cost: {
      "resources.iron": 50,
      "resources.wood": 100,
    },
    effects: {
      "resources.iron": -50,
      "resources.wood": -100,
      "tools.iron_axe": true,
      "story.seen.hasIronAxe": true,
      "story.seen.actionCraftIronAxe": true,
    },
    cooldown: 10,
  },

  craftIronPickaxe: {
    id: "craftIronPickaxe",
    label: "Iron Pickaxe",
    show_when: {
      "buildings.blacksmiths": 1,
      "tools.iron_pickaxe": false,
    },
    cost: {
      "resources.iron": 75,
      "resources.wood": 150,
    },
    effects: {
      "resources.iron": -75,
      "resources.wood": -150,
      "tools.iron_pickaxe": true,
      "story.seen.hasIronPickaxe": true,
      "story.seen.actionCraftIronPickaxe": true,
    },
    cooldown: 10,
  },
};
