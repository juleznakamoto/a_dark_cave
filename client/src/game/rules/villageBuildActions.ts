import { Action, GameState } from "@shared/schema";
import { ActionResult } from "@/game/actions";

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
        "buildings.quarry": 1,
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
        "resources.steel": 500,
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
        "resources.steel": 1000,
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
    statsEffects: {
      madness: -2,
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
    productionEffects: {
      hunter: {
        food: 5,
        fur: 4,
        bones: 4,
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
    productionEffects: {
      gatherer: {
        wood: 5,
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
    productionEffects: {
      gatherer: {
        stone: 5,
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
        "buildings.clerksHut": 1,
        "story.seen.hasClerksHut": true,
      },
    },
    cooldown: 30,
  },

  buildScriptorium: {
    id: "buildScriptorium",
    label: "Scriptorium",
    building: true,
    show_when: {
      1: {
        "buildings.stoneHut": 5,
        "buildings.clerksHut": 1,
        "buildings.scriptorium": 0,
      },
    },
    cost: {
      1: {
        "resources.stone": 2500,
        "resources.wood": 5000,
      },
    },
    effects: {
      1: {
        "buildings.scriptorium": 1,
        "story.seen.hasScriptorium": true,
      },
    },
    cooldown: 40,
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
    statsEffects: {
      madness: -5,
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
    statsEffects: {
      madness: -8,
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
        "resources.moonstone": 50,
      },
    },
    effects: {
      1: {
        "buildings.sanctum": 1,
        "story.seen.hasSanctum": true,
      },
    },
    statsEffects: {
      madness: -12,
    },
    cooldown: 80,
  },

  buildAlchemistHall: {
    id: "buildAlchemistHall",
    label: "Alchemist's Hall",
    building: true,
    show_when: {
      1: {
        "buildings.stoneHut": 2,
        "buildings.alchemistHall": 0,
      },
    },
    cost: {
      1: {
        "resources.stone": 2500,
        "resources.steel": 500,
      },
    },
    effects: {
      1: {
        "buildings.alchemistHall": 1,
        "story.seen.hasAlchemistHall": true,
        "story.seen.powderMakerUnlocked": true,
      },
    },
    cooldown: 30,
  },

  buildTradePost: {
    id: "buildTradePost",
    label: "Trade Post",
    building: true,
    show_when: {
      1: {
        "buildings.stoneHut": 1,
        "buildings.tradePost": 0,
      },
    },
    cost: {
      1: {
        "resources.wood": 2000,
        "resources.stone": 1000,
      },
    },
    effects: {
      1: {
        "buildings.tradePost": 1,
        "story.seen.hasTradePost": true,
      },
    },
    cooldown: 40,
  },

  buildBastion: {
    id: "buildBastion",
    label: "Bastion",
    building: true,
    show_when: {
      1: {
        "flags.portalBlasted": true,
        "buildings.bastion": 0,
      },
    },
    cost: {
      1: {
        "resources.stone": 5000,
        "resources.steel": 500,
      },
    },
    effects: {
      1: {
        "buildings.bastion": 1,
        "story.seen.hasBastion": true,
      },
    },
    cooldown: 60,
  },

  buildWatchtower: {
    id: "buildWatchtower",
    label: "Watchtower",
    building: true,
    show_when: {
      1: {
        "buildings.bastion": 1,
        "buildings.watchtower": 0,
      },
      2: {
        "buildings.watchtower": 1,
      },
      3: {
        "buildings.watchtower": 2,
      },
      4: {
        "buildings.watchtower": 3,
      },
    },
    cost: {
      1: {
        "resources.wood": 5000,
        "resources.stone": 2500,
        "resources.steel": 500,
      },
      2: {
        "resources.wood": 7500,
        "resources.stone": 5000,
        "resources.steel": 1000,
        "resources.iron": 2500,
      },
      3: {
        "resources.wood": 10000,
        "resources.stone": 7500,
        "resources.steel": 2000,
        "resources.obsidian": 500,
      },
      4: {
        "resources.wood": 15000,
        "resources.stone": 10000,
        "resources.steel": 3000,
        "resources.obsidian": 1000,
        "resources.adamant": 500,
      },
    },
    effects: {
      1: {
        "buildings.watchtower": 1,
        "story.seen.hasWatchtower": true,
      },
      2: {
        "buildings.watchtower": 1,
        "story.seen.hasGuardTower": true,
      },
      3: {
        "buildings.watchtower": 1,
        "story.seen.hasFortifiedTower": true,
      },
      4: {
        "buildings.watchtower": 1,
        "story.seen.hasCannonTower": true,
      },
    },
    cooldown: 60,
  },

  buildPalisades: {
    id: "buildPalisades",
    label: "Palisades",
    building: true,
    show_when: {
      1: {
        "flags.portalBlasted": true,
        "buildings.bastion": 1,
        "buildings.palisades": 0,
      },
      2: {
        "buildings.palisades": 1,
      },
      3: {
        "buildings.palisades": 2,
      },
      4: {
        "buildings.palisades": 3,
      },
    },
    cost: {
      1: {
        "resources.wood": 5000,
      },
      2: {
        "resources.wood": 7500,
        "resources.iron": 2500,
      },
      3: {
        "resources.stone": 5000,
      },
      4: {
        "resources.stone": 7500,
        "resources.steel": 2500,
      },
    },
    effects: {
      1: {
        "buildings.palisades": 1,
        "story.seen.hasWoodenPalisades": true,
      },
      2: {
        "buildings.palisades": 1,
        "story.seen.hasFortifiedPalisades": true,
      },
      3: {
        "buildings.palisades": 1,
        "story.seen.hasStoneWall": true,
      },
      4: {
        "buildings.palisades": 1,
        "story.seen.hasReinforcedWall": true,
      },
    },
    cooldown: 50,
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
        "buildings.tradePost": 1,
        "buildings.stoneHut": 2,
      },
      4: {
        "buildings.stoneHut": 3,
      },
      5: {
        "buildings.alchemistHall": 1,
        "buildings.stoneHut": 4,
      },
      6: {
        "buildings.stoneHut": 5,
      },
      7: {
        "buildings.shrine": 1,
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

  buildWizardTower: {
    id: "buildWizardTower",
    label: "Wizard Tower",
    building: true,
    show_when: {
      1: {
        "buildings.sanctum": 1,
        "buildings.bastion": 1,
        "buildings.wizardTower": 0,
        "story.seen.wizardArrives": true,
      },
    },
    cost: {
      1: {
        "resources.stone": 10000,
        "resources.steel": 5000,
        "resources.adamant": 2500,
      },
    },
    effects: {
      1: {
        "buildings.wizardTower": 1,
        "story.seen.hasWizardTower": true,
      },
    },
    cooldown: 120,
  },

  buildLonghouse: {
    id: "buildLonghouse",
    label: "Longhouse",
    building: true,
    show_when: {
      1: {
        "story.seen.longhouseUnlocked": true,
        "buildings.longhouse": 0,
      },
      2: {
        "buildings.longhouse": 1,
      },
    },
    cost: {
      1: {
        "resources.wood": 10000,
        "resources.stone": 5000,
      },
      2: {
        "resources.wood": 15000,
        "resources.stone": 7500,
      },
    },
    effects: {
      1: {
        "buildings.longhouse": 1,
      },
      2: {
        "buildings.longhouse": 1,
      },
    },
    cooldown: 60,
  },

  buildGrandBlacksmith: {
    id: "buildGrandBlacksmith",
    label: "Grand Blacksmith",
    building: true,
    show_when: {
      1: {
        "buildings.blacksmith": 1,
        "story.seen.wizardFrostglassSword": true,
        "buildings.grandBlacksmith": 0,
      },
    },
    cost: {
      1: {
        "resources.stone": 10000,
        "resources.steel": 5000,
        "resources.adamant": 500,
      },
    },
    effects: {
      1: {
        "buildings.grandBlacksmith": 1,
        "story.seen.hasGrandBlacksmith": true,
      },
    },
    cooldown: 120,
  },
};

// Action handlers
function handleBuildingConstruction(
  state: GameState,
  result: ActionResult,
  actionId: string,
  buildingType: keyof GameState["buildings"],
): ActionResult {
  const currentCount = state.buildings[buildingType] || 0;
  const level = currentCount + 1;
  const action = villageBuildActions[actionId];
  const actionCosts = action?.cost?.[level];
  const actionEffects = action?.effects?.[level];

  if (!actionEffects) {
    console.warn(`No effects found for action ${actionId} at level ${level}`);
    return result;
  }

  // Apply resource costs (negative changes)
  if (actionCosts) {
    const newResources = { ...state.resources };
    for (const [path, cost] of Object.entries(actionCosts)) {
      if (path.startsWith("resources.")) {
        const resource = path.split(".")[1] as keyof typeof newResources;
        newResources[resource] -= cost; // Subtract the cost
      }
    }
    result.stateUpdates.resources = newResources;
  }

  // Apply building effects
  for (const [path, effect] of Object.entries(actionEffects)) {
    if (path.startsWith("buildings.")) {
      const building = path.split(".")[1] as keyof GameState["buildings"];
      result.stateUpdates.buildings = {
        ...result.stateUpdates.buildings,
        [building]: (state.buildings[building] || 0) + effect,
      };
    }
  }

  return result;
}

export function handleBuildWoodenHut(
  state: GameState,
  result: ActionResult,
): ActionResult {
  const level = state.buildings.woodenHut + 1;
  const action = villageBuildActions.buildWoodenHut;
  const actionCosts = action?.cost?.[level];
  const actionEffects = action?.effects?.[level];

  if (!actionEffects) {
    console.warn(`No effects found for buildWoodenHut at level ${level}`);
    return result;
  }

  // Apply resource costs (negative changes)
  if (actionCosts) {
    const newResources = { ...state.resources };
    for (const [path, cost] of Object.entries(actionCosts)) {
      if (path.startsWith("resources.")) {
        const resource = path.split(".")[1] as keyof typeof newResources;
        newResources[resource] -= cost; // Subtract the cost
      }
    }
    result.stateUpdates.resources = newResources;
  }

  // Apply building effects
  result.stateUpdates.buildings = {
    ...state.buildings,
    woodenHut: state.buildings.woodenHut + 1,
  };

  // Add completion message for first wooden hut
  if (state.buildings.woodenHut === 0) {
    result.logEntries!.push({
      id: `first-hut-built-${Date.now()}`,
      message:
        "Your first wooden hut stands complete, a modest shelter against the darkness. The village begins to take shape.",
      timestamp: Date.now(),
      type: "system",
    });

    result.delayedEffects!.push(() => {
      // Stranger approaches logic will be handled by the caller
    });
  }

  return result;
}

export function handleBuildCabin(
  state: GameState,
  result: ActionResult,
): ActionResult {
  return handleBuildingConstruction(state, result, "buildCabin", "cabin");
}

export function handleBuildBlacksmith(
  state: GameState,
  result: ActionResult,
): ActionResult {
  const blacksmithResult = handleBuildingConstruction(
    state,
    result,
    "buildBlacksmith",
    "blacksmith",
  );

  // Add blacksmith completion message
  if (state.buildings.blacksmith === 0) {
    blacksmithResult.logEntries!.push({
      id: `blacksmith-built-${Date.now()}`,
      message:
        "The blacksmith's forge comes alive, its anvil ringing with the promise of stronger tools and weapons. The heart of industry beats in your village.",
      timestamp: Date.now(),
      type: "system",
    });
  }

  return blacksmithResult;
}

export function handleBuildShallowPit(
  state: GameState,
  result: ActionResult,
): ActionResult {
  return handleBuildingConstruction(
    state,
    result,
    "buildShallowPit",
    "shallowPit",
  );
}

export function handleBuildDeepeningPit(
  state: GameState,
  result: ActionResult,
): ActionResult {
  return handleBuildingConstruction(
    state,
    result,
    "buildDeepeningPit",
    "deepeningPit",
  );
}

export function handleBuildDeepPit(
  state: GameState,
  result: ActionResult,
): ActionResult {
  return handleBuildingConstruction(state, result, "buildDeepPit", "deepPit");
}

export function handleBuildBottomlessPit(
  state: GameState,
  result: ActionResult,
): ActionResult {
  const bottomlessPitResult = handleBuildingConstruction(
    state,
    result,
    "buildBottomlessPit",
    "bottomlessPit",
  );

  // Add moonstone discovery message
  if (state.buildings.bottomlessPit === 0) {
    bottomlessPitResult.logEntries!.push({
      id: `moonstone-discovered-${Date.now()}`,
      message:
        "As the workers dig in the depth of the pit, their tools strike something extraordinary. Deep in the earth, they uncover veins of moonstone - a pale, luminescent mineral that seems to contain immense energy.",
      timestamp: Date.now(),
      type: "system",
    });
  }

  return bottomlessPitResult;
}

export function handleBuildFoundry(
  state: GameState,
  result: ActionResult,
): ActionResult {
  const builtFoundry =
    state.buildings.foundry === 0 && !state.story.seen.foundryComplete;
  const resultWithBuilding = handleBuildingConstruction(
    state,
    result,
    "buildFoundry",
    "foundry",
  );

  if (builtFoundry) {
    resultWithBuilding.logEntries!.push({
      id: `foundry-complete-${Date.now()}`,
      message:
        "The foundry roars to life as fire and heat fuse the raw materials. The result is new matter of great strength and resilience.",
      timestamp: Date.now(),
      type: "system",
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

export function handleBuildAltar(
  state: GameState,
  result: ActionResult,
): ActionResult {
  const altarResult = handleBuildingConstruction(
    state,
    result,
    "buildAltar",
    "altar",
  );

  // Add altar completion message
  if (state.buildings.altar === 0) {
    altarResult.logEntries!.push({
      id: `altar-built-${Date.now()}`,
      message:
        "An altar rises at the forest's edge, raised to appease what dwells within.",
      timestamp: Date.now(),
      type: "system",
    });
  }

  return altarResult;
}

export function handleBuildGreatCabin(
  state: GameState,
  result: ActionResult,
): ActionResult {
  return handleBuildingConstruction(
    state,
    result,
    "buildGreatCabin",
    "greatCabin",
  );
}

export function handleBuildTimberMill(
  state: GameState,
  result: ActionResult,
): ActionResult {
  return handleBuildingConstruction(
    state,
    result,
    "buildTimberMill",
    "timberMill",
  );
}

export function handleBuildQuarry(
  state: GameState,
  result: ActionResult,
): ActionResult {
  return handleBuildingConstruction(state, result, "buildQuarry", "quarry");
}

export function handleBuildClerksHut(
  state: GameState,
  result: ActionResult,
): ActionResult {
  const clerksHutResult = handleBuildingConstruction(
    state,
    result,
    "buildClerksHut",
    "clerksHut",
  );

  // Add clerk's hut completion message
  if (state.buildings.clerksHut === 0) {
    clerksHutResult.logEntries!.push({
      id: `clerks-hut-built-${Date.now()}`,
      message:
        "A modest clerks hut is erected, its occupant ready to track the flow of village resources with meticulous care.",
      timestamp: Date.now(),
      type: "system",
    });
  }

  return clerksHutResult;
}

export function handleBuildScriptorium(
  state: GameState,
  result: ActionResult,
): ActionResult {
  const scriptoriumResult = handleBuildingConstruction(
    state,
    result,
    "buildScriptorium",
    "scriptorium",
  );

  // Add scriptorium completion message
  if (state.buildings.scriptorium === 0) {
    scriptoriumResult.logEntries!.push({
      id: `scriptorium-built-${Date.now()}`,
      message:
        "The Scriptorium stands complete, its walls lined with shelves of parchment and ink. Scribes labor to document every detail of village life - every resource gathered, every stat tracked with meticulous precision. Nothing escapes their vigilant record-keeping.",
      timestamp: Date.now(),
      type: "system",
    });
  }

  return scriptoriumResult;
}

export function handleBuildTannery(
  state: GameState,
  result: ActionResult,
): ActionResult {
  return handleBuildingConstruction(state, result, "buildTannery", "tannery");
}

export function handleBuildStoneHut(
  state: GameState,
  result: ActionResult,
): ActionResult {
  return handleBuildingConstruction(state, result, "buildStoneHut", "stoneHut");
}

export function handleBuildShrine(
  state: GameState,
  result: ActionResult,
): ActionResult {
  const shrineResult = handleBuildingConstruction(
    state,
    result,
    "buildShrine",
    "shrine",
  );

  // Add shrine completion message
  if (state.buildings.shrine === 0) {
    shrineResult.logEntries!.push({
      id: `shrine-built-${Date.now()}`,
      message:
        "A sacred shrine rises beside the altar, its presence bringing peace and focus to troubled minds.",
      timestamp: Date.now(),
      type: "system",
    });
  }

  return shrineResult;
}

export function handleBuildTemple(
  state: GameState,
  result: ActionResult,
): ActionResult {
  const templeResult = handleBuildingConstruction(
    state,
    result,
    "buildTemple",
    "temple",
  );

  // Add temple completion message
  if (state.buildings.temple === 0) {
    templeResult.logEntries!.push({
      id: `temple-built-${Date.now()}`,
      message:
        "A grand temple stands complete, its sacred halls echoing with whispered prayers that calm the tormented soul.",
      timestamp: Date.now(),
      type: "system",
    });
  }

  return templeResult;
}

export function handleBuildSanctum(
  state: GameState,
  result: ActionResult,
): ActionResult {
  const sanctumResult = handleBuildingConstruction(
    state,
    result,
    "buildSanctum",
    "sanctum",
  );

  // Add sanctum completion message
  if (state.buildings.sanctum === 0) {
    sanctumResult.logEntries!.push({
      id: `sanctum-built-${Date.now()}`,
      message:
        "The sanctum rises as a beacon of divine protection, its blessed aura driving away the darkest thoughts and fears.",
      timestamp: Date.now(),
      type: "system",
    });
  }

  return sanctumResult;
}

export function handleBuildAlchemistHall(
  state: GameState,
  result: ActionResult,
): ActionResult {
  const alchemistHallResult = handleBuildingConstruction(
    state,
    result,
    "buildAlchemistHall",
    "alchemistHall",
  );

  // Add alchemist hall completion message
  if (state.buildings.alchemistHall === 0) {
    alchemistHallResult.logEntries!.push({
      id: `alchemist-hall-built-${Date.now()}`,
      message:
       "The Alchemist’s Halls rise in twisting ascent, their chambers alive with bubbling crucibles and gleaming instruments of forgotten design. Within, the veils of transmutation whisper their secrets to those who dare to listen.",
      timestamp: Date.now(),
      type: "system",
    });
  }

  return alchemistHallResult;
}

export function handleBuildTradePost(
  state: GameState,
  result: ActionResult,
): ActionResult {
  const tradePostResult = handleBuildingConstruction(
    state,
    result,
    "buildTradePost",
    "tradePost",
  );

  // Add trade post completion message
  if (state.buildings.tradePost === 0) {
    tradePostResult.logEntries!.push({
      id: `trade-post-built-${Date.now()}`,
      message:
        "A trade post is built near the forest attracting tradesman who look to sell their goods for precious metals.",
      timestamp: Date.now(),
      type: "system",
    });
  }

  return tradePostResult;
}

export function handleBuildBastion(
  state: GameState,
  result: ActionResult,
): ActionResult {
  const bastionResult = handleBuildingConstruction(
    state,
    result,
    "buildBastion",
    "bastion",
  );

  // Add bastion completion message
  if (state.buildings.bastion === 0) {
    bastionResult.logEntries!.push({
      id: `bastion-built-${Date.now()}`,
      message:
        "The bastion rises like a stone mountain, its walls thick and imposing. You feel you need to prepare for something bad that will come from the depths of the cave.",
      timestamp: Date.now(),
      type: "system",
    });
    // Set the bastion unlocked flag and story flag
    bastionResult.stateUpdates.flags = {
      ...bastionResult.stateUpdates.flags,
      bastionUnlocked: true,
    };

    bastionResult.stateUpdates.story = {
      ...bastionResult.stateUpdates.story,
      seen: {
        ...bastionResult.stateUpdates.story?.seen,
        hasBastion: true,
      },
    };
  }

  return bastionResult;
}

export function handleBuildWatchtower(
  state: GameState,
  result: ActionResult,
): ActionResult {
  const watchtowerResult = handleBuildingConstruction(
    state,
    result,
    "buildWatchtower",
    "watchtower",
  );

  // Add watchtower completion message
  if (state.buildings.watchtower === 0) {
    watchtowerResult.logEntries!.push({
      id: `watchtower-built-${Date.now()}`,
      message:
        "The watchtower stretches high above the settlement, its vantage point commanding the horizon. It helps you see things coming earlier.",
      timestamp: Date.now(),
      type: "system",
    });
  }

  return watchtowerResult;
}

export function handleBuildPalisades(
  state: GameState,
  result: ActionResult,
): ActionResult {
  const palisadesResult = handleBuildingConstruction(
    state,
    result,
    "buildPalisades",
    "palisades",
  );

  // Add palisades completion message based on level
  const currentLevel = state.buildings.palisades || 0;
  const palisadesLabels = ["Wooden Palisades", "Fortified Palisades", "Stone Wall", "Reinforced Wall"];
  const palisadesMessages = [
    "Wooden palisades rise around your settlement, providing basic protection against incoming threats.",
    "Iron reinforcements strengthen the wooden walls, creating formidable fortified palisades.",
    "Stone walls replace the wooden defenses, forming an imposing barrier that speaks of permanence and strength.",
    "Steel reinforcements are added to the stone walls, creating an nearly impenetrable defensive barrier."
  ];

  if (currentLevel < palisadesLabels.length) {
    palisadesResult.logEntries!.push({
      id: `palisades-built-level-${currentLevel + 1}-${Date.now()}`,
      message: palisadesMessages[currentLevel],
      timestamp: Date.now(),
      type: "system",
    });
  }

  return palisadesResult;
}

export function handleBuildWizardTower(
  state: GameState,
  result: ActionResult,
): ActionResult {
  const wizardTowerResult = handleBuildingConstruction(
    state,
    result,
    "buildWizardTower",
    "wizardTower",
  );

  // Add wizard tower completion message
  if (state.buildings.wizardTower === 0) {
    wizardTowerResult.logEntries!.push({
      id: `wizard-tower-built-${Date.now()}`,
      message:
        "The Wizard Tower spirals into the sky, its crystalline spire crackling with arcane energy. The old wizard moves in with his collection of ancient tomes and mysterious artifacts, ready to aid your settlement with his powerful magic.",
      timestamp: Date.now(),
      type: "system",
    });
  }

  return wizardTowerResult;
}

export function handleBuildLonghouse(
  state: GameState,
  result: ActionResult,
): ActionResult {
  const longhouseResult = handleBuildingConstruction(
    state,
    result,
    "buildLonghouse",
    "longhouse",
  );

  // Add longhouse completion message
  const currentLevel = state.buildings.longhouse || 0;
  const longhouseLabels = ["First Longhouse", "Second Longhouse"];
  const longhouseMessages = [
    "The first longhouse rises - a massive wooden hall with thick timbers and a great hearth. This Nordic design can shelter many families under one sturdy roof.",
    "A second longhouse is completed, expanding your settlement's capacity to house even more villagers in the traditional Nordic style."
  ];

  if (currentLevel < longhouseLabels.length) {
    longhouseResult.logEntries!.push({
      id: `longhouse-built-level-${currentLevel + 1}-${Date.now()}`,
      message: longhouseMessages[currentLevel],
      timestamp: Date.now(),
      type: "system",
    });
  }

  return longhouseResult;
}

export function handleBuildGrandBlacksmith(
  state: GameState,
  result: ActionResult,
): ActionResult {
  const grandBlacksmithResult = handleBuildingConstruction(
    state,
    result,
    "buildGrandBlacksmith",
    "grandBlacksmith",
  );

  // Add grand blacksmith completion message
  if (state.buildings.grandBlacksmith === 0) {
    grandBlacksmithResult.logEntries!.push({
      id: `grand-blacksmith-built-${Date.now()}`,
      message:
        "The Grand Blacksmith rises, a massive forge capable of working with the strongest materials. Now possible to forge weapons of the strongest materials.",
      timestamp: Date.now(),
      type: "system",
    });
  }

  return grandBlacksmithResult;
}
