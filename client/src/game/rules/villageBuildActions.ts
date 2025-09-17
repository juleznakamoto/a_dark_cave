
import { Action } from "@shared/schema";

export const villageBuildActions: Record<string, Action> = {
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
      "resources.wood": "random(1,400)",
      "story.seen.hasWood": true,
      "events.trinket_found": {
        probability: 0.0005,
        value: true,
        condition: "!events.trinket_found && buildings.cabin >= 1",
        triggerEvent: "trinketFound",
      },
    },
    cooldown: 5,
  },

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
