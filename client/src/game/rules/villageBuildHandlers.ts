import { GameState } from "@shared/schema";
import { ActionResult } from "@/game/actions";
import { logger } from "@/lib/logger";
import { villageBuildActions } from "./villageBuildActions";
import { getAdjustedCost } from "./index";

// Utility function to handle building construction
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
    return result;
  }

  // Ensure result.stateUpdates exists
  if (!result.stateUpdates) {
    result.stateUpdates = {};
  }

  // Apply resource costs (negative changes)
  if (actionCosts) {
    const newResources = { ...state.resources };

    for (const [path, cost] of Object.entries(actionCosts) as [
      string,
      number,
    ][]) {
      if (path.startsWith("resources.")) {
        const resource = path.split(".")[1] as keyof typeof newResources;
        // Use centralized cost adjustment (same as tooltip and effects)
        const adjustedCost = getAdjustedCost(actionId, cost, true, state);
        newResources[resource] -=
          typeof adjustedCost === "number" ? adjustedCost : cost;
      }
    }

    result.stateUpdates.resources = newResources;
  }

  // Apply building effects
  for (const [path, effect] of Object.entries(actionEffects) as [
    string,
    number,
  ][]) {
    if (path.startsWith("buildings.")) {
      const building = path.split(".")[1] as keyof GameState["buildings"];
      const currentBuildingCount = state.buildings[building] || 0;
      const newCount = currentBuildingCount + effect;

      if (!result.stateUpdates) {
        result.stateUpdates = {};
      }

      const newBuildings = {
        ...state.buildings,
        ...(result.stateUpdates.buildings || {}),
        [building]: newCount,
      };

      result.stateUpdates.buildings = newBuildings;
    } else if (path.startsWith("story.seen.")) {
      const storyKey = path.split(".").slice(2).join(".");

      if (!result.stateUpdates.story) {
        result.stateUpdates.story = {
          ...state.story,
          seen: { ...state.story.seen },
        };
      }
      if (!result.stateUpdates.story.seen) {
        result.stateUpdates.story.seen = { ...state.story.seen };
      }
      result.stateUpdates.story.seen = {
        ...result.stateUpdates.story.seen,
        [storyKey]: effect as boolean,
      };
    } else if (path.startsWith("stats.")) {
      const stat = path.split(".")[1] as keyof GameState["stats"];
      const currentStatValue = state.stats[stat] || 0;
      const newStatValue = currentStatValue + (effect as number);

      if (!result.stateUpdates.stats) {
        result.stateUpdates.stats = {
          ...state.stats,
        };
      }
      result.stateUpdates.stats[stat] = newStatValue;
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
    logger.warn(`No effects found for buildWoodenHut at level ${level}`);
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
        "The first wooden hut stands complete, this could be the start of something great.",
      timestamp: Date.now(),
      type: "system",
    });
  }

  // Add village growth message when 10th wooden hut is built
  if (state.buildings.woodenHut === 9 && state.buildings.stoneHut === 0) {
    result.logEntries!.push({
      id: `village-growth-${Date.now()}`,
      message:
        "The village grows quickly. Perhaps stone houses could shelter more villagers.",
      timestamp: Date.now(),
      type: "system",
    });

    result.stateUpdates.story = {
      ...result.stateUpdates.story,
      seen: {
        ...result.stateUpdates.story?.seen,
        villageGrowthSuggestion: true,
      },
    };
  }

  // Check for city growth milestone after building
  const newWoodenHutCount = state.buildings.woodenHut + 1;
  const stoneHutCount = state.buildings.stoneHut || 0;
  const longhouseCount = state.buildings.longhouse || 0;

  // Trigger city growth message when reaching 10 wooden, 10 stone, and 5 longhouses
  if (
    newWoodenHutCount === 10 &&
    stoneHutCount >= 10 &&
    longhouseCount >= 5 &&
    !state.story.seen.cityGrowthMilestone
  ) {
    result.logEntries!.push({
      id: `city-growth-milestone-${Date.now()}`,
      message:
        "The city has grown into a bustling metropolis, alive with trade, industry, and the promise of brighter days.",
      timestamp: Date.now(),
      type: "system",
    });

    // Mark milestone as seen
    if (!result.stateUpdates.story) {
      result.stateUpdates.story = {
        ...state.story,
        seen: { ...state.story.seen },
      };
    }
    if (!result.stateUpdates.story.seen) {
      result.stateUpdates.story.seen = { ...state.story.seen };
    }
    result.stateUpdates.story.seen.cityGrowthMilestone = true;
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
        "The blacksmith's forge comes alive. The heart of industry now beats in the village.",
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
        "In the depth of the pit, the workers discover something extraordinary. They uncover veins of moonstone - a luminescent mineral containing immense energy.",
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
  const foundryResult = handleBuildingConstruction(
    state,
    result,
    "buildFoundry",
    "foundry",
  );

  // Add completion message for first foundry
  if (state.buildings.foundry === 0) {
    foundryResult.logEntries!.push({
      id: `foundry-complete-${Date.now()}`,
      message: "The foundry roars to life as fire and heat fuse raw materials.",
      timestamp: Date.now(),
      type: "system",
    });
  }

  return foundryResult;
}

export function handleBuildPrimeFoundry(
  state: GameState,
  result: ActionResult,
): ActionResult {
  const primeFoundryResult = handleBuildingConstruction(
    state,
    result,
    "buildPrimeFoundry",
    "primeFoundry",
  );
  return primeFoundryResult;
}

export function handleBuildMasterworkFoundry(
  state: GameState,
  result: ActionResult,
): ActionResult {
  const masterworkFoundryResult = handleBuildingConstruction(
    state,
    result,
    "buildMasterworkFoundry",
    "masterworkFoundry",
  );

  // Add masterwork foundry completion message
  if (state.buildings.masterworkFoundry === 0) {
    masterworkFoundryResult.logEntries!.push({
      id: `masterwork-foundry-built-${Date.now()}`,
      message:
        "The Masterwork Foundry stands complete, a monument to supreme metallurgical mastery. Within its fires, blacksteel can be forged, nearly unbreakable, but very difficult to produce.",
      timestamp: Date.now(),
      type: "system",
    });
  }

  return masterworkFoundryResult;
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

export function handleBuildGrandHunterLodge(
  state: GameState,
  result: ActionResult,
): ActionResult {
  const grandHunterLodgeResult = handleBuildingConstruction(
    state,
    result,
    "buildGrandHunterLodge",
    "grandHunterLodge",
  );

  // Add grand hunter lodge completion message
  if (state.buildings.grandHunterLodge === 0) {
    grandHunterLodgeResult.logEntries!.push({
      id: `grand-hunter-lodge-built-${Date.now()}`,
      message:
        "The Grand Hunter Lodge is complete, a magnificent structure where master hunters gather.",
      timestamp: Date.now(),
      type: "system",
    });
  }

  return grandHunterLodgeResult;
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
        "A clerks hut is erected, its occupant ready to track the flow of  resources with meticulous care.",
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
        "The Scriptorium stands complete. Every detail of village life now gets tracked with meticulous precision.",
      timestamp: Date.now(),
      type: "system",
    });
  }

  return scriptoriumResult;
}

export function handleBuildInkwardenAcademy(
  state: GameState,
  result: ActionResult,
): ActionResult {
  const inkwardenAcademyResult = handleBuildingConstruction(
    state,
    result,
    "buildInkwardenAcademy",
    "inkwardenAcademy",
  );

  // Add Inkwarden Academy completion message
  if (state.buildings.inkwardenAcademy === 0) {
    inkwardenAcademyResult.logEntries!.push({
      id: `inkwarden-academy-built-${Date.now()}`,
      message:
        "The Inkwarden Academy rises as a monument to knowledge. Its halls filled with the wisdom of ages, and every resource is now tracked with unparalleled precision.",
      timestamp: Date.now(),
      type: "system",
    });
  }

  return inkwardenAcademyResult;
}

export function handleBuildTannery(
  state: GameState,
  result: ActionResult,
): ActionResult {
  const tanneryResult = handleBuildingConstruction(
    state,
    result,
    "buildTannery",
    "tannery",
  );

  // Add tannery completion message
  if (state.buildings.tannery === 0) {
    tanneryResult.logEntries!.push({
      id: `tannery-built-${Date.now()}`,
      message:
        "The Tannery is complete. The smell of curing leather fills the air as craftsmen begin their work.",
      timestamp: Date.now(),
      type: "system",
    });
  }

  return tanneryResult;
}

export function handleBuildMasterTannery(
  state: GameState,
  result: ActionResult,
): ActionResult {
  const masterTanneryResult = handleBuildingConstruction(
    state,
    result,
    "buildMasterTannery",
    "masterTannery",
  );

  return masterTanneryResult;
}

export function handleBuildHighTannery(
  state: GameState,
  result: ActionResult,
): ActionResult {
  const highTanneryResult = handleBuildingConstruction(
    state,
    result,
    "buildHighTannery",
    "highTannery",
  );

  // Add high tannery completion message
  if (state.buildings.highTannery === 0) {
    highTanneryResult.logEntries!.push({
      id: `high-tannery-built-${Date.now()}`,
      message:
        "The High Tannery is built, a grand workshop where expert craftsmen transform hides into the finest leather.",
      timestamp: Date.now(),
      type: "system",
    });
  }

  return highTanneryResult;
}

export function handleBuildStoneHut(
  state: GameState,
  result: ActionResult,
): ActionResult {
  const stoneHutResult = handleBuildingConstruction(
    state,
    result,
    "buildStoneHut",
    "stoneHut",
  );

  // Check for city growth milestone after building
  const newStoneHutCount = (state.buildings.stoneHut || 0) + 1;
  const woodenHutCount = state.buildings.woodenHut || 0;
  const longhouseCount = state.buildings.longhouse || 0;

  // Trigger city growth message when reaching 10 wooden, 10 stone, and 5 longhouses
  if (
    newStoneHutCount === 10 &&
    woodenHutCount >= 10 &&
    longhouseCount >= 5 &&
    !state.story.seen.cityGrowthMilestone
  ) {
    stoneHutResult.logEntries!.push({
      id: `city-growth-milestone-${Date.now()}`,
      message:
        "The city has grown into a bustling metropolis, alive with trade, industry, and the promise of brighter days.",
      timestamp: Date.now(),
      type: "system",
    });

    // Mark milestone as seen
    if (!stoneHutResult.stateUpdates.story) {
      stoneHutResult.stateUpdates.story = {
        ...state.story,
        seen: { ...state.story.seen },
      };
    }
    if (!stoneHutResult.stateUpdates.story.seen) {
      stoneHutResult.stateUpdates.story.seen = { ...state.story.seen };
    }
    stoneHutResult.stateUpdates.story.seen.cityGrowthMilestone = true;
  }

  return stoneHutResult;
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

  // Add longhouse completion message only for the first one
  if (state.buildings.longhouse === 0) {
    longhouseResult.logEntries!.push({
      id: `longhouse-built-${Date.now()}`,
      message:
        "The first longhouse rises, a massive wooden hall with thick timbers and lots of space.",
      timestamp: Date.now(),
      type: "system",
    });
  }

  // Check for city growth milestone after building
  const newLonghouseCount = (state.buildings.longhouse || 0) + 1;
  const woodenHutCount = state.buildings.woodenHut || 0;
  const stoneHutCount = state.buildings.stoneHut || 0;

  // Trigger city growth message when reaching 10 wooden, 10 stone, and 5 longhouses
  if (
    newLonghouseCount === 5 &&
    woodenHutCount >= 10 &&
    stoneHutCount >= 10 &&
    !state.story.seen.cityGrowthMilestone
  ) {
    longhouseResult.logEntries!.push({
      id: `city-growth-milestone-${Date.now()}`,
      message:
        "The city has grown into a bustling metropolis, alive with trade, industry, and the promise of brighter days.",
      timestamp: Date.now(),
      type: "system",
    });

    // Mark milestone as seen
    if (!longhouseResult.stateUpdates.story) {
      longhouseResult.stateUpdates.story = {
        ...state.story,
        seen: { ...state.story.seen },
      };
    }
    if (!longhouseResult.stateUpdates.story.seen) {
      longhouseResult.stateUpdates.story.seen = { ...state.story.seen };
    }
    longhouseResult.stateUpdates.story.seen.cityGrowthMilestone = true;
  }

  return longhouseResult;
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
        "The Alchemist's Halls stand tall, their chambers filled with bubbling crucibles and gleaming instruments of forgotten craft.",
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
        "A trade post is built near the forest attracting tradesman who look to sell their goods for gold.",
      timestamp: Date.now(),
      type: "system",
    });
  }

  return tradePostResult;
}

export function handleBuildGrandBazaar(
  state: GameState,
  result: ActionResult,
): ActionResult {
  const grandBazaarResult = handleBuildingConstruction(
    state,
    result,
    "buildGrandBazaar",
    "grandBazaar",
  );

  // Add grand bazaar completion message
  if (state.buildings.grandBazaar === 0) {
    grandBazaarResult.logEntries!.push({
      id: `grand-bazaar-built-${Date.now()}`,
      message:
        "The Grand Bazaar rises, a sprawling marketplace where merchants from distant lands gather to trade goods.",
      timestamp: Date.now(),
      type: "system",
    });
  }

  return grandBazaarResult;
}

export function handleBuildMerchantsGuild(
  state: GameState,
  result: ActionResult,
): ActionResult {
  const merchantsGuildResult = handleBuildingConstruction(
    state,
    result,
    "buildMerchantsGuild",
    "merchantsGuild",
  );

  // Add merchants guild completion message
  if (state.buildings.merchantsGuild === 0) {
    merchantsGuildResult.logEntries!.push({
      id: `merchants-guild-built-${Date.now()}`,
      message:
        "The Merchants Guild stands complete, a powerful organization that controls all trade routes and brings unprecedented wealth to your settlement.",
      timestamp: Date.now(),
      type: "system",
    });
  }

  return merchantsGuildResult;
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
        "The bastion rises like a mountain of stone, its walls thick and unyielding. A promise of protection against whatever stirs in the depths below.",
      timestamp: Date.now(),
      type: "system",
    });
    // Set the bastion unlocked flag and story flag
    bastionResult.stateUpdates.flags = {
      ...bastionResult.stateUpdates.flags,
      bastionUnlocked: true,
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
        "The Wizard Tower spirals into the sky, crackling with arcane energy. The wizard moves in with his collection of ancient tomes and mysterious artifacts.",
      timestamp: Date.now(),
      type: "system",
    });
  }

  return wizardTowerResult;
}

export function handleBuildAdvancedBlacksmith(
  state: GameState,
  result: ActionResult,
): ActionResult {
  const advancedBlacksmithResult = handleBuildingConstruction(
    state,
    result,
    "buildAdvancedBlacksmith",
    "advancedBlacksmith",
  );

  return advancedBlacksmithResult;
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

  return grandBlacksmithResult;
}

export function handleBuildFortifiedMoat(
  state: GameState,
  result: ActionResult,
): ActionResult {
  const fortifiedMoatResult = handleBuildingConstruction(
    state,
    result,
    "buildFortifiedMoat",
    "fortifiedMoat",
  );

  // Add fortified moat completion message
  if (state.buildings.fortifiedMoat === 0) {
    fortifiedMoatResult.logEntries!.push({
      id: `fortified-moat-built-${Date.now()}`,
      message:
        "A deep moat now surrounds the settlement, its waters dark and treacherous. No enemy will cross it easily.",
      timestamp: Date.now(),
      type: "system",
    });
  }

  return fortifiedMoatResult;
}

export function handleBuildTraps(
  state: GameState,
  result: ActionResult,
): ActionResult {
  const trapsResult = handleBuildingConstruction(
    state,
    result,
    "buildTraps",
    "traps",
  );

  // Add traps completion message
  if (state.buildings.traps === 0) {
    trapsResult.logEntries!.push({
      id: `traps-built-${Date.now()}`,
      message:
        "Traps have been laid around the village perimeter. Hidden pits, snares, and sharpened stakes await any who dare attack.",
      timestamp: Date.now(),
      type: "system",
    });
  }

  return trapsResult;
}

export function handleBuildBlackMonolith(
  state: GameState,
  result: ActionResult,
): ActionResult {
  const monolithResult = handleBuildingConstruction(
    state,
    result,
    "buildBlackMonolith",
    "blackMonolith",
  );

  // Add monolith completion message
  if (state.buildings.blackMonolith === 0) {
    monolithResult.logEntries!.push({
      id: `black-monolith-built-${Date.now()}`,
      message:
        "The Black Monolith rises from the village center, a towering monument of dark adamant. Its surface seems to drink in the light, and the villagers gather around it with reverence and fear.",
      timestamp: Date.now(),
      type: "system",
    });
  }

  return monolithResult;
}

export function handleBuildDarkEstate(
  state: GameState,
  result: ActionResult,
): ActionResult {
  const estateResult = handleBuildingConstruction(
    state,
    result,
    "buildDarkEstate",
    "darkEstate",
  );

  // Add dark estate completion message
  if (state.buildings.darkEstate === 0) {
    estateResult.logEntries!.push({
      id: `dark-estate-built-${Date.now()}`,
      message:
        "The Dark Estate stands has been built on a small hill near the village, offering solitude and refuge.",
      timestamp: Date.now(),
      type: "system",
    });
  }

  return estateResult;
}

export function handleBuildChitinPlating(
  state: GameState,
  result: ActionResult,
): ActionResult {
  const constructionResult = handleBuildingConstruction(
    state,
    result,
    "buildChitinPlating",
    "chitinPlating",
  );

  // Take away the chitin plates relic
  if (!constructionResult.stateUpdates) {
    constructionResult.stateUpdates = {};
  }

  constructionResult.stateUpdates.relics = {
    ...state.relics,
    ...(constructionResult.stateUpdates.relics || {}),
    chitin_plates: false,
  };

  // Add completion message
  constructionResult.logEntries!.push({
    id: `chitin-plating-built-${Date.now()}`,
    message:
      "The fortifications are reinforced with chitin plating. The village's defense is significantly increased.",
    timestamp: Date.now(),
    type: "system",
  });

  return constructionResult;
}

export function handleBuildPillarOfClarity(
  state: GameState,
  result: ActionResult,
): ActionResult {
  const pillarOfClarityResult = handleBuildingConstruction(
    state,
    result,
    "buildPillarOfClarity",
    "pillarOfClarity",
  );

  // Add pillar of clarity completion message
  if (state.buildings.pillarOfClarity === 0) {
    pillarOfClarityResult.logEntries!.push({
      id: `pillar-of-clarity-built-${Date.now()}`,
      message:
        "The Pillar of Clarity rises, a shimmering obelisk that seems to hum with ancient power. Its presence brings a sense of calm and focus to those nearby.",
      timestamp: Date.now(),
      type: "system",
    });
  }

  return pillarOfClarityResult;
}

export function handleBuildBoneTemple(
  state: GameState,
  result: ActionResult,
): ActionResult {
  const boneTempleResult = handleBuildingConstruction(
    state,
    result,
    "buildBoneTemple",
    "boneTemple",
  );

  // Add bone temple completion message
  if (state.buildings.boneTemple === 0) {
    boneTempleResult.logEntries!.push({
      id: `bone-temple-built-${Date.now()}`,
      message:
        "The Bone Temple rises from thousands of carefully arranged bones, a monument to the old gods. Its presence emanates dark power, and the villagers approach it with reverence and fear.",
      timestamp: Date.now(),
      type: "system",
    });
  }

  return boneTempleResult;
}

export function handleBuildStorageRoom(
  state: GameState,
  result: ActionResult,
): ActionResult {
  const storageRoomResult = handleBuildingConstruction(
    state,
    result,
    "buildSupplyHut",
    "supplyHut",
  );

  return storageRoomResult;
}

export function handleBuildWarehouse(
  state: GameState,
  result: ActionResult,
): ActionResult {
  const warehouseResult = handleBuildingConstruction(
    state,
    result,
    "buildStorehouse",
    "storehouse",
  );

  return warehouseResult;
}

export function handleBuildStockpile(
  state: GameState,
  result: ActionResult,
): ActionResult {
  const stockpileResult = handleBuildingConstruction(
    state,
    result,
    "buildFortifiedStorehouse",
    "fortifiedStorehouse",
  );

  return stockpileResult;
}

export function handleBuildVillageWarehouse(
  state: GameState,
  result: ActionResult,
): ActionResult {
  const warehouseResult = handleBuildingConstruction(
    state,
    result,
    "buildVillageWarehouse",
    "villageWarehouse",
  );

  return warehouseResult;
}

export function handleBuildGrandRepository(
  state: GameState,
  result: ActionResult,
): ActionResult {
  const grandRepositoryResult = handleBuildingConstruction(
    state,
    result,
    "buildGrandRepository",
    "grandRepository",
  );

  return grandRepositoryResult;
}

export function handleBuildGreatVault(
  state: GameState,
  result: ActionResult,
): ActionResult {
  const greatVaultResult = handleBuildingConstruction(
    state,
    result,
    "buildGreatVault",
    "greatVault",
  );

  return greatVaultResult;
}