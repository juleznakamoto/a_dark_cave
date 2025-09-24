import { Action, GameState } from "@shared/schema";
import { ActionResult } from '@/game/actions';
import { gameActions, applyActionEffects } from '@/game/rules';

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
        "buildings.altar": 1,
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
      10: {
        "resources.wood": 4000,
      },
    },
    effects: {
      1: {
        "buildings.woodenHut": 1,
      },
      2: {
        "buildings.woodenHut": 1,
      },
      3: {
        "buildings.woodenHut": 1,
      },
      4: {
        "buildings.woodenHut": 1,
      },
      5: {
        "buildings.woodenHut": 1,
      },
      6: {
        "buildings.woodenHut": 1,
      },
      7: {
        "buildings.woodenHut": 1,
      },
      8: {
        "buildings.woodenHut": 1,
      },
      9: {
        "buildings.woodenHut": 1,
      },
      10: {
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
        "buildings.woodenHut": 2,
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
        "buildings.foundry": 1,
      },
    },
    cooldown: 20,
  },

  buildAltar: {
    id: "buildAltar",
    label: "Altar",
    building: true,
    show_when: {
      1: {
        "flags.forestUnlocked": true,
        "buildings.altar": 0,
        "tools.steel_axe": true,
      },
    },
    cost: {
      1: {
        "resources.wood": 500,
        "resources.stone": 500,
        "resources.bones": 500,
        "resources.silver": 25,
      },
    },
    effects: {
      1: {
        "buildings.altar": 1,
        "story.seen.hasAltar": true,
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
        "buildings.woodenHut": 8,
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
        "buildings.woodenHut": 8,
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
        "buildings.deepeningPit": 1,
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
        "buildings.clerksHut": 1,
        "story.seen.hasClerksHut": true,
      },
    },
    cooldown: 30,
  },

  buildTannery: {
    id: "buildTannery",
    label: "Tannery",
    building: true,
    show_when: {
      1: {
        "buildings.woodenHut": 6,
        "buildings.tannery": 0,
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
        "buildings.tannery": 1,
        "story.seen.hasTannery": true,
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
        "buildings.woodenHut": 9,
        "buildings.altar": 1,
        "buildings.shrine": 0,
      },
    },
    cost: {
      1: {
        "resources.wood": 2000,
        "resources.stone": 1000,
        "resources.silver": 50,
        "resources.gold": 25,
        "resources.obsidian": 50,
      },
    },
    effects: {
      1: {
        "buildings.shrine": 1,
        "story.seen.hasShrine": true,
      },
    },
    cooldown: 40,
  },

  buildTemple: {
    id: "buildTemple",
    label: "Temple",
    building: true,
    show_when: {
      1: {
        "buildings.stoneHut": 4,
        "buildings.shrine": 1,
        "buildings.temple": 0,
      },
    },
    cost: {
      1: {
        "resources.stone": 5000,
        "resources.gold": 100,
        "resources.silver": 200,
        "resources.obsidian": 500,
        "resources.adamant": 250,
      },
    },
    effects: {
      1: {
        "buildings.temple": 1,
        "story.seen.hasTemple": true,
      },
    },
    cooldown: 60,
  },

  buildSanctum: {
    id: "buildSanctum",
    label: "Sanctum",
    building: true,
    show_when: {
      1: {
        "buildings.stoneHut": 8,
        "buildings.temple": 1,
        "buildings.sanctum": 0,
      },
    },
    cost: {
      1: {
        "resources.stone": 10000,
        "resources.gold": 250,
        "resources.silver": 500,
        "resources.obsidian": 1000,
        "resources.adamant": 500,
        "resources.bloodstone": 50,
      },
    },
    effects: {
      1: {
        "buildings.sanctum": 1,
        "story.seen.hasSanctum": true,
      },
    },
    cooldown: 80,
  },

  buildStoneHut: {
    id: "buildStoneHut",
    label: "Stone Hut",
    building: true,
    show_when: {
      1: {
        "buildings.woodenHut": 10,
        "buildings.stoneHut": 0,
      },
      2: {
        "buildings.stoneHut": 1,
      },
      3: {
        "buildings.stoneHut": 2,
      },
      4: {
        "buildings.stoneHut": 3,
      },
      5: {
        "buildings.stoneHut": 4,
      },
      6: {
        "buildings.stoneHut": 5,
      },
      7: {
        "buildings.stoneHut": 6,
      },
      8: {
        "buildings.stoneHut": 7,
      },
      9: {
        "buildings.stoneHut": 8,
      },
      10: {
        "buildings.stoneHut": 9,
      },
    },
    cost: {
      1: {
        "resources.stone": 1000,
      },
      2: {
        "resources.stone": 1500,
      },
      3: {
        "resources.stone": 2000,
      },
      4: {
        "resources.stone": 2500,
      },
      5: {
        "resources.stone": 3000,
      },
      6: {
        "resources.stone": 3500,
      },
      7: {
        "resources.stone": 4000,
      },
      8: {
        "resources.stone": 4500,
      },
      9: {
        "resources.stone": 5000,
      },
      10: {
        "resources.stone": 5500,
      },
    },
    effects: {
      1: {
        "buildings.stoneHut": 1,
      },
      2: {
        "buildings.stoneHut": 1,
      },
      3: {
        "buildings.stoneHut": 1,
      },
      4: {
        "buildings.stoneHut": 1,
      },
      5: {
        "buildings.stoneHut": 1,
      },
      6: {
        "buildings.stoneHut": 1,
      },
      7: {
        "buildings.stoneHut": 1,
      },
      8: {
        "buildings.stoneHut": 1,
      },
      9: {
        "buildings.stoneHut": 1,
      },
      10: {
        "buildings.stoneHut": 1,
      },
    },
    cooldown: 15,
  },
};

// Action handlers
function handleBuildingConstruction(
  state: GameState,
  result: ActionResult,
  actionId: string,
  buildingType: keyof GameState['buildings']
): ActionResult {
  const level = state.buildings[buildingType] + 1;
  const actionEffects = gameActions[actionId].effects[level];
  const newResources = { ...state.resources };

  for (const [path, effect] of Object.entries(actionEffects)) {
    if (path.startsWith('resources.')) {
      const resource = path.split('.')[1] as keyof typeof newResources;
      newResources[resource] += effect;
    }
  }

  result.stateUpdates.resources = newResources;
  result.stateUpdates.buildings = {
    ...state.buildings,
    [buildingType]: state.buildings[buildingType] + 1
  };

  return result;
}

export function handleBuildWoodenHut(state: GameState, result: ActionResult): ActionResult {
  const level = state.buildings.woodenHut + 1;
  const actionEffects = gameActions.buildWoodenHut.effects[level];
  const newResources = { ...state.resources };

  for (const [path, effect] of Object.entries(actionEffects)) {
    if (path.startsWith('resources.')) {
      const resource = path.split('.')[1] as keyof typeof newResources;
      newResources[resource] += effect;
    }
  }

  result.stateUpdates.resources = newResources;
  result.stateUpdates.buildings = {
    ...state.buildings,
    woodenHut: state.buildings.woodenHut + 1
  };

  if (state.buildings.woodenHut === 0) {
    result.delayedEffects!.push(() => {
      // Stranger approaches logic will be handled by the caller
    });
  }

  return result;
}

export function handleBuildCabin(state: GameState, result: ActionResult): ActionResult {
  return handleBuildingConstruction(state, result, 'buildCabin', 'cabin');
}

export function handleBuildBlacksmith(state: GameState, result: ActionResult): ActionResult {
  return handleBuildingConstruction(state, result, 'buildBlacksmith', 'blacksmith');
}

export function handleBuildShallowPit(state: GameState, result: ActionResult): ActionResult {
  return handleBuildingConstruction(state, result, 'buildShallowPit', 'shallowPit');
}

export function handleBuildDeepeningPit(state: GameState, result: ActionResult): ActionResult {
  return handleBuildingConstruction(state, result, 'buildDeepeningPit', 'deepeningPit');
}

export function handleBuildDeepPit(state: GameState, result: ActionResult): ActionResult {
  return handleBuildingConstruction(state, result, 'buildDeepPit', 'deepPit');
}

export function handleBuildBottomlessPit(state: GameState, result: ActionResult): ActionResult {
  return handleBuildingConstruction(state, result, 'buildBottomlessPit', 'bottomlessPit');
}

export function handleBuildFoundry(state: GameState, result: ActionResult): ActionResult {
  const builtFoundry = state.buildings.foundry === 0 && !state.story.seen.foundryComplete;
  const resultWithBuilding = handleBuildingConstruction(state, result, 'buildFoundry', 'foundry');

  if (builtFoundry) {
    resultWithBuilding.logEntries!.push({
      id: `foundry-complete-${Date.now()}`,
      message: 'The foundry roars to life as fire and heat fuse the raw materials. The result is new matter of great strength and resilience.',
      timestamp: Date.now(),
      type: 'system',
    });
    resultWithBuilding.stateUpdates.story = {
      ...state.story,
      seen: {
        ...state.story.seen,
        foundryComplete: true,
      },
    };
  }
  return resultWithBuilding;
}

export function handleBuildAltar(state: GameState, result: ActionResult): ActionResult {
  const altarResult = handleBuildingConstruction(state, result, 'buildAltar', 'altar');

  // Add altar completion message
  if (state.buildings.altar === 0) {
    altarResult.logEntries!.push({
      id: `altar-built-${Date.now()}`,
      message: "An altar rises at the forest's edge, raised to appease what dwells within.",
      timestamp: Date.now(),
      type: 'system',
    });
  }

  return altarResult;
}

export function handleBuildGreatCabin(state: GameState, result: ActionResult): ActionResult {
  return handleBuildingConstruction(state, result, 'buildGreatCabin', 'greatCabin');
}

export function handleBuildTimberMill(state: GameState, result: ActionResult): ActionResult {
  return handleBuildingConstruction(state, result, 'buildTimberMill', 'timberMill');
}

export function handleBuildQuarry(state: GameState, result: ActionResult): ActionResult {
  return handleBuildingConstruction(state, result, 'buildQuarry', 'quarry');
}

export function handleBuildClerksHut(state: GameState, result: ActionResult): ActionResult {
  return handleBuildingConstruction(state, result, 'buildClerksHut', 'clerksHut');
}

export function handleBuildTannery(state: GameState, result: ActionResult): ActionResult {
  return handleBuildingConstruction(state, result, 'buildTannery', 'tannery');
}

export function handleBuildStoneHut(state: GameState, result: ActionResult): ActionResult {
  return handleBuildingConstruction(state, result, 'buildStoneHut', 'stoneHut');
}

export function handleBuildShrine(state: GameState, result: ActionResult): ActionResult {
  const shrineResult = handleBuildingConstruction(state, result, 'buildShrine', 'shrine');

  // Add shrine completion message
  if (state.buildings.shrine === 0) {
    shrineResult.logEntries!.push({
      id: `shrine-built-${Date.now()}`,
      message: "A sacred shrine rises beside the altar, its presence bringing peace and focus to troubled minds.",
      timestamp: Date.now(),
      type: 'system',
    });
  }

  return shrineResult;
}

export function handleBuildTemple(state: GameState, result: ActionResult): ActionResult {
  const templeResult = handleBuildingConstruction(state, result, 'buildTemple', 'temple');

  // Add temple completion message
  if (state.buildings.temple === 0) {
    templeResult.logEntries!.push({
      id: `temple-built-${Date.now()}`,
      message: "A grand temple stands complete, its sacred halls echoing with whispered prayers that calm the tormented soul.",
      timestamp: Date.now(),
      type: 'system',
    });
  }

  return templeResult;
}

export function handleBuildSanctum(state: GameState, result: ActionResult): ActionResult {
  const sanctumResult = handleBuildingConstruction(state, result, 'buildSanctum', 'sanctum');

  // Add sanctum completion message
  if (state.buildings.sanctum === 0) {
    sanctumResult.logEntries!.push({
      id: `sanctum-built-${Date.now()}`,
      message: "The sanctum rises as a beacon of divine protection, its blessed aura driving away the darkest thoughts and fears.",
      timestamp: Date.now(),
      type: 'system',
    });
  }

  return sanctumResult;
}