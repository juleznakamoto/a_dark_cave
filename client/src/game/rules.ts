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

// Utility function to apply action effects
export const applyActionEffects = (actionId: string, state: GameState): Partial<GameState> => {
  const action = gameActions[actionId];
  if (!action?.effects) return {};

  const updates: any = {};

  for (const [path, effect] of Object.entries(action.effects)) {
    const pathParts = path.split('.');
    let current = updates;
    
    // Navigate to the correct nested object
    for (let i = 0; i < pathParts.length - 1; i++) {
      const part = pathParts[i];
      if (!current[part]) {
        current[part] = pathParts[i] === 'resources' ? { ...state.resources } :
                       pathParts[i] === 'flags' ? { ...state.flags } :
                       pathParts[i] === 'tools' ? { ...state.tools } :
                       pathParts[i] === 'buildings' ? { ...state.buildings } :
                       pathParts[i] === 'story' ? { ...state.story, seen: { ...state.story.seen } } :
                       {};
      }
      current = current[part];
    }

    const finalKey = pathParts[pathParts.length - 1];
    
    if (typeof effect === 'string' && effect.startsWith('random(')) {
      // Handle random effects like "random(1,3)"
      const match = effect.match(/random\((\d+),(\d+)\)/);
      if (match) {
        const min = parseInt(match[1]);
        const max = parseInt(match[2]);
        let baseAmount = Math.floor(Math.random() * (max - min + 1)) + min;
        
        // Apply axe bonus for wood gathering
        if (actionId === 'gatherWood' && finalKey === 'wood' && state.tools.axe) {
          baseAmount += 3; // +3 wood if axe is owned
        }
        
        current[finalKey] = (state.resources[finalKey as keyof typeof state.resources] || 0) + baseAmount;
      }
    } else if (typeof effect === 'number') {
      if (pathParts[0] === 'resources') {
        current[finalKey] = (state.resources[finalKey as keyof typeof state.resources] || 0) + effect;
      } else {
        current[finalKey] = effect;
      }
    } else if (typeof effect === 'boolean') {
      current[finalKey] = effect;
    }
  }

  return updates;
};

// Utility function to get cost text for actions
export const getCostText = (actionId: string, state?: GameState) => {
  const action = gameActions[actionId];
  if (!action?.cost) return '';
  
  let costs = action.cost;
  
  // For building actions, get the cost for the next level
  if (action.building && state) {
    const level = getNextBuildingLevel(actionId, state);
    costs = action.cost[level];
  }
  
  if (!costs || Object.keys(costs).length === 0) return '';
  
  const costText = Object.entries(costs)
    .map(([resource, amount]) => {
      // Extract the clean resource name from paths like "resources.wood"
      const resourceName = resource.includes('.') ? resource.split('.').pop() : resource;
      return `${amount} ${resourceName}`;
    })
    .join(', ');
  
  return costText ? ` (${costText})` : '';
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
      "resources.wood": "random(1,3)", // 1-3 base + axe bonus
      "story.seen.hasWood": true,
    },
    cooldown: 3,
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
      "resources.torch": 1,
      "flags.torchBuilt": true,
      "story.seen.actionBuildTorch": true,
    },
    unlocks: ["exploreDeeper"],
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
    cooldown: 20,
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
      "resources.stone": "random(2,5)",
      "flags.caveExplored": true,
      "story.seen.hasStone": true,
    },
    cooldown: 10,
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
      "flags.villageUnlocked": true,
      "story.seen.hasAxe": true,
      "story.seen.actionCraftAxe": true,
    },
    cooldown: 1,
  },

  craftPickaxe: {
    id: "craftPickaxe",
    label: "Pickaxe",
    show_when: {
      "buildings.workshops": 1,
      "tools.pickaxe": false,
    },
    cost: {
      "resources.wood": 10,
      "resources.stone": 20,
    },
    effects: {
      "resources.wood": -10,
      "resources.stone": -20,
      "tools.pickaxe": true,
      "story.seen.hasPickaxe": true,
      "story.seen.actionCraftPickaxe": true,
    },
    cooldown: 5,
  },

  mineIron: {
    id: "mineIron",
    label: "Mine Iron",
    show_when: {
      "tools.pickaxe": true,
    },
    cost: {
      "resources.torch": 10,
    },
    effects: {
      "resources.torch": -10,
      "resources.iron": "random(2,5)",
      "story.seen.hasIron": true,
    },
    cooldown: 8,
  },
};
