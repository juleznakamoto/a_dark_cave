import { GameState } from "@shared/schema";
import { LogEntry } from "@/game/rules/events";
import { gameActions } from "@/game/rules";
import { logger } from "@/lib/logger";
import { ActionResult } from "@/game/types";
import { applyActionCostsOnly } from "@/game/rules/actionEffects";
import {
  getBoneTotemsCost,
  getLeatherTotemsCost,
  getAnimalsCost,
  getHumansCost,
} from "@/game/rules/forestSacrificeActions";
import { killVillagers } from "@/game/stateHelpers";
// Import all handlers from the modular action files
import {
  handleLightFire,
  handleChopWood,
  handleExploreCave,
  handleVentureDeeper,
  handleDescendFurther,
  handleExploreRuins,
  handleExploreTemple,
  handleExploreCitadel,
  handleLowChamber,
  handleoccultistChamber,
  handleBlastPortal,
  handleEncounterBeyondPortal,
  handleExploreUndergroundLake,
  handleLureLakeCreature,
  handleHiddenLibrary,
} from "@/game/rules/caveExploreActions";

import {
  handleCraftTorches,
  handleCraftStoneAxe,
  handleCraftStonePickaxe,
  handleCraftIronAxe,
  handleCraftIronPickaxe,
  handleCraftSteelAxe,
  handleCraftSteelPickaxe,
  handleCraftObsidianAxe,
  handleCraftObsidianPickaxe,
  handleCraftAdamantAxe,
  handleCraftAdamantPickaxe,
  handleCraftIronLantern,
  handleCraftSteelLantern,
  handleCraftObsidianLantern,
  handleCraftAdamantLantern,
  handleCraftExplorerPack,
  handleCraftHunterCloak,
  handleCraftGrenadierBag,
  handleCraftHighpriestRobe,
  handleCraftLoggersGloves,
  handleCraftSacrificialTunic,
  handleCraftShadowBoots,
  handleCraftBlacksteelAxe,
  handleCraftBlacksteelPickaxe,
  handleCraftBlacksteelLantern,
  handleCraftBlacksteelArmor,
  handleCraftSkeletonKey,
} from "./rules/caveCraftTools";

import {
  handleCraftBoneTotems,
  handleCraftLeatherTotems,
  handleCraftEmberBomb,
  handleCraftAshfireBomb,
  handleCraftVoidBomb,
} from "@/game/rules/caveCraftResources";

import {
  handleCraftIronSword,
  handleCraftSteelSword,
  handleCraftObsidianSword,
  handleCraftAdamantSword,
  handleCraftCrudeBow,
  handleCraftHuntsmanBow,
  handleCraftLongBow,
  handleCraftWarBow,
  handleCraftMasterBow,
  handleCraftFrostglassSword,
  handleCraftArbalest,
  handleCraftNightshadeBow,
  handleCraftBloodstoneStaff,
  handleCraftStormglassHalberd,
  handleCraftAshenGreatshield,
  handleCraftBlacksteelSword,
  handleCraftBlacksteelBow,
} from "@/game/rules/caveCraftWeapons";

import {
  handleBuildWoodenHut,
  handleBuildCabin,
  handleBuildBlacksmith,
  handleBuildAdvancedBlacksmith,
  handleBuildShallowPit,
  handleBuildDeepeningPit,
  handleBuildDeepPit,
  handleBuildBottomlessPit,
  handleBuildFoundry,
  handleBuildPrimeFoundry,
  handleBuildAltar,
  handleBuildGreatCabin,
  handleBuildGrandHunterLodge,
  handleBuildTimberMill,
  handleBuildQuarry,
  handleBuildClerksHut,
  handleBuildScriptorium,
  handleBuildInkwardenAcademy,
  handleBuildTannery,
  handleBuildMasterTannery,
  handleBuildHighTannery,
  handleBuildStoneHut,
  handleBuildShrine,
  handleBuildTemple,
  handleBuildSanctum,
  handleBuildAlchemistHall,
  handleBuildTradePost,
  handleBuildGrandBazaar,
  handleBuildMerchantsGuild,
  handleBuildBastion,
  handleBuildWatchtower,
  handleBuildPalisades,
  handleBuildWizardTower,
  handleBuildLonghouse,
  handleBuildFurTents,
  handleBuildGrandBlacksmith,
  handleBuildFortifiedMoat,
  handleBuildChitinPlating,
  handleBuildTraps,
  handleBuildImprovedTraps,
  handleBuildBlackMonolith,
  handleBuildMasterworkFoundry,
  handleBuildDarkEstate,
  handleBuildBlackEstate,
  handleBuildPillarOfClarity,
  handleBuildBoneyard,
  handleBuildBoneTemple,
  handleBuildPaleCross,
  handleBuildStorageRoom,
  handleBuildWarehouse,
  handleBuildStockpile,
  handleBuildVillageWarehouse,
  handleBuildGrandRepository,
  handleBuildGreatVault,
  handleBuildHeartfire,
  handleBuildCoinhouse,
  handleBuildBank,
  handleBuildTreasury,
} from "./rules/villageBuildHandlers";

import {
  handleHunt,
  handleLayTrap,
  handleCastleRuins,
  handleHillGrave,
  handleSunkenTemple,
  handleSwampSanctuary,
  handlecollapsedTower,
  handleForestCave,
  handleBlackreachCanyon,
  handleSteelDelivery,
  handleRisingSmoke,
  handleBanditLair,
  handleCanyonBridge,
} from "@/game/rules/forestScoutActions";

import {
  handleBoneTotems,
  handleLeatherTotems,
  handleAnimals,
  handleHumans,
} from "@/game/rules/forestSacrificeActions";

import {
  handleTradeAction,
  handleForestSellAction,
} from "@/game/rules/forestTradeActions";

import {
  handleMineStone,
  handleMineIron,
  handleMineCoal,
  handleMineSulfur,
  handleMineObsidian,
  handleMineAdamant,
} from "@/game/rules/caveMineActions";

// Re-export for backward compatibility
export type { ActionResult } from "@/game/types";

/**
 * Deducts the costs for an action immediately (used when execution starts).
 * Handles both standard actions (via applyActionCostsOnly) and special cases
 * with dynamic costs (sacrifice actions).
 */
export function deductActionCosts(actionId: string, state: GameState): Partial<GameState> {
  if (actionId === "boneTotems") {
    const cost = getBoneTotemsCost(state);
    return {
      resources: { ...state.resources, bone_totem: (state.resources.bone_totem || 0) - cost },
    };
  }
  if (actionId === "leatherTotems") {
    const cost = getLeatherTotemsCost(state);
    return {
      resources: { ...state.resources, leather_totem: (state.resources.leather_totem || 0) - cost },
    };
  }
  if (actionId === "animals") {
    const cost = getAnimalsCost(state);
    return {
      resources: { ...state.resources, food: (state.resources.food || 0) - cost },
    };
  }
  if (actionId === "humans") {
    const cost = getHumansCost(state);
    return killVillagers(state, cost);
  }
  return applyActionCostsOnly(actionId, state);
}

export function executeGameAction(
  actionId: string,
  state: GameState,
): ActionResult {
  const cooldownDuration = getActionCooldown(actionId);
  const result: ActionResult = {
    stateUpdates: {
      cooldowns: {
        [actionId]: cooldownDuration,
      },
      story: {
        ...state.story,
        seen: {
          ...state.story.seen,
          [`action${actionId.charAt(0).toUpperCase() + actionId.slice(1)}`]:
            true,
        },
      },
    },
    logEntries: [],
    delayedEffects: [],
  };

  // Set initialCooldowns for all actions (needed for cooldown animation persistence)
  (result.stateUpdates as any).initialCooldowns = {
    [actionId]: cooldownDuration,
  };

  // Route to appropriate handler based on action ID
  switch (actionId) {
    // Special case for Feed Fire
    case "feedFire": {
      const currentLevel = state.heartfireState?.level || 0;
      if (currentLevel >= 5) {
        return result;
      }

      const woodCost = 50 * (currentLevel + 1);
      if (state.resources.wood < woodCost) {
        return result;
      }

      const newLevel = currentLevel + 1;
      result.stateUpdates = {
        ...result.stateUpdates,
        cooldowns: {
          ...result.stateUpdates.cooldowns,
          feedFire: 30, // 30 seconds
        },
        resources: {
          ...state.resources,
          wood: state.resources.wood - woodCost,
        },
        heartfireState: {
          level: newLevel,
          lastLevelDecrease: Date.now(),
        },
        story: {
          ...state.story,
          seen: {
            ...state.story?.seen,
            feedFireUsageCount: ((state.story?.seen?.feedFireUsageCount as number) || 0) + 1,
          },
        },
      };
      // Update initialCooldowns to match the custom cooldown
      (result.stateUpdates as any).initialCooldowns = {
        ...(result.stateUpdates as any).initialCooldowns,
        feedFire: 30,
      };
      return result;
    }

    // Cave Explore Actions
    case "testExplosion":
      // Test button does nothing, just triggers explosion effect
      return result;
    case "lightFire":
      return handleLightFire(state, result);
    case "chopWood":
      return handleChopWood(state, result);
    case "exploreCave":
      return handleExploreCave(state, result);
    case "ventureDeeper":
      return handleVentureDeeper(state, result);
    case "descendFurther":
      return handleDescendFurther(state, result);
    case "exploreRuins":
      return handleExploreRuins(state, result);
    case "exploreTemple":
      return handleExploreTemple(state, result);
    case "exploreCitadel":
      return handleExploreCitadel(state, result);
    case "lowChamber":
      return handleLowChamber(state, result);
    case "occultistChamber":
      return handleoccultistChamber(state, result);
    case "blastPortal":
      return handleBlastPortal(state, result);
    case "encounterBeyondPortal":
      return handleEncounterBeyondPortal(state, result);
    case "exploreUndergroundLake":
      return handleExploreUndergroundLake(state, result);
    case "lureLakeCreature":
      return handleLureLakeCreature(state, result);

    // Cave Craft Actions
    case "craftTorches":
      return handleCraftTorches(state, result);
    case "craftStoneAxe":
      return handleCraftStoneAxe(state, result);
    case "craftStonePickaxe":
      return handleCraftStonePickaxe(state, result);
    case "craftIronAxe":
      return handleCraftIronAxe(state, result);
    case "craftIronPickaxe":
      return handleCraftIronPickaxe(state, result);
    case "craftSteelAxe":
      return handleCraftSteelAxe(state, result);
    case "craftSteelPickaxe":
      return handleCraftSteelPickaxe(state, result);
    case "craftObsidianAxe":
      return handleCraftObsidianAxe(state, result);
    case "craftObsidianPickaxe":
      return handleCraftObsidianPickaxe(state, result);
    case "craftAdamantAxe":
      return handleCraftAdamantAxe(state, result);
    case "craftAdamantPickaxe":
      return handleCraftAdamantPickaxe(state, result);
    case "craftIronLantern":
      return handleCraftIronLantern(state, result);
    case "craftSteelLantern":
      return handleCraftSteelLantern(state, result);
    case "craftObsidianLantern":
      return handleCraftObsidianLantern(state, result);
    case "craftAdamantLantern":
      return handleCraftAdamantLantern(state, result);
    case "craftExplorerPack":
      return handleCraftExplorerPack(state, result);
    case "craftHunterCloak":
      return handleCraftHunterCloak(state, result);
    case "craftLoggersGloves":
      return handleCraftLoggersGloves(state, result);
    case "craftSacrificialTunic":
      return handleCraftSacrificialTunic(state, result);
    case "craftShadowBoots":
      return handleCraftShadowBoots(state, result);
    case "craftBlacksteelAxe":
      return handleCraftBlacksteelAxe(state, result);
    case "craftBlacksteelPickaxe":
      return handleCraftBlacksteelPickaxe(state, result);
    case "craftBlacksteelLantern":
      return handleCraftBlacksteelLantern(state, result);
    case "craftGrenadierBag":
      return handleCraftGrenadierBag(state, result);
    case "craftHighpriestRobe":
      return handleCraftHighpriestRobe(state, result);
    case "craftSkeletonKey":
      return handleCraftSkeletonKey(state, result);
    case "craftBoneTotems":
      return handleCraftBoneTotems(state, result);
    case "craftLeatherTotems":
      return handleCraftLeatherTotems(state, result);
    case "craftEmberBomb":
      return handleCraftEmberBomb(state, result);
    case "craftAshfireBomb":
      return handleCraftAshfireBomb(state, result);
    case "craftVoidBomb":
      return handleCraftVoidBomb(state, result);
    case "craftIronSword":
      return handleCraftIronSword(state, result);
    case "craftSteelSword":
      return handleCraftSteelSword(state, result);
    case "craftObsidianSword":
      return handleCraftObsidianSword(state, result);
    case "craftAdamantSword":
      return handleCraftAdamantSword(state, result);
    case "craftCrudeBow":
      return handleCraftCrudeBow(state, result);
    case "craftHuntsmanBow":
      return handleCraftHuntsmanBow(state, result);
    case "craftLongBow":
      return handleCraftLongBow(state, result);
    case "craftWarBow":
      return handleCraftWarBow(state, result);
    case "craftMasterBow":
      return handleCraftMasterBow(state, result);
    case "craftFrostglassSword":
      return handleCraftFrostglassSword(state, result);
    case "craftArbalest":
      return handleCraftArbalest(state, result);
    case "craftNightshadeBow":
      return handleCraftNightshadeBow(state, result);
    case "craftBloodstoneStaff":
      return handleCraftBloodstoneStaff(state, result);
    case "craftStormglassHalberd":
      return handleCraftStormglassHalberd(state, result);
    case "craftAshenGreatshield":
      return handleCraftAshenGreatshield(state, result);
    case "craftBlacksteelSword":
      return handleCraftBlacksteelSword(state, result);
    case "craftBlacksteelBow":
      return handleCraftBlacksteelBow(state, result);
    case "craftBlacksteelArmor":
      return handleCraftBlacksteelArmor(state, result);

    // Cave Mine Actions
    case "mineStone":
      return handleMineStone(state, result);
    case "mineIron":
      return handleMineIron(state, result);
    case "mineCoal":
      return handleMineCoal(state, result);
    case "mineSulfur":
      return handleMineSulfur(state, result);
    case "mineObsidian":
      return handleMineObsidian(state, result);
    case "mineAdamant":
      return handleMineAdamant(state, result);

    // Village Build Actions
    case "buildWoodenHut":
      return handleBuildWoodenHut(state, result);
    case "buildCabin":
      return handleBuildCabin(state, result);
    case "buildBlacksmith":
      return handleBuildBlacksmith(state, result);
    case "buildAdvancedBlacksmith":
      return handleBuildAdvancedBlacksmith(state, result);
    case "buildShallowPit":
      return handleBuildShallowPit(state, result);
    case "buildDeepeningPit":
      return handleBuildDeepeningPit(state, result);
    case "buildDeepPit":
      return handleBuildDeepPit(state, result);
    case "buildBottomlessPit":
      return handleBuildBottomlessPit(state, result);
    case "buildFoundry":
      return handleBuildFoundry(state, result);
    case "buildPrimeFoundry":
      return handleBuildPrimeFoundry(state, result);
    case "buildMasterworkFoundry":
      return handleBuildMasterworkFoundry(state, result);
    case "buildAltar":
      return handleBuildAltar(state, result);
    case "buildGreatCabin":
      return handleBuildGreatCabin(state, result);
    case "buildGrandHunterLodge":
      return handleBuildGrandHunterLodge(state, result);
    case "buildTimberMill":
      return handleBuildTimberMill(state, result);
    case "buildQuarry":
      return handleBuildQuarry(state, result);
    case "buildClerksHut":
      return handleBuildClerksHut(state, result);
    case "buildScriptorium":
      return handleBuildScriptorium(state, result);
    case "buildInkwardenAcademy":
      return handleBuildInkwardenAcademy(state, result);
    case "buildTannery":
      return handleBuildTannery(state, result);
    case "buildMasterTannery":
      return handleBuildMasterTannery(state, result);
    case "buildHighTannery":
      return handleBuildHighTannery(state, result);
    case "buildStoneHut":
      return handleBuildStoneHut(state, result);
    case "buildShrine":
      return handleBuildShrine(state, result);
    case "buildTemple":
      return handleBuildTemple(state, result);
    case "buildSanctum":
      return handleBuildSanctum(state, result);
    case "buildAlchemistHall":
      return handleBuildAlchemistHall(state, result);
    case "buildTradePost":
      return handleBuildTradePost(state, result);
    case "buildGrandBazaar":
      return handleBuildGrandBazaar(state, result);
    case "buildMerchantsGuild":
      return handleBuildMerchantsGuild(state, result);
    case "buildWizardTower":
      return handleBuildWizardTower(state, result);
    case "buildBastion":
      return handleBuildBastion(state, result);
    case "buildWatchtower":
      return handleBuildWatchtower(state, result);
    case "buildPalisades":
      return handleBuildPalisades(state, result);
    case "buildGrandBlacksmith":
      return handleBuildGrandBlacksmith(state, result);
    case "buildLonghouse":
      return handleBuildLonghouse(state, result);
    case "buildFurTents":
      return handleBuildFurTents(state, result);
    case "buildFortifiedMoat":
      return handleBuildFortifiedMoat(state, result);
    case "buildChitinPlating":
      return handleBuildChitinPlating(state, result);
    case "buildTraps":
      return handleBuildTraps(state, result);
    case "buildImprovedTraps":
      return handleBuildImprovedTraps(state, result);
    case "buildBlackMonolith":
      return handleBuildBlackMonolith(state, result);
    case "buildDarkEstate":
      return handleBuildDarkEstate(state, result);
    case "buildBlackEstate":
      return handleBuildBlackEstate(state, result);
    case "buildPillarOfClarity":
      return handleBuildPillarOfClarity(state, result);
    case "buildBoneyard":
      return handleBuildBoneyard(state, result);
    case "buildBoneTemple":
      return handleBuildBoneTemple(state, result);
    case "buildPaleCross":
      return handleBuildPaleCross(state, result);
    case "buildSupplyHut":
      return handleBuildStorageRoom(state, result);
    case "buildStorehouse":
      return handleBuildWarehouse(state, result);
    case "buildFortifiedStorehouse":
      return handleBuildStockpile(state, result);
    case "buildVillageWarehouse":
      return handleBuildVillageWarehouse(state, result);
    case "buildGrandRepository":
      return handleBuildGrandRepository(state, result);
    case "buildGreatVault":
      return handleBuildGreatVault(state, result);
    case "buildHeartfire":
      return handleBuildHeartfire(state, result);
    case "buildCoinhouse":
      return handleBuildCoinhouse(state, result);
    case "buildBank":
      return handleBuildBank(state, result);
    case "buildTreasury":
      return handleBuildTreasury(state, result);

    // Forest Scout Actions
    case "hunt":
      return handleHunt(state, result);
    case "layTrap":
      return handleLayTrap(state, result);
    case "castleRuins":
      return handleCastleRuins(state, result);
    case "hillGrave":
      return handleHillGrave(state, result);
    case "sunkenTemple":
      return handleSunkenTemple(state, result);
    case "swampSanctuary":
      return handleSwampSanctuary(state, result);
    case "collapsedTower":
      return handlecollapsedTower(state, result);
    case "forestCave":
      return handleForestCave(state, result);
    case "blackreachCanyon":
      return handleBlackreachCanyon(state, result);
    case "hiddenLibrary":
      return handleHiddenLibrary(state, result);
    case "steelDelivery":
      return handleSteelDelivery(state, result);
    case "risingSmoke":
      return handleRisingSmoke(state, result);
    case "banditLair":
      return handleBanditLair(state, result);
    case "canyonBridge":
      return handleCanyonBridge(state, result);

    // Forest Sacrifice Actions
    case "boneTotems":
      return handleBoneTotems(state, result);
    case "leatherTotems":
      return handleLeatherTotems(state, result);
    case "animals":
      return handleAnimals(state, result);
    case "humans":
      return handleHumans(state, result);

    // Forest Trade Actions
    case "tradeGoldForFood":
    case "tradeGoldForWood":
    case "tradeGoldForStone":
    case "tradeGoldForLeather":
    case "tradeGoldForSteel":
    case "tradeGoldForObsidian":
    case "tradeGoldForAdamant":
    case "tradeGoldForBlacksteel":
    case "tradeGoldForTorch":
    case "tradeSilverForGold":
    case "tradeGoldForEmberBomb":
    case "tradeGoldForAshfireBomb":
    case "tradeGoldForVoidBomb":
      return handleTradeAction(actionId, state, result);
    case "sellLeatherBatch":
    case "sellSteelBatch":
    case "sellBlacksteelBatch":
      return handleForestSellAction(actionId, state, result);

    case "healRestlessKnight":
      return {
        stateUpdates: {
          cooldowns: { healRestlessKnight: 0 },
          story: {
            ...state.story,
            seen: {
              ...state.story.seen,
              restlessKnightWounded: false,
            },
          },
        },
        logEntries: [],
        delayedEffects: [],
      };

    case "healElderWizard":
      return {
        stateUpdates: {
          cooldowns: { healElderWizard: 0 },
          story: {
            ...state.story,
            seen: {
              ...state.story.seen,
              elderWizardWounded: false,
            },
          },
        },
        logEntries: [],
        delayedEffects: [],
      };

    case "repairBastion":
      return {
        stateUpdates: {
          cooldowns: { repairBastion: 0 },
          story: {
            ...state.story,
            seen: {
              ...state.story.seen,
              bastionDamaged: false,
            },
          },
        },
        logEntries: [],
        delayedEffects: [],
      };

    case "repairWatchtower":
      return {
        stateUpdates: {
          cooldowns: { repairWatchtower: 0 },
          story: {
            ...state.story,
            seen: {
              ...state.story.seen,
              watchtowerDamaged: false,
            },
          },
        },
        logEntries: [],
        delayedEffects: [],
      };

    case "repairPalisades":
      return {
        stateUpdates: {
          cooldowns: { repairPalisades: 0 },
          story: {
            ...state.story,
            seen: {
              ...state.story.seen,
              palisadesDamaged: false,
            },
          },
        },
        logEntries: [],
        delayedEffects: [],
      };

    default:
      logger.warn(`No handler found for action: ${actionId}`);
      return result;
  }
}

// Helper function to get action cooldown from game rules
function getActionCooldown(actionId: string): number {
  const action = gameActions[actionId];
  return action?.cooldown || 0;
}