import { Action } from "@shared/schema";
import { GameState } from "@shared/schema";

// Utility function to check if an action should be shown
export const shouldShowAction = (actionId: string, state: GameState): boolean => {
  const action = gameActions[actionId];
  if (!action?.showRequirements) return false;
  
  return Object.entries(action.showRequirements).every(([path, expectedValue]) => {
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

// Utility function to check if requirements are met for an action
export const canExecuteAction = (actionId: string, state: GameState): boolean => {
  const action = gameActions[actionId];
  if (!action?.requirements) return true;
  
  return Object.entries(action.requirements).every(([path, expectedValue]) => {
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

// Building requirements configuration
export const buildingRequirements = {
  hut: {
    1: { wood: 100, requiredBuildings: {} },
    2: { wood: 200, requiredBuildings: { lodges: 1 } },
    3: { wood: 400, requiredBuildings: { workshops: 1 } }
  },
  lodge: {
    1: { wood: 250, requiredBuildings: { huts: 1 } },
  },
  workshop: {
    1: { wood: 100, stone: 20, requiredBuildings: { lodges: 1 } },
  },
};

export const gameActions: Record<string, Action> = {
  lightFire: {
    id: "lightFire",
    label: "Light Fire",
    requirements: {
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
    showRequirements: {
      "flags.fireLit": true,
    },
    requirements: {},
    effects: {
      "resources.wood": "+1-3", // Random amount
    },
    cooldown: 1, // 5 second cooldown
  },

  buildTorch: {
    id: "buildTorch",
    label: "Torch",
    showRequirements: {
      "flags.fireLit": true,
    },
    requirements: {
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
    requirements: {
      "flags.villageUnlocked": true,
      "resources.wood": 100,
    },
    effects: {
      "resources.wood": -100,
      "buildings.huts": 1,
    },
    cooldown: 10, // 10 second cooldown
  },

  buildLodge: {
    id: "buildLodge",
    label: "Lodge",
    requirements: {
      "buildings.huts": 1,
    },
    effects: {
      "resources.wood": -250,
      "buildings.lodges": 1,
    },
    cooldown: 15, // 15 second cooldown
  },

  buildWorkshop: {
    id: "buildWorkshop",
    label: "Workshop",
    requirements: {
      "buildings.lodges": 1,
    },
    effects: {
      "resources.wood": -100,
      "resources.stone": -10,
      "buildings.workshops": 1,
    },
    cooldown: 20, // 20 second cooldown
  },

  exploreCave: {
    id: "exploreCave",
    label: "Explore Cave",
    showRequirements: {
      "flags.fireLit": true,
    },
    requirements: {
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
    showRequirements: {
      "flags.caveExplored": true,
      "tools.axe": false,
    },
    requirements: {
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
