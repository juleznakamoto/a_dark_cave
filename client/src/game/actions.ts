import { GameState } from '@shared/schema';
import { LogEntry } from '@/game/rules/events';
import { gameActions } from '@/game/rules';
// Import all handlers from the modular action files
import {
  handleLightFire,
  handleGatherWood,
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
} from '@/game/rules/caveExploreActions';

import {
  handleCraftTorch,
  handleCraftTorches,
  handleCraftTorches3,
  handleCraftTorches4,
  handleCraftTorches5,
  handleCraftTorches10,
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
} from '@/game/rules/caveCraftTools';

import {
  handleCraftBoneTotem,
  handleCraftBoneTotems2,
  handleCraftBoneTotems3,
  handleCraftBoneTotems5,
  handleCraftEmberBomb,
  handleCraftCinderflameBomb,
} from '@/game/rules/caveCraftResources';

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
} from '@/game/rules/caveCraftWeapons';

import {
  handleBuildWoodenHut,
  handleBuildCabin,
  handleBuildBlacksmith,
  handleBuildShallowPit,
  handleBuildDeepeningPit,
  handleBuildDeepPit,
  handleBuildBottomlessPit,
  handleBuildFoundry,
  handleBuildAltar,
  handleBuildGreatCabin,
  handleBuildTimberMill,
  handleBuildQuarry,
  handleBuildClerksHut,
  handleBuildScriptorium,
  handleBuildTannery,
  handleBuildMasterTannery,
  handleBuildStoneHut,
  handleBuildShrine,
  handleBuildTemple,
  handleBuildSanctum,
  handleBuildAlchemistHall,
  handleBuildTradePost,
  handleBuildMerchantsGuild,
  handleBuildBastion,
  handleBuildWatchtower,
  handleBuildPalisades,
  handleBuildWizardTower,
  handleBuildLonghouse,
  handleBuildGrandBlacksmith,
} from "./rules/villageBuildActions";

import {
  handleHunt,
  handleLayTrap,
  handleCastleRuins,
  handleHillGrave,
  handleSunkenTemple,
} from '@/game/rules/forestScoutActions';

import {
  handleBoneTotems,
} from '@/game/rules/forestSacrificeActions';

import {
  handleTradeGoldForFood,
  handleTradeGoldForWood,
  handleTradeGoldForStone,
  handleTradeGoldForSteel,
  handleTradeGoldForObsidian,
  handleTradeGoldForAdamant,
  handleTradeGoldForTorch,
  handleTradeSilverForGold,
} from '@/game/rules/forestTradeActions';

import {
  handleMineStone,
  handleMineIron,
  handleMineCoal,
  handleMineSulfur,
  handleMineObsidian,
  handleMineAdamant,
} from '@/game/rules/caveMineActions';

export interface ActionResult {
  stateUpdates: Partial<GameState> & {
    _logMessage?: string;
  };
  logEntries?: LogEntry[];
  delayedEffects?: Array<() => void>;
}

export function executeGameAction(actionId: string, state: GameState): ActionResult {
  const result: ActionResult = {
    stateUpdates: {
      cooldowns: { ...state.cooldowns, [actionId]: getActionCooldown(actionId) },
      story: {
        ...state.story,
        seen: {
          ...state.story.seen,
          [`action${actionId.charAt(0).toUpperCase() + actionId.slice(1)}`]: true
        }
      }
    },
    logEntries: [],
    delayedEffects: []
  };

  // Route to appropriate handler based on action ID
  switch (actionId) {
    // Cave Explore Actions
    case 'lightFire':
      return handleLightFire(state, result);
    case 'gatherWood':
      return handleGatherWood(state, result);
    case 'exploreCave':
      return handleExploreCave(state, result);
    case 'ventureDeeper':
      return handleVentureDeeper(state, result);
    case 'descendFurther':
      return handleDescendFurther(state, result);
    case 'exploreRuins':
      return handleExploreRuins(state, result);
    case 'exploreTemple':
      return handleExploreTemple(state, result);
    case 'exploreCitadel':
      return handleExploreCitadel(state, result);
    case 'lowChamber':
      return handleLowChamber(state, result);
    case 'occultistChamber':
      return handleoccultistChamber(state, result);
    case 'blastPortal':
      return handleBlastPortal(state, result);
    case 'encounterBeyondPortal':
      return handleEncounterBeyondPortal(state, result);

    // Cave Craft Actions
    case 'craftTorch':
      return handleCraftTorch(state, result);
    case 'craftTorches':
      return handleCraftTorches(state, result);
    case 'craftTorches3':
      return handleCraftTorches3(state, result);
    case 'craftTorches4':
      return handleCraftTorches4(state, result);
    case 'craftTorches5':
      return handleCraftTorches5(state, result);
    case 'craftTorches10':
      return handleCraftTorches10(state, result);
    case 'craftStoneAxe':
      return handleCraftStoneAxe(state, result);
    case 'craftStonePickaxe':
      return handleCraftStonePickaxe(state, result);
    case 'craftIronAxe':
      return handleCraftIronAxe(state, result);
    case 'craftIronPickaxe':
      return handleCraftIronPickaxe(state, result);
    case 'craftSteelAxe':
      return handleCraftSteelAxe(state, result);
    case 'craftSteelPickaxe':
      return handleCraftSteelPickaxe(state, result);
    case 'craftObsidianAxe':
      return handleCraftObsidianAxe(state, result);
    case 'craftObsidianPickaxe':
      return handleCraftObsidianPickaxe(state, result);
    case 'craftAdamantAxe':
      return handleCraftAdamantAxe(state, result);
    case 'craftAdamantPickaxe':
      return handleCraftAdamantPickaxe(state, result);
    case 'craftIronLantern':
      return handleCraftIronLantern(state, result);
    case 'craftSteelLantern':
      return handleCraftSteelLantern(state, result);
    case 'craftObsidianLantern':
      return handleCraftObsidianLantern(state, result);
    case 'craftAdamantLantern':
      return handleCraftAdamantLantern(state, result);
    case 'craftExplorerPack':
      return handleCraftExplorerPack(state, result);
    case 'craftHunterCloak':
      return handleCraftHunterCloak(state, result);
    case 'craftLoggersGloves':
      return handleCraftLoggersGloves(state, result);
    case 'craftGrenadierBag':
      return handleCraftGrenadierBag(state, result);
    case 'craftHighpriestRobe':
      return handleCraftHighpriestRobe(state, result);
    case 'craftBoneTotem':
      return handleCraftBoneTotem(state, result);
    case 'craftBoneTotems2':
      return handleCraftBoneTotems2(state, result);
    case 'craftBoneTotems3':
      return handleCraftBoneTotems3(state, result);
    case 'craftBoneTotems5':
      return handleCraftBoneTotems5(state, result);
    case 'craftEmberBomb':
      return handleCraftEmberBomb(state, result);
    case 'craftCinderflameBomb':
      return handleCraftCinderflameBomb(state, result);
    case 'craftIronSword':
      return handleCraftIronSword(state, result);
    case 'craftSteelSword':
      return handleCraftSteelSword(state, result);
    case 'craftObsidianSword':
      return handleCraftObsidianSword(state, result);
    case 'craftAdamantSword':
      return handleCraftAdamantSword(state, result);
    case 'craftCrudeBow':
      return handleCraftCrudeBow(state, result);
    case 'craftHuntsmanBow':
      return handleCraftHuntsmanBow(state, result);
    case 'craftLongBow':
      return handleCraftLongBow(state, result);
    case 'craftWarBow':
      return handleCraftWarBow(state, result);
    case 'craftMasterBow':
      return handleCraftMasterBow(state, result);
    case 'craftFrostglassSword':
      return handleCraftFrostglassSword(state, result);
    case 'craftArbalest':
      return handleCraftArbalest(state, result);
    case 'craftNightshadeBow':
      return handleCraftNightshadeBow(state, result);
    case 'craftBloodstoneStaff':
      return handleCraftBloodstoneStaff(state, result);

    // Cave Mine Actions
    case 'mineStone':
      return handleMineStone(state, result);
    case 'mineIron':
      return handleMineIron(state, result);
    case 'mineCoal':
      return handleMineCoal(state, result);
    case 'mineSulfur':
      return handleMineSulfur(state, result);
    case 'mineObsidian':
      return handleMineObsidian(state, result);
    case 'mineAdamant':
      return handleMineAdamant(state, result);

    // Village Build Actions
    case 'buildWoodenHut':
      return handleBuildWoodenHut(state, result);
    case 'buildCabin':
      return handleBuildCabin(state, result);
    case 'buildBlacksmith':
      return handleBuildBlacksmith(state, result);
    case 'buildShallowPit':
      return handleBuildShallowPit(state, result);
    case 'buildDeepeningPit':
      return handleBuildDeepeningPit(state, result);
    case 'buildDeepPit':
      return handleBuildDeepPit(state, result);
    case 'buildBottomlessPit':
      return handleBuildBottomlessPit(state, result);
    case 'buildFoundry':
      return handleBuildFoundry(state, result);
    case 'buildPrimeFoundry':
      return handleBuildPrimeFoundry(state, result);
    case 'buildAltar':
      return handleBuildAltar(state, result);
    case 'buildGreatCabin':
      return handleBuildGreatCabin(state, result);
    case 'buildTimberMill':
      return handleBuildTimberMill(state, result);
    case 'buildQuarry':
      return handleBuildQuarry(state, result);
    case 'buildClerksHut':
      return handleBuildClerksHut(state, result);
    case 'buildScriptorium':
      return handleBuildScriptorium(state, result);
    case 'buildTannery':
      return handleBuildTannery(state, result);
    case 'buildMasterTannery':
      return handleBuildMasterTannery(state, result);
    case 'buildStoneHut':
      return handleBuildStoneHut(state, result);
    case 'buildShrine':
      return handleBuildShrine(state, result);
    case 'buildTemple':
      return handleBuildTemple(state, result);
    case 'buildSanctum':
      return handleBuildSanctum(state, result);
    case 'buildAlchemistHall':
      return handleBuildAlchemistHall(state, result);
    case 'buildTradePost':
      return handleBuildTradePost(state, result);
    case 'buildMerchantsGuild':
      return handleBuildMerchantsGuild(state, result);
    case 'buildWizardTower':
      return handleBuildWizardTower(state, result);
    case 'buildBastion':
      return handleBuildBastion(state, result);
    case 'buildWatchtower':
      return handleBuildWatchtower(state, result);
    case 'buildPalisades':
      return handleBuildPalisades(state, result);
    case 'buildGrandBlacksmith':
      return handleBuildGrandBlacksmith(state, result);
    case 'buildLonghouse':
      return handleBuildLonghouse(state, result);

    // Forest Scout Actions
    case 'hunt':
      return handleHunt(state, result);
    case 'layTrap':
      return handleLayTrap(state, result);
    case 'castleRuins':
      return handleCastleRuins(state, result);
    case 'hillGrave':
      return handleHillGrave(state, result);
    case 'sunkenTemple':
      return handleSunkenTemple(state, result);

    // Forest Sacrifice Actions
    case 'boneTotems':
      return handleBoneTotems(state, result);

    // Forest Trade Actions
    case 'tradeGoldForFood':
      return handleTradeGoldForFood(state, result);
    case 'tradeGoldForWood':
      return handleTradeGoldForWood(state, result);
    case 'tradeGoldForStone':
      return handleTradeGoldForStone(state, result);
    case 'tradeGoldForSteel':
      return handleTradeGoldForSteel(state, result);
    case 'tradeGoldForObsidian':
      return handleTradeGoldForObsidian(state, result);
    case 'tradeGoldForAdamant':
      return handleTradeGoldForAdamant(state, result);
    case 'tradeGoldForTorch':
      return handleTradeGoldForTorch(state, result);
    case 'tradeSilverForGold':
      return handleTradeSilverForGold(state, result);

    default:
      return result;
  }
}

// Helper function to get action cooldown from game rules
function getActionCooldown(actionId: string): number {
  const action = gameActions[actionId];
  return action?.cooldown || 0;
}