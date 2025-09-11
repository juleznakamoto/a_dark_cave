import { Action } from "@shared/schema";
import { GameState } from "@shared/schema";

// Utility function to get the next building level
const getNextBuildingLevel = (actionId: string, state: GameState): number => {
  if (actionId === 'buildHut') {
    return (state.buildings.huts || 0) + 1;
  } else if (actionId === 'buildLodge') {
    return (state.buildings.lodges || 0) + 1;
  } else if (actionId === 'buildWorkshop') {
    return (state.buildings.workshops || 0) + 1;
  }
  return 1;
};

// Helper function to check requirements for both building and non-building actions
const checkRequirements = (requirements: any, state: GameState, action: Action): boolean => {
  if (action.building) {
    const level = getNextBuildingLevel(action.id, state);
    const levelRequirements = requirements[level];
    if (!levelRequirements) return false;
    requirements = levelRequirements;
  }
  
  return Object.entries(requirements).every(([path, expectedValue]) => {
    const pathParts = path.split('.');
    let current: any = state;
    
    for (const part of pathParts) {
      current = current?.[part];
    }
    
    if (typeof expectedValue === 'boolean') {
      return current === expectedValue;
    }
    
    return current >= expectedValue;
  });
};

// Utility function to check if an action should be shown
export const shouldShowAction = (actionId: string, state: GameState): boolean => {
  const action = gameActions[actionId];
  if (!action?.show_when) return false;
  
  return checkRequirements(action.show_when, state, action);
};

// Utility function to check if requirements are met for an action
export const canExecuteAction = (actionId: string, state: GameState): boolean => {
  const action = gameActions[actionId];
  if (!action?.cost) return true;
  
  return checkRequirements(action.cost, state, action);
};

export const gameActions: Record<string, Action> = {
  lightFire: {
    id: "lightFire",
    label: "Light Fire",
    cost: {
      "flags.fireLit": false,
    },
    effects: {
      "flags.fireLit": true,
      "story.seen.fireLit": true,
    },
    cooldown: 1, // 1 second cooldown
  },

  gatherWood: {
    id: "gatherWood",
    label: "Gather Wood",
    show_when: {
      "flags.fireLit": true,
    },
    cost: {},
    effects: {
      "resources.wood": "+1-3", // Random amount
    },
    cooldown: 1, // 5 second cooldown
  },

  buildTorch: {
    id: "buildTorch",
    label: "Torch",
    show_when: {
      "flags.fireLit": true,
    },
    cost: {
      "resources.wood": 10,
    },
    effects: {
      "resources.wood": -10,
      "resources.torch": "+1",
    },
    unlocks: ["exploreDeeper"],
    cooldown: 10, // 10 second cooldown
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
        "buildings.lodges": 1,
      },
      3: {
        "buildings.workshops": 1,
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
    cooldown: 10, // 10 second cooldown
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
    cooldown: 15, // 15 second cooldown
  },

  buildWorkshop: {
    id: "buildWorkshop",
    label: "Workshop",
    building: true,
    show_when: {
      1: {
        "buildings.lodges": 1,
      },
    },
    cost: {
      1: {
        "resources.wood": 100,
        "resources.stone": 20,
      },
    },
    effects: {
      1: {
        "resources.wood": -100,
        "resources.stone": -20,
        "buildings.workshops": 1,
      },
    },
    cooldown: 20, // 20 second cooldown
  },

  exploreCave: {
    id: "exploreCave",
    label: "Explore Cave",
    show_when: {
      "flags.fireLit": true,
    },
    cost: {
      "resources.torch": 5,
    },
    effects: {
      "resources.torch": -5,
      "flags.caveExplored": true,
    },
    cooldown: 15, // 15 second cooldown
  },

  craftAxe: {
    id: "craftAxe",
    label: "Axe",
    show_when: {
      "flags.caveExplored": true,
      "tools.axe": false,
    },
    cost: {
      "resources.wood": 5,
      "resources.stone": 10,
    },
    effects: {
      "resources.wood": -5,
      "resources.stone": -10,
      "tools.axe": true,
    },
    cooldown: 1, // 1 second cooldown
  },
};

export const gameTexts = {
  cave: {
    initial:
      "A dark cave. The air is cold and stale. You can barely make out the shapes around you. A low, rumbling sound echoes from deeper in the cave.",
    fireLit:
      "The fire crackles softly, casting dancing shadows on the cave walls. The warmth is comforting.",
  },
  village: {
    initial: "This could be the foundation of something greater.",
    buildings: "Buildings",
  },
  world: {
    initial: "Beyond the village lies a vast world waiting to be explored...",
  },
  hints: {},
};
