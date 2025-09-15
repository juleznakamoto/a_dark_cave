
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
      "buildings.blacksmith": 1,
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
      "buildings.blacksmith": 1,
      "tools.stone_axe": true,
      "tools.iron_axe": false,
      "story.seen.hasIron": true,
      "story.seen.hasCoal": true,
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
      "buildings.blacksmith": 1,
      "tools.stone_pickaxe": true,
      "tools.iron_pickaxe": false,
      "story.seen.hasIron": true,
      "story.seen.hasCoal": true,
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

  craftSteelAxe: {
    id: "craftSteelAxe",
    label: "Steel Axe",
    show_when: {
      "buildings.blacksmith": 1,
      "tools.iron_axe": true,
      "tools.steel_axe": false,
    },
    cost: {
      "resources.steel": 100,
      "resources.wood": 200,
    },
    effects: {
      "resources.steel": -100,
      "resources.wood": -200,
      "tools.steel_axe": true,
      "story.seen.hasSteelAxe": true,
      "story.seen.actionCraftSteelAxe": true,
    },
    cooldown: 15,
  },

  craftSteelPickaxe: {
    id: "craftSteelPickaxe",
    label: "Steel Pickaxe",
    show_when: {
      "buildings.blacksmith": 1,
      "tools.iron_pickaxe": true,
      "tools.steel_pickaxe": false,
    },
    cost: {
      "resources.steel": 150,
      "resources.wood": 300,
    },
    effects: {
      "resources.steel": -150,
      "resources.wood": -300,
      "tools.steel_pickaxe": true,
      "story.seen.hasSteelPickaxe": true,
      "story.seen.actionCraftSteelPickaxe": true,
    },
    cooldown: 15,
  },

  craftObsidianAxe: {
    id: "craftObsidianAxe",
    label: "Obsidian Axe",
    show_when: {
      "buildings.blacksmith": 1,
      "tools.steel_axe": true,
      "tools.obsidian_axe": false,
    },
    cost: {
      "resources.obsidian": 100,
      "resources.wood": 500,
    },
    effects: {
      "resources.obsidian": -100,
      "resources.wood": -500,
      "tools.obsidian_axe": true,
      "story.seen.hasObsidianAxe": true,
      "story.seen.actionCraftObsidianAxe": true,
    },
    cooldown: 20,
  },

  craftObsidianPickaxe: {
    id: "craftObsidianPickaxe",
    label: "Obsidian Pickaxe",
    show_when: {
      "buildings.blacksmith": 1,
      "tools.steel_pickaxe": true,
      "tools.obsidian_pickaxe": false,
    },
    cost: {
      "resources.obsidian": 150,
      "resources.wood": 750,
    },
    effects: {
      "resources.obsidian": -150,
      "resources.wood": -750,
      "tools.obsidian_pickaxe": true,
      "story.seen.hasObsidianPickaxe": true,
      "story.seen.actionCraftObsidianPickaxe": true,
    },
    cooldown: 20,
  },

  craftAdamantAxe: {
    id: "craftAdamantAxe",
    label: "Adamant Axe",
    show_when: {
      "buildings.blacksmith": 1,
      "tools.obsidian_axe": true,
      "tools.adamant_axe": false,
    },
    cost: {
      "resources.adamant": 100,
      "resources.wood": 1000,
    },
    effects: {
      "resources.adamant": -100,
      "resources.wood": -1000,
      "tools.adamant_axe": true,
      "story.seen.hasAdamantAxe": true,
      "story.seen.actionCraftAdamantAxe": true,
    },
    cooldown: 25,
  },

  craftAdamantPickaxe: {
    id: "craftAdamantPickaxe",
    label: "Adamant Pickaxe",
    show_when: {
      "buildings.blacksmith": 1,
      "tools.obsidian_pickaxe": true,
      "tools.adamant_pickaxe": false,
    },
    cost: {
      "resources.adamant": 150,
      "resources.wood": 1500,
    },
    effects: {
      "resources.adamant": -150,
      "resources.wood": -1500,
      "tools.adamant_pickaxe": true,
      "story.seen.hasAdamantPickaxe": true,
      "story.seen.actionCraftAdamantPickaxe": true,
    },
    cooldown: 25,
  },
};
