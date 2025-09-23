import { GameState } from '@shared/schema';
import { LogEntry } from '@/game/events';
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
  handleAlchemistChamber,
} from '@/game/rules/caveExploreActions';

import {
  handleBuildTorch,
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
  handleCraftBoneTotem,
  handleCraftIronSword,
  handleCraftSteelSword,
  handleCraftObsidianSword,
  handleCraftAdamantSword,
  handleCraftCrudeBow,
  handleCraftHuntsmanBow,
  handleCraftLongBow,
  handleCraftWarBow,
  handleCraftMasterBow,
} from '@/game/rules/caveCraftActions';

import {
  handleMineIron,
  handleMineCoal,
  handleMineSulfur,
  handleMineObsidian,
  handleMineAdamant,
} from '@/game/rules/caveMineActions';

import {
  handleBuildWoodenHut,
  handleBuildCabin,
  handleBuildBlacksmith,
  handleBuildShallowPit,
  handleBuildDeepeningPit,
  handleBuildDeepPit,
  handleBuildBottomlessPit,
  handleBuildFoundry,
  handleBuildShrine,
  handleBuildGreatCabin,
  handleBuildTimberMill,
  handleBuildQuarry,
  handleBuildClerksHut,
  handleBuildStoneHut,
} from '@/game/rules/villageBuildActions';

import {
  handleHunt,
  handleLayTrap,
} from '@/game/rules/forestScoutActions';

import {
  handleBoneTotems,
} from '@/game/rules/forestSacrificeActions';

export interface ActionResult {
  stateUpdates: Partial<GameState>;
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
    case 'alchemistChamber':
      return handleAlchemistChamber(state, result);

    // Cave Craft Actions
    case 'buildTorch':
      return handleBuildTorch(state, result);
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
    case 'craftBoneTotem':
      return handleCraftBoneTotem(state, result);
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

    // Cave Mine Actions
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
    case 'buildShrine':
      return handleBuildShrine(state, result);
    case 'buildGreatCabin':
      return handleBuildGreatCabin(state, result);
    case 'buildTimberMill':
      return handleBuildTimberMill(state, result);
    case 'buildQuarry':
      return handleBuildQuarry(state, result);
    case 'buildClerksHut':
      return handleBuildClerksHut(state, result);
    case 'buildStoneHut':
      return handleBuildStoneHut(state, result);

    // Forest Scout Actions
    case 'hunt':
      return handleHunt(state, result);
    case 'layTrap':
      return handleLayTrap(state, result);

    // Forest Sacrifice Actions
    case 'boneTotems':
      return handleBoneTotems(state, result);

    default:
      return result;
  }
}

// Helper function to get action cooldown (you may need to import this from the rules)
function getActionCooldown(actionId: string): number {
  // This would need to be imported from your game rules or calculated
  // For now, returning a default value
  return 1;
}