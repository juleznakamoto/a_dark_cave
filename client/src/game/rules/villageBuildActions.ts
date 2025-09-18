import { Action } from "@shared/schema";

export const villageBuildActions: Record<string, Action> = {
  buildWoodenHut: {
    id: "buildWoodenHut",
    label: "Wooden Hut",
    building: true,
    show_when: {
      1: {
        "flags.villageUnlocked": true,
      },
      2: {
        "buildings.cabin": 1,
      },
      3: {
        "buildings.blacksmith": 1,
      },
      4: {
        "buildings.pit": 1,
      },
      5: {
        "buildings.foundry": 1,
      },
      6: {
        "buildings.foundry": 1,
      },
      7: {
        "buildings.foundry": 1,
      },
    },
    cost: {
      1: {
        "resources.wood": 100,
      },
      2: {
        "resources.wood": 250,
      },
      3: {
        "resources.wood": 500,
      },
      4: {
        "resources.wood": 750,
      },
      5: {
        "resources.wood": 1000,
      },
      6: {
        "resources.wood": 1500,
      },
      7: {
        "resources.wood": 2000,
      },
    },
    effects: {
      1: {
        "resources.wood": -100,
        "buildings.woodenHut": 1,
      },
      2: {
        "resources.wood": -250,
        "buildings.woodenHut": 1,
      },
      3: {
        "resources.wood": -500,
        "buildings.woodenHut": 1,
      },
      4: {
        "resources.wood": -750,
        "buildings.woodenHut": 1,
      },
      5: {
        "resources.wood": -1000,
        "buildings.woodenHut": 1,
      },
      6: {
        "resources.wood": -1500,
        "buildings.woodenHut": 1,
      },
      7: {
        "resources.wood": -2000,
        "buildings.woodenHut": 1,
      },
    },
    cooldown: 10,
  },

  buildCabin: {
    id: "buildCabin",
    label: "Cabin",
    building: true,
    show_when: {
      1: {
        "buildings.woodenHut": 1,
        "buildings.cabin": 0,
      },
    },
    cost: {
      1: {
        "resources.wood": 200,
        "resources.stone": 25,
      },
    },
    effects: {
      1: {
        "resources.wood": -200,
        "resources.stone": -25,
        "buildings.cabin": 1,
      },
    },
    cooldown: 15,
  },

  buildBlacksmith: {
    id: "buildBlacksmith",
    label: "Blacksmith",
    building: true,
    show_when: {
      "tools.iron_axe": true,
      "tools.iron_pickaxe": true,
    },
    cost: {
      "resources.wood": 200,
      "resources.stone": 100,
      "resources.iron": 50,
    },
    effects: {
      "resources.wood": -200,
      "resources.stone": -100,
      "resources.iron": -50,
      "buildings.blacksmith": 1,
      "story.seen.hasBlacksmith": true,
    },
    cooldown: 5,
  },

  buildShrine: {
    id: "buildShrine",
    label: "Shrine",
    building: true,
    show_when: {
      "flags.forestUnlocked": true,
      "buildings.shrine": 0,
      "tools.steel_axe": true,
    },
    cost: {
      "resources.wood": 300,
      "resources.stone": 200,
      "resources.bones": 100,
    },
    effects: {
      "resources.wood": -300,
      "resources.stone": -200,
      "resources.bones": -100,
      "buildings.shrine": 1,
      "flags.shrineBuilt": true,
      "story.seen.hasShrine": true,
    },
    cooldown: 5,
  },
};