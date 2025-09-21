
import { Action } from "@shared/schema";

export const caveCraftWeapons: Record<string, Action> = {
  craftIronSword: {
    id: "craftIronSword",
    label: "Iron Sword",
    show_when: {
      "buildings.blacksmith": 1,
      "weapons.iron_sword": false,
    },
    cost: {
      "resources.iron": 100,
    },
    effects: {
      "resources.iron": -100,
      "weapons.iron_sword": true,
    },
    cooldown: 15,
  },

  craftSteelSword: {
    id: "craftSteelSword",
    label: "Steel Sword",
    show_when: {
      "buildings.blacksmith": 1,
      "weapons.iron_sword": true,
      "weapons.steel_sword": false,
      "story.seen.hasSteel": true,
    },
    cost: {
      "resources.steel": 150,
    },
    effects: {
      "resources.steel": -150,
      "weapons.steel_sword": true,
    },
    cooldown: 20,
  },

  craftObsidianSword: {
    id: "craftObsidianSword",
    label: "Obsidian Sword",
    show_when: {
      "buildings.blacksmith": 1,
      "weapons.steel_sword": true,
      "weapons.obsidian_sword": false,
    },
    cost: {
      "resources.obsidian": 200,
    },
    effects: {
      "resources.obsidian": -200,
      "weapons.obsidian_sword": true,
    },
    cooldown: 25,
  },

  craftAdamantSword: {
    id: "craftAdamantSword",
    label: "Adamant Sword",
    show_when: {
      "buildings.blacksmith": 1,
      "weapons.obsidian_sword": true,
      "weapons.adamant_sword": false,
    },
    cost: {
      "resources.adamant": 250,
    },
    effects: {
      "resources.adamant": -250,
      "weapons.adamant_sword": true,
    },
    cooldown: 30,
  },

  craftCrudeBow: {
    id: "craftCrudeBow",
    label: "Crude Bow",
    show_when: {
      "buildings.blacksmith": 1,
      "weapons.crude_bow": false,
    },
    cost: {
      "resources.wood": 200,
    },
    effects: {
      "resources.wood": -200,
      "weapons.crude_bow": true,
      "flags.forestUnlocked": true,
    },
    cooldown: 10,
  },

  craftHuntsmanBow: {
    id: "craftHuntsmanBow",
    label: "Huntsman Bow",
    show_when: {
      "buildings.blacksmith": 1,
      "weapons.crude_bow": true,
      "weapons.huntsman_bow": false,
      "story.seen.hasIron": true,
    },
    cost: {
      "resources.wood": 500,
      "resources.iron": 50,
    },
    effects: {
      "resources.wood": -500,
      "resources.iron": -50,
      "weapons.huntsman_bow": true,
    },
    cooldown: 15,
  },

  craftLongBow: {
    id: "craftLongBow",
    label: "Long Bow",
    show_when: {
      "buildings.blacksmith": 1,
      "weapons.huntsman_bow": true,
      "weapons.long_bow": false,
      "story.seen.hasSteel": true,
    },
    cost: {
      "resources.wood": 1000,
      "resources.steel": 100,
    },
    effects: {
      "resources.wood": -1000,
      "resources.steel": -100,
      "weapons.long_bow": true,
    },
    cooldown: 20,
  },

  craftWarBow: {
    id: "craftWarBow",
    label: "War Bow",
    show_when: {
      "buildings.blacksmith": 1,
      "weapons.long_bow": true,
      "weapons.war_bow": false,
    },
    cost: {
      "resources.wood": 1500,
      "resources.obsidian": 100,
    },
    effects: {
      "resources.wood": -1500,
      "resources.obsidian": -100,
      "weapons.war_bow": true,
      "story.seen.hasWarBow": true,
      "story.seen.actionCraftWarBow": true,
    },
    cooldown: 25,
  },

  craftMasterBow: {
    id: "craftMasterBow",
    label: "Master Bow",
    show_when: {
      "buildings.blacksmith": 1,
      "weapons.war_bow": true,
      "weapons.master_bow": false,
    },
    cost: {
      "resources.wood": 2500,
      "resources.adamant": 100,
    },
    effects: {
      "resources.wood": -2500,
      "resources.adamant": -100,
      "weapons.master_bow": true,
      "story.seen.hasMasterBow": true,
      "story.seen.actionCraftMasterBow": true,
    },
    cooldown: 30,
  },
};
