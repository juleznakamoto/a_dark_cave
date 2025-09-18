
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
    },
    cost: {
      1: {
        "resources.wood": 100,
      },
      2: {
        "resources.wood": 200,
      },
      3: {
        "resources.wood": 400,
      },
      4: {
        "resources.wood": 800,
      },
      5: {
        "resources.wood": 1500,
      },
    },
    effects: {
      1: {
        "resources.wood": -100,
        "buildings.woodenHut": 1,
      },
      2: {
        "resources.wood": -200,
        "buildings.woodenHut": 1,
      },
      3: {
        "resources.wood": -400,
        "buildings.woodenHut": 1,
      },
      4: {
        "resources.wood": -800,
        "buildings.woodenHut": 1,
      },
      5: {
        "resources.wood": -1500,
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
      1: {
        "buildings.cabin": 1,
        "buildings.blacksmith": 0,
      },
    },
    cost: {
      1: {
        "resources.wood": 100,
        "resources.stone": 25,
      },
    },
    effects: {
      1: {
        "resources.wood": -100,
        "resources.stone": -25,
        "buildings.blacksmith": 1,
      },
    },
    cooldown: 20,
  },

  buildPit: {
    id: "buildPit",
    label: "Mining Pit",
    building: true,
    show_when: {
      1: {
        "tools.iron_pickaxe": true,
        "buildings.pit": 0,
      },
      2: {
        "tools.steel_pickaxe": true,
        "buildings.pit": 1,
      },
      3: {
        "tools.obsidian_pickaxe": true,
        "buildings.pit": 2,
      },
      4: {
        "tools.adamant_pickaxe": true,
        "buildings.pit": 3,
      },
    },
    cost: {
      1: {
        "resources.wood": 250,
        "resources.stone": 50,
      },
      2: {
        "resources.wood": 500,
        "resources.stone": 100,
        "resources.iron": 50,
      },
      3: {
        "resources.wood": 1000,
        "resources.stone": 250,
        "resources.steel": 100,
      },
      4: {
        "resources.wood": 2000,
        "resources.stone": 500,
        "resources.steel": 250,
      },
    },
    effects: {
      1: {
        "resources.wood": -250,
        "resources.stone": -50,
        "buildings.pit": 1,
      },
      2: {
        "resources.wood": -500,
        "resources.stone": -100,
        "resources.iron": -50,
        "buildings.pit": 1,
      },
      3: {
        "resources.wood": -1000,
        "resources.stone": -250,
        "resources.steel": -100,
        "buildings.pit": 1,
      },
      4: {
        "resources.wood": -2000,
        "resources.stone": -500,
        "resources.obsidian": -250,
        "buildings.pit": 1,
      },
    },
    cooldown: 30,
  },

  buildFoundry: {
    id: "buildFoundry",
    label: "Foundry",
    building: true,
    show_when: {
      1: {
        "buildings.pit": 1,
        "buildings.foundry": 0,
      },
    },
    cost: {
      1: {
        "resources.wood": 250,
        "resources.stone": 200,
        "resources.iron": 100,
      },
    },
    effects: {
      1: {
        "resources.wood": -250,
        "resources.stone": -200,
        "resources.iron": -100,
        "buildings.foundry": 1,
      },
    },
    cooldown: 20,
  },
};
