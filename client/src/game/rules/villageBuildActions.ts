
import { Action } from "@shared/schema";

export const villageBuildActions: Record<string, Action> = {
  buildHut: {
    id: "buildHut",
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
    },
    effects: {
      1: {
        "resources.wood": -100,
        "buildings.hut": 1,
      },
      2: {
        "resources.wood": -200,
        "buildings.hut": 1,
      },
      3: {
        "resources.wood": -400,
        "buildings.hut": 1,
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
        "buildings.hut": 1,
      },
    },
    cost: {
      1: {
        "resources.wood": 200,
        "resources.stone": 20,
      },
    },
    effects: {
      1: {
        "resources.wood": -200,
        "resources.stone": -20,
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
};
