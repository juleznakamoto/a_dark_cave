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
        "buildings.shallowPit": 1,
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
      8: {
        "buildings.shrine": 1,
      },
      9: {
        "buildings.greatCabin": 1,
        "buildings.timberMill": 1,
        "buildings.quarry": 1
      },
      10: {
        "buildings.woodenHut": 9,
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
      8: {
        "resources.wood": 2500,
      },
      9: {
        "resources.wood": 3000,
      },
      19: {
        "resources.wood": 4000,
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
      8: {
        "resources.wood": -2500,
        "buildings.woodenHut": 1,
      },
      9: {
        "resources.wood": -3000,
        "buildings.woodenHut": 1,
      },
      10: {
        "resources.wood": -4000,
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
      1: {
        "tools.stone_axe": true,
        "tools.stone_pickaxe": true,
        "buildings.blacksmith": 0,
      },
    },
    cost: {
      1: {
        "resources.wood": 200,
        "resources.stone": 100,
        "resources.iron": 50,
      },
    },
    effects: {
      1: {
        "resources.wood": -200,
        "resources.stone": -100,
        "resources.iron": -50,
        "buildings.blacksmith": 1,
        "story.seen.hasBlacksmith": true,
      },
    },
    cooldown: 5,
  },

  buildShallowPit: {
    id: "buildShallowPit",
    label: "Shallow Pit",
    building: true,
    show_when: {
      1: {
        "tools.iron_pickaxe": true,
        "buildings.shallowPit": 0,
        "buildings.deepeningPit": 0,
        "buildings.deepPit": 0,
        "buildings.bottomlessPit": 0,
      },
    },
    cost: {
      1: {
        "resources.wood": 500,
        "resources.stone": 250,
      },
    },
    effects: {
      1: {
        "resources.wood": -500,
        "resources.stone": -250,
        "buildings.shallowPit": 1,
      },
    },
    cooldown: 30,
  },

  buildDeepeningPit: {
    id: "buildDeepeningPit",
    label: "Deepening Pit",
    building: true,
    show_when: {
      1: {
        "tools.steel_pickaxe": true,
        "buildings.shallowPit": 1,
        "buildings.deepeningPit": 0,
      },
    },
    cost: {
      1: {
        "resources.wood": 1000,
        "resources.stone": 250,
        "resources.iron": 50,
      },
    },
    effects: {
      1: {
        "resources.wood": -1000,
        "resources.stone": -250,
        "resources.iron": -50,
        "buildings.deepeningPit": 1,
      },
    },
    cooldown: 30,
  },

  buildDeepPit: {
    id: "buildDeepPit",
    label: "Deep Pit",
    building: true,
    show_when: {
      1: {
        "tools.obsidian_pickaxe": true,
        "buildings.deepeningPit": 1,
        "buildings.deepPit": 0,
      },
    },
    cost: {
      1: {
        "resources.wood": 2500,
        "resources.stone": 500,
        "resources.steel": 100,
      },
    },
    effects: {
      1: {
        "resources.wood": -2500,
        "resources.stone": -500,
        "resources.steel": -100,
        "buildings.deepPit": 1,
      },
    },
    cooldown: 30,
  },

  buildBottomlessPit: {
    id: "buildBottomlessPit",
    label: "Bottomless Pit",
    building: true,
    show_when: {
      1: {
        "tools.adamant_pickaxe": true,
        "buildings.deepPit": 1,
        "buildings.bottomlessPit": 0,
      },
    },
    cost: {
      1: {
        "resources.wood": 5000,
        "resources.stone": 1000,
        "resources.steel": 250,
      },
    },
    effects: {
      1: {
        "resources.wood": -5000,
        "resources.stone": -1000,
        "resources.steel": -250,
        "buildings.bottomlessPit": 1,
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
        "buildings.shallowPit": 1,
        "buildings.foundry": 0,
      },
    },
    cost: {
      1: {
        "resources.wood": 500,
        "resources.stone": 250,
        "resources.iron": 100,
      },
    },
    effects: {
      1: {
        "resources.wood": -500,
        "resources.stone": -250,
        "resources.iron": -100,
        "buildings.foundry": 1,
      },
    },
    cooldown: 20,
  },

  buildShrine: {
    id: "buildShrine",
    label: "Shrine",
    building: true,
    show_when: {
      1: {
        "flags.forestUnlocked": true,
        "buildings.shrine": 0,
        "tools.steel_axe": true,
      },
    },
    cost: {
      1: {
        "resources.wood": 500,
        "resources.stone": 250,
        "resources.bones": 100,
        "resources.silver": 10,
      },
    },
    effects: {
      1: {
        "resources.wood": -500,
        "resources.stone": -250,
        "resources.bones": -100,
        "resources.silver": -10,
        "buildings.shrine": 1,
        "flags.shrineBuilt": true,
        "story.seen.hasShrine": true,
      },
    },
    cooldown: 5,
  },

  buildGreatCabin: {
    id: "buildGreatCabin",
    label: "Great Cabin",
    building: true,
    show_when: {
      1: {
        "buildings.woodenHut": 8,
        "buildings.cabin": 1,
        "buildings.greatCabin": 0,
      },
    },
    cost: {
      1: {
        "resources.wood": 2000,
        "resources.stone": 2000,
      },
    },
    effects: {
      1: {
        "resources.wood": -2000,
        "resources.stone": -2000,
        "buildings.greatCabin": 1,
        "story.seen.hasGreatCabin": true,
      },
    },
    cooldown: 30,
  },

  buildTimberMill: {
    id: "buildTimberMill",
    label: "Timber Mill",
    building: true,
    show_when: {
      1: {
        "buildings.woodenHut": 10,
        "buildings.timberMill": 0,
      },
    },
    cost: {
      1: {
        "resources.wood": 4000,
        "resources.stone": 2000,
      },
    },
    effects: {
      1: {
        "resources.wood": -4000,
        "resources.stone": -2000,
        "buildings.timberMill": 1,
        "story.seen.hasTimberMill": true,
      },
    },
    cooldown: 30,
  },

  buildQuarry: {
    id: "buildQuarry",
    label: "Quarry",
    building: true,
    show_when: {
      1: {
        "buildings.woodenHut": 10,
        "buildings.quarry": 0,
      },
    },
    cost: {
      1: {
        "resources.wood": 3000,
        "resources.stone": 3000,
      },
    },
    effects: {
      1: {
        "resources.wood": -3000,
        "resources.stone": -3000,
        "buildings.quarry": 1,
        "story.seen.hasQuarry": true,
      },
    },
    cooldown: 30,
  },

  buildClerksHut: {
    id: "buildClerksHut",
    label: "Clerk's Hut",
    building: true,
    show_when: {
      1: {
        "buildings.woodenHut": 6,
        "buildings.clerksHut": 0,
      },
    },
    cost: {
      1: {
        "resources.wood": 500,
        "resources.stone": 500,
      },
    },
    effects: {
      1: {
        "resources.wood": -500,
        "resources.stone": -500,
        "buildings.clerksHut": 1,
        "story.seen.hasClerksHut": true,
      },
    },
    cooldown: 30,
  },
};