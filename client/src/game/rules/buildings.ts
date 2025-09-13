
import { Action } from "@shared/schema";

export const buildingActions: Record<string, Action> = {
  buildHut: {
    id: "buildHut",
    label: "Wooden Hut",
    building: true,
    show_when: {
      1: {
        "flags.villageUnlocked": true,
      },
      2: {
        "buildings.lodges": 1,
      },
      3: {
        "buildings.blacksmiths": 1,
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
        "buildings.huts": 1,
      },
      2: {
        "resources.wood": -200,
        "buildings.huts": 1,
      },
      3: {
        "resources.wood": -400,
        "buildings.huts": 1,
      },
    },
    cooldown: 10,
  },

  buildLodge: {
    id: "buildLodge",
    label: "Lodge",
    building: true,
    show_when: {
      1: {
        "buildings.huts": 1,
      },
    },
    cost: {
      1: {
        "resources.wood": 250,
      },
    },
    effects: {
      1: {
        "resources.wood": -250,
        "buildings.lodges": 1,
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
        "buildings.lodges": 1,
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
        "buildings.blacksmiths": 1,
      },
    },
    cooldown: 20,
  },
};
