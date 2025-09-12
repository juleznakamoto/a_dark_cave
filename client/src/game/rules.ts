import { Action } from "@shared/schema";
import { GameState } from "@shared/schema";

// Utility function to get the next building level
const getNextBuildingLevel = (actionId: string, state: GameState): number => {
  if (actionId === "buildHut") {
    return (state.buildings.huts || 0) + 1;
  } else if (actionId === "buildLodge") {
    return (state.buildings.lodges || 0) + 1;
  } else if (actionId === "buildWorkshop") {
    return (state.buildings.workshops || 0) + 1;
  }
  return 1;
};

// Helper function to check requirements for both building and non-building actions
const checkRequirements = (
  requirements: any,
  state: GameState,
  action: Action,
): boolean => {
  if (action.building) {
    const level = getNextBuildingLevel(action.id, state);
    const levelRequirements = requirements[level];
    if (!levelRequirements) return false;
    requirements = levelRequirements;
  }

  return Object.entries(requirements).every(([path, expectedValue]) => {
    const pathParts = path.split(".");
    let current: any = state;

    for (const part of pathParts) {
      current = current?.[part];
    }

    if (typeof expectedValue === "boolean") {
      return current === expectedValue;
    }

    return current >= expectedValue;
  });
};

// Utility function to check if an action should be shown
export const shouldShowAction = (
  actionId: string,
  state: GameState,
): boolean => {
  const action = gameActions[actionId];
  if (!action?.show_when) return false;

  return checkRequirements(action.show_when, state, action);
};

// Utility function to check if requirements are met for an action
export const canExecuteAction = (
  actionId: string,
  state: GameState,
): boolean => {
  const action = gameActions[actionId];
  if (!action?.cost) return true;

  return checkRequirements(action.cost, state, action);
};

// Utility function to apply action effects
export const applyActionEffects = (
  actionId: string,
  state: GameState,
): Partial<GameState> => {
  const action = gameActions[actionId];
  if (!action?.effects) return {};

  const updates: any = {};

  let effects = action.effects;

  // For building actions, get the effects for the next level
  if (action.building) {
    const level = getNextBuildingLevel(actionId, state);
    effects = action.effects[level];
  }

  if (!effects) return {};

  for (const [path, effect] of Object.entries(effects)) {
    const pathParts = path.split(".");
    let current = updates;

    // Navigate/create the path
    for (let i = 0; i < pathParts.length - 1; i++) {
      if (!current[pathParts[i]]) {
        current[pathParts[i]] = {};
      }
      current = current[pathParts[i]];
    }

    const finalKey = pathParts[pathParts.length - 1];

    if (typeof effect === "string" && effect.startsWith("random(")) {
      // Parse random effect like "random(1,3)"
      const match = effect.match(/random\((\d+),(\d+)\)/);
      if (match) {
        const min = parseInt(match[1]);
        const max = parseInt(match[2]);
        let baseAmount = Math.floor(Math.random() * (max - min + 1)) + min;

        // Apply stone axe bonus for wood gathering
        if (finalKey === "wood" && state.tools.stone_axe) {
          baseAmount += Math.floor(Math.random() * 3) + 1; // +1-3 extra
        }

        current[finalKey] =
          (state.resources[finalKey as keyof typeof state.resources] || 0) +
          baseAmount;
      }
    } else if (typeof effect === "string" && effect.startsWith("chance(")) {
      // Parse probability effect like "chance(0.3,coal,1,2)" for 30% chance of 1-2 coal
      const match = effect.match(/chance\(([\d.]+),(\w+),(\d+),?(\d+)?\)/);
      if (match) {
        const probability = parseFloat(match[1]);
        const itemType = match[2];
        const minAmount = parseInt(match[3]);
        const maxAmount = match[4] ? parseInt(match[4]) : minAmount;

        // Roll for probability
        if (Math.random() < probability) {
          const amount = Math.floor(Math.random() * (maxAmount - minAmount + 1)) + minAmount;

          // Initialize resources if not exists
          if (!current.resources) current.resources = {};

          current.resources[itemType] = 
            (state.resources[itemType as keyof typeof state.resources] || 0) + amount;
        }
      }
    } else if (typeof effect === "number") {
      if (pathParts[0] === "resources") {
        current[finalKey] =
          (state.resources[finalKey as keyof typeof state.resources] || 0) +
          effect;
      } else {
        current[finalKey] = effect;
      }
    } else if (typeof effect === "boolean") {
      current[finalKey] = effect;
    }
  }

  return updates;
};

// Utility function to get cost text for actions
export const getCostText = (actionId: string, state?: GameState) => {
  const action = gameActions[actionId];
  if (!action?.cost) return "";

  let costs = action.cost;

  // For building actions, get the cost for the next level
  if (action.building && state) {
    const level = getNextBuildingLevel(actionId, state);
    costs = action.cost[level];
  }

  if (!costs || Object.keys(costs).length === 0) return "";

  const costText = Object.entries(costs)
    .map(([resource, amount]) => {
      // Extract the clean resource name from paths like "resources.wood"
      const resourceName = resource.includes(".")
        ? resource.split(".").pop()
        : resource;
      return `${amount} ${resourceName}`;
    })
    .join(", ");

  return costText ? ` (${costText})` : "";
};

export const gameActions: Record<string, Action> = {
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
      "story.seen.hasWood": true,
    },
    cost: {
      "resources.wood": 10,
    },
    effects: {
      "resources.wood": -10,
      "resources.torch": 1,
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
        "resources.stone": 25,
      },
    },
    effects: {
      1: {
        "resources.wood": -100,
        "resources.stone": -25,
        "buildings.workshops": 1,
      },
    },
    cooldown: 20,
  },

  exploreCave: {
    id: "exploreCave",
    label: "Explore Further",
    show_when: {
      "resources.torch": { ">": 0 },
    },
    cost: {
      "resources.torch": 1,
    },
    effects: {
      "resources.torch": -1,
      "resources.stone": "random(1,4)",
      "find_iron": "chance(0.25,iron,1,2)", // 25% chance to find 1-2 iron
      "find_sulphur": "chance(0.15,sulphur,1)", // 15% chance to find 1 sulphur
      "find_tarnished_amulet": "chance(0.05,tarnished_amulet,1)", // 5% chance to find rare amulet
      "story.seen.caveExplored": true,
    },
    cooldown: 6,
  },

  craftStoneAxe: {
    id: "craftStoneAxe",
    label: "StoneAxe",
    show_when: {
      "flags.caveExplored": true,
      "tools.stone_axe": false,
    },
    cost: {
      "resources.wood": 5,
      "resources.stone": 10,
    },
    effects: {
      "resources.wood": -5,
      "resources.stone": -10,
      "tools.stone_axe": true,
      "flags.villageUnlocked": true,
      "story.seen.hasStoneAxe": true,
      "story.seen.actionCraftStoneAxe": true,
    },
    cooldown: 1,
  },

  craftStonePickaxe: {
    id: "craftStonePickaxe",
    label: "Stone Pickaxe",
    show_when: {
      "buildings.workshops": 1,
      "tools.stone_pickaxe": false,
    },
    cost: {
      "resources.wood": 10,
      "resources.stone": 20,
    },
    effects: {
      "resources.wood": -10,
      "resources.stone": -20,
      "tools.stone_pickaxe": true,
      "story.seen.hasStonePickaxe": true,
      "story.seen.actionCraftStonePickaxe": true,
    },
    cooldown: 5,
  },

  mineIron: {
    id: "mineIron",
    label: "Mine Iron",
    show_when: {
      "tools.stone_pickaxe": true,
    },
    cost: {},
    effects: {
      "resources.iron": "random(1,2)",
      "find_coal": "chance(0.2,coal,1,2)", // 20% chance to find 1-2 coal
      "find_bones": "chance(0.1,bones,1)", // 10% chance to find 1 bone
    },
    cooldown: 4,
  },
  
  hunt: {
    id: "hunt",
    label: "Hunt",
    show_when: {
      "tools.spear": true,
    },
    cost: {},
    effects: {
      "resources.meat": "random(2,4)",
      "find_fur": "chance(0.4,fur,1,2)", // 40% chance to find 1-2 fur
      "find_bones": "chance(0.3,bones,1,3)", // 30% chance to find 1-3 bones
      "find_leather": "chance(0.2,leather,1)", // 20% chance to find 1 leather
    },
    cooldown: 8,
  },
};