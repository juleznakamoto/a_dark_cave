import { GameState } from '@shared/schema';
import { gameActions, applyActionEffects } from '@/game/rules';
import { getActionBonuses, getTotalLuck } from '@/game/rules/effects';
import { LogEntry } from '@/game/events';
import { killVillagers } from '@/game/stateHelpers';

export interface ActionResult {
  stateUpdates: Partial<GameState>;
  logEntries?: LogEntry[];
  delayedEffects?: Array<() => void>;
}

export function executeGameAction(actionId: string, state: GameState): ActionResult {
  const action = gameActions[actionId];
  if (!action) return { stateUpdates: {} };

  const result: ActionResult = {
    stateUpdates: {
      cooldowns: { ...state.cooldowns, [actionId]: action.cooldown },
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

  switch (actionId) {
    case 'lightFire':
      return handleLightFire(state, result);
    case 'gatherWood':
      return handleGatherWood(state, result);
    case 'buildTorch':
      return handleBuildTorch(state, result);
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
    case 'exploreCave':
      return handleExploreCave(state, result);
    case 'craftStoneAxe':
      return handleCraftStoneAxe(state, result);
    case 'craftStonePickaxe':
      return handleCraftStonePickaxe(state, result);
    case 'craftIronAxe':
      return handleCraftIronAxe(state, result);
    case 'craftIronPickaxe':
      return handleCraftIronPickaxe(state, result);
    case 'mineIron':
      return handleMineIron(state, result);
    case 'mineCoal':
      return handleMineCoal(state, result);
    case 'ventureDeeper':
      return handleVentureDeeper(state, result);
    case 'hunt':
      return handleHunt(state, result);
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
    case 'craftIronSword':
      return handleCraftIronSword(state, result);
    case 'craftSteelSword':
      return handleCraftSteelSword(state, result);
    case 'craftObsidianSword':
      return handleCraftObsidianSword(state, result);
    case 'craftAdamantSword':
      return handleCraftAdamantSword(state, result);
    case 'craftIronLantern':
      return handleCraftIronLantern(state, result);
    case 'craftSteelLantern':
      return handleCraftSteelLantern(state, result);
    case 'craftObsidianLantern':
      return handleCraftObsidianLantern(state, result);
    case 'craftAdamantLantern':
      return handleCraftAdamantLantern(state, result);
    case 'descendFurther':
      return handleDescendFurther(state, result);
    case 'exploreRuins':
      return handleExploreRuins(state, result);
    case 'exploreTemple':
      return handleExploreTemple(state, result);
    case 'exploreCitadel':
      return handleExploreCitadel(state, result);
    case 'mineSulfur':
      return handleMineSulfur(state, result);
    case 'mineObsidian':
      return handleMineObsidian(state, result);
    case 'mineAdamant':
      return handleMineAdamant(state, result);
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
    case 'buildShrine':
      return handleBuildShrine(state, result);
    case 'craftBoneTotem':
      return handleCraftBoneTotem(state, result);
    case 'boneTotems':
      return handleBoneTotems(state, result);
    case 'lowChamber':
      return handleLowChamber(state, result);
    case 'alchemistChamber':
      return handleAlchemistChamber(state, result);
    case 'layTrap':
      return handleLayTrap(state, result);
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
    default:
      return result;
  }
}

function handleLightFire(state: GameState, result: ActionResult): ActionResult {
  result.stateUpdates.flags = { ...state.flags, fireLit: true, gameStarted: true };
  result.stateUpdates.story = {
    ...state.story,
    seen: {
      ...state.story.seen,
      fireLit: true
    }
  };

  result.logEntries!.push({
    id: `fire-lit-${Date.now()}`,
    message: 'The fire crackles softly, casting dancing shadows on the cave walls. The warmth is comforting.',
    timestamp: Date.now(),
    type: 'system',
  });

  return result;
}

function handleGatherWood(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('gatherWood', state);

  // Handle any log messages from probability effects
  if (effectUpdates.logMessages) {
    effectUpdates.logMessages.forEach((message: string) => {
      result.logEntries!.push({
        id: `probability-effect-${Date.now()}-${Math.random()}`,
        message: message,
        timestamp: Date.now(),
        type: 'system',
      });
    });
    // Remove logMessages from state updates as it's not part of the game state
    delete effectUpdates.logMessages;
  }

  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

function handleBuildTorch(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('buildTorch', state);
  Object.assign(result.stateUpdates, effectUpdates);

  result.stateUpdates.flags = { ...state.flags, torchBuilt: true };

  if (!state.story.seen.rumbleSound) {
    result.logEntries!.push({
      id: `rumble-sound-${Date.now()}`,
      message: 'A low, rumbling sound echoes from deeper in the cave.',
      timestamp: Date.now(),
      type: 'system',
    });
    result.stateUpdates.story!.seen!.rumbleSound = true;
  }

  return result;
}

function handleBuildWoodenHut(state: GameState, result: ActionResult): ActionResult {
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

function handleBuildCabin(state: GameState, result: ActionResult): ActionResult {
  return handleBuildingConstruction(state, result, 'buildCabin', 'cabin');
}

function handleBuildBlacksmith(state: GameState, result: ActionResult): ActionResult {
  return handleBuildingConstruction(state, result, 'buildBlacksmith', 'blacksmith');
}

function handleBuildShallowPit(state: GameState, result: ActionResult): ActionResult {
  return handleBuildingConstruction(state, result, 'buildShallowPit', 'shallowPit');
}

function handleBuildDeepeningPit(state: GameState, result: ActionResult): ActionResult {
  return handleBuildingConstruction(state, result, 'buildDeepeningPit', 'deepeningPit');
}

function handleBuildDeepPit(state: GameState, result: ActionResult): ActionResult {
  return handleBuildingConstruction(state, result, 'buildDeepPit', 'deepPit');
}

function handleBuildBottomlessPit(state: GameState, result: ActionResult): ActionResult {
  return handleBuildingConstruction(state, result, 'buildBottomlessPit', 'bottomlessPit');
}

function handleBuildFoundry(state: GameState, result: ActionResult): ActionResult {
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

function handleBuildGreatCabin(state: GameState, result: ActionResult): ActionResult {
  return handleBuildingConstruction(state, result, 'buildGreatCabin', 'greatCabin');
}

function handleBuildTimberMill(state: GameState, result: ActionResult): ActionResult {
  return handleBuildingConstruction(state, result, 'buildTimberMill', 'timberMill');
}

function handleBuildQuarry(state: GameState, result: ActionResult): ActionResult {
  return handleBuildingConstruction(state, result, 'buildQuarry', 'quarry');
}

function handleBuildClerksHut(state: GameState, result: ActionResult): ActionResult {
  return handleBuildingConstruction(state, result, 'buildClerksHut', 'clerksHut');
}

function handleBuildStoneHut(state: GameState, result: ActionResult): ActionResult {
  return handleBuildingConstruction(state, result, 'buildStoneHut', 'stoneHut');
}

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

function handleExploreCave(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('exploreCave', state);

  // Handle any log messages from probability effects
  if (effectUpdates.logMessages) {
    effectUpdates.logMessages.forEach((message: string) => {
      result.logEntries!.push({
        id: `probability-effect-${Date.now()}-${Math.random()}`,
        message: message,
        timestamp: Date.now(),
        type: 'system',
      });
    });
    // Remove logMessages from state updates as it's not part of the game state
    delete effectUpdates.logMessages;
  }

  // Remove forge section from cave panel
  if (state.panels?.cave?.actions) {
    result.stateUpdates.panels = {
      ...state.panels,
      cave: {
        ...state.panels.cave,
        actions: state.panels.cave.actions.filter(action => action.id !== 'forgeSteel')
      }
    };
  }


  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

function handleCraftStoneAxe(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('craftStoneAxe', state);
  Object.assign(result.stateUpdates, effectUpdates);

  result.logEntries!.push({
    id: `village-unlocked-${Date.now()}`,
    message: 'Outside the cave, a small clearing opens up. This could be the foundation of something greater.',
    timestamp: Date.now(),
    type: 'system',
  });

  return result;
}

function handleCraftStonePickaxe(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('craftStonePickaxe', state);
  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

function handleCraftIronAxe(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('craftIronAxe', state);
  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

function handleCraftIronPickaxe(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('craftIronPickaxe', state);
  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

function handleMineIron(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('mineIron', state);

  // Handle any log messages from probability effects
  if (effectUpdates.logMessages) {
    effectUpdates.logMessages.forEach((message: string) => {
      result.logEntries!.push({
        id: `probability-effect-${Date.now()}-${Math.random()}`,
        message: message,
        timestamp: Date.now(),
        type: 'system',
      });
    });
    // Remove logMessages from state updates as it's not part of the game state
    delete effectUpdates.logMessages;
  }

  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

function handleMineCoal(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('mineCoal', state);

  // Handle any log messages from probability effects
  if (effectUpdates.logMessages) {
    effectUpdates.logMessages.forEach((message: string) => {
      result.logEntries!.push({
        id: `probability-effect-${Date.now()}-${Math.random()}`,
        message: message,
        timestamp: Date.now(),
        type: 'system',
      });
    });
    // Remove logMessages from state updates as it's not part of the game state
    delete effectUpdates.logMessages;
  }

  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

function handleVentureDeeper(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('ventureDeeper', state);

  // Handle any log messages from probability effects
  if (effectUpdates.logMessages) {
    effectUpdates.logMessages.forEach((message: string) => {
      result.logEntries!.push({
        id: `probability-effect-${Date.now()}-${Math.random()}`,
        message: message,
        timestamp: Date.now(),
        type: 'system',
      });
    });
    // Remove logMessages from state updates as it's not part of the game state
    delete effectUpdates.logMessages;
  }

  // Add a special log message for venturing deeper
  if (!state.story.seen.venturedDeeper) {
    result.logEntries!.push({
      id: `venture-deeper-${Date.now()}`,
      message: 'The torchlight reveals deeper passages carved into the rock. The air grows colder as you descend, but the promise of greater treasures draws you forward.',
      timestamp: Date.now(),
      type: 'system',
    });
  }

  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

function handleHunt(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('hunt', state);

  // Apply weapon bonuses for hunting
  const actionBonuses = getActionBonuses('hunt', state);
  if (actionBonuses.resourceBonus && actionBonuses.resourceBonus.food) {
    if (!effectUpdates.resources) {
      effectUpdates.resources = { ...state.resources };
    }
    effectUpdates.resources.food = (effectUpdates.resources.food || 0) + actionBonuses.resourceBonus.food;
  }

  Object.assign(result.stateUpdates, effectUpdates);

  return result;
}

function handleCraftCrudeBow(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('craftCrudeBow', state);
  Object.assign(result.stateUpdates, effectUpdates);

  // Add forest unlock message when crude bow is crafted
  if (effectUpdates.flags && effectUpdates.flags.forestUnlocked && !state.flags.forestUnlocked) {
    result.logEntries!.push({
      id: `forest-unlocked-${Date.now()}`,
      message: 'The village is encircled by a dense, dark forest. Danger lingers in the air, though it may also be a place to hunt.',
      timestamp: Date.now(),
      type: 'system',
    });
  }

  return result;
}

function handleCraftHuntsmanBow(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('craftHuntsmanBow', state);
  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

function handleCraftLongBow(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('craftLongBow', state);
  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

function handleCraftWarBow(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('craftWarBow', state);
  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

function handleCraftMasterBow(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('craftMasterBow', state);
  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

function handleCraftIronSword(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('craftIronSword', state);
  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

function handleCraftSteelSword(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('craftSteelSword', state);
  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

function handleCraftObsidianSword(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('craftObsidianSword', state);
  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

function handleCraftAdamantSword(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('craftAdamantSword', state);
  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

function handleCraftIronLantern(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('craftIronLantern', state);
  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

function handleCraftSteelLantern(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('craftSteelLantern', state);
  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

function handleCraftObsidianLantern(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('craftObsidianLantern', state);
  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

function handleCraftAdamantLantern(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('craftAdamantLantern', state);
  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

function handleDescendFurther(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('descendFurther', state);

  // Handle any log messages from probability effects
  if (effectUpdates.logMessages) {
    effectUpdates.logMessages.forEach((message: string) => {
      result.logEntries!.push({
        id: `probability-effect-${Date.now()}-${Math.random()}`,
        message: message,
        timestamp: Date.now(),
        type: 'system',
      });
    });
    delete effectUpdates.logMessages;
  }

  // Add a special log message for descending further
  if (!state.story.seen.descendedFurther) {
    result.logEntries!.push({
      id: `descend-further-${Date.now()}`,
      message: 'With your lantern casting a steady glow, you descend into the deepest chambers. The walls shimmer with veins of precious metals and the air hums with ancient power.',
      timestamp: Date.now(),
      type: 'system',
    });
  }

  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

function handleExploreRuins(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('exploreRuins', state);

  // Handle any log messages from probability effects
  if (effectUpdates.logMessages) {
    effectUpdates.logMessages.forEach((message: string) => {
      result.logEntries!.push({
        id: `probability-effect-${Date.now()}-${Math.random()}`,
        message: message,
        timestamp: Date.now(),
        type: 'system',
      });
    });
    delete effectUpdates.logMessages;
  }

  // Add a special log message for exploring ruins
  if (!state.story.seen.exploredRuins) {
    result.logEntries!.push({
      id: `explore-ruins-${Date.now()}`,
      message: 'Ancient ruins sprawl before you depp in the cave, their crumbling walls telling stories of a lost civilization. Your lantern reveals treasures hidden in the shadows of time.',
      timestamp: Date.now(),
      type: 'system',
    });
  }

  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

function handleExploreTemple(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('exploreTemple', state);

  // Handle any log messages from probability effects
  if (effectUpdates.logMessages) {
    effectUpdates.logMessages.forEach((message: string) => {
      result.logEntries!.push({
        id: `probability-effect-${Date.now()}-${Math.random()}`,
        message: message,
        timestamp: Date.now(),
        type: 'system',
      });
    });
    delete effectUpdates.logMessages;
  }

  // Add a special log message for exploring temple
  if (!state.story.seen.exploredTemple) {
    result.logEntries!.push({
      id: `explore-temple-${Date.now()}`,
      message: 'A magnificent temple rises from the cavern floor overlooking the city ruins, its pillars reaching toward the darkness above. Sacred chambers hold relics of immense power and beauty.',
      timestamp: Date.now(),
      type: 'system',
    });
  }

  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

function handleExploreCitadel(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('exploreCitadel', state);

  // Handle any log messages from probability effects
  if (effectUpdates.logMessages) {
    effectUpdates.logMessages.forEach((message: string) => {
      result.logEntries!.push({
        id: `probability-effect-${Date.now()}-${Math.random()}`,
        message: message,
        timestamp: Date.now(),
        type: 'system',
      });
    });
    delete effectUpdates.logMessages;
  }

  // Add a special log message for exploring citadel
  if (!state.story.seen.exploredCitadel) {
    result.logEntries!.push({
      id: `explore-citadel-${Date.now()}`,
      message: 'The ultimate depths reveal a vast citadel, its walls gleaming with otherworldly light. This is the heart of the ancient realm, where the greatest treasures await.',
      timestamp: Date.now(),
      type: 'system',
    });
  }

  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

function handleMineSulfur(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('mineSulfur', state);

  // Handle any log messages from probability effects
  if (effectUpdates.logMessages) {
    effectUpdates.logMessages.forEach((message: string) => {
      result.logEntries!.push({
        id: `probability-effect-${Date.now()}-${Math.random()}`,
        message: message,
        timestamp: Date.now(),
        type: 'system',
      });
    });
    delete effectUpdates.logMessages;
  }

  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

function handleMineObsidian(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('mineObsidian', state);

  // Handle any log messages from probability effects
  if (effectUpdates.logMessages) {
    effectUpdates.logMessages.forEach((message: string) => {
      result.logEntries!.push({
        id: `probability-effect-${Date.now()}-${Math.random()}`,
        message: message,
        timestamp: Date.now(),
        type: 'system',
      });
    });
    delete effectUpdates.logMessages;
  }

  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

function handleMineAdamant(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('mineAdamant', state);

  // Handle any log messages from probability effects
  if (effectUpdates.logMessages) {
    effectUpdates.logMessages.forEach((message: string) => {
      result.logEntries!.push({
        id: `probability-effect-${Date.now()}-${Math.random()}`,
        message: message,
        timestamp: Date.now(),
        type: 'system',
      });
    });
    delete effectUpdates.logMessages;
  }

  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

function handleCraftSteelAxe(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('craftSteelAxe', state);
  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

function handleCraftSteelPickaxe(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('craftSteelPickaxe', state);
  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

function handleCraftObsidianAxe(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('craftObsidianAxe', state);
  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

function handleCraftObsidianPickaxe(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('craftObsidianPickaxe', state);
  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

function handleCraftAdamantAxe(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('craftAdamantAxe', state);
  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

function handleCraftAdamantPickaxe(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('craftAdamantPickaxe', state);
  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

// New handler for Shrine building
function handleBuildShrine(state: GameState, result: ActionResult): ActionResult {
  const shrineResult = handleBuildingConstruction(state, result, 'buildShrine', 'shrine');
  
  // Add shrine completion message
  if (state.buildings.shrine === 0) {
    shrineResult.logEntries!.push({
      id: `shrine-built-${Date.now()}`,
      message: 'A shrine rises at the forest’s edge, raised to appease what dwells within.',
      timestamp: Date.now(),
      type: 'system',
    });
  }
  
  return shrineResult;
}

function handleCraftBoneTotem(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('craftBoneTotem', state);
  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

function handleBoneTotems(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('boneTotems', state);
  Object.assign(result.stateUpdates, effectUpdates);
  
  // Add a basic message - more complex events will be handled later
  result.logEntries!.push({
    id: `bone-totems-sacrifice-${Date.now()}`,
    message: 'The bone totems are consumed by the shrine. The forest seems to stir in response.',
    timestamp: Date.now(),
    type: 'system',
  });
  
  return result;
}

function handleLowChamber(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('lowChamber', state);

  // Handle any log messages from probability effects
  if (effectUpdates.logMessages) {
    effectUpdates.logMessages.forEach((message: string) => {
      result.logEntries!.push({
        id: `probability-effect-${Date.now()}-${Math.random()}`,
        message: message,
        timestamp: Date.now(),
        type: 'system',
      });
    });
    delete effectUpdates.logMessages;
  }

  result.logEntries!.push({
    id: `low-chamber-explored-${Date.now()}`,
    message: 'Using the reinforced rope, you descend into a previously inaccessible chamber deep within the cave. Ancient treasures glimmer in the torchlight, hidden for centuries in this forgotten place.',
    timestamp: Date.now(),
    type: 'system',
  });

  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

function handleAlchemistChamber(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('alchemistChamber', state);

  // Handle any log messages from probability effects
  if (effectUpdates.logMessages) {
    effectUpdates.logMessages.forEach((message: string) => {
      result.logEntries!.push({
        id: `probability-effect-${Date.now()}-${Math.random()}`,
        message: message,
        timestamp: Date.now(),
        type: 'system',
      });
    });
    delete effectUpdates.logMessages;
  }

  result.logEntries!.push({
    id: `alchemist-chamber-explored-${Date.now()}`,
    message: 'Following the alchemist\'s map, you find the hidden chamber sealed behind rock that moves like a door. Inside, the alchemist\'s greatest treasures and experiments await, preserved in death.',
    timestamp: Date.now(),
    type: 'system',
  });

  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

function handleLayTrap(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('layTrap', state);
  Object.assign(result.stateUpdates, effectUpdates);

  // Calculate success based on luck
  const luck = getTotalLuck(state);
  const successChance = 0.25 + (luck * 0.01);
  const rand = Math.random();

  if (rand < successChance) {
    // Success: Giant bear trapped
    const villagerDeaths = Math.floor(Math.random() * 4); // 0-3 deaths
    const deathResult = killVillagers(state, villagerDeaths);

    Object.assign(result.stateUpdates, deathResult);
    result.stateUpdates.relics = {
      ...state.relics,
      black_bear_fur: true,
    };

    if (villagerDeaths === 0) {
      result.logEntries!.push({
        id: `giant-bear-trapped-success-${Date.now()}`,
        message: 'The giant trap works perfectly! A massive black bear, larger than any normal bear, is caught. Your villagers fight with all their strength and manage to slay the beast without casualties. You claim its magnificent black fur as a trophy.',
        timestamp: Date.now(),
        type: 'system',
      });
    } else {
      result.logEntries!.push({
        id: `giant-bear-trapped-casualties-${Date.now()}`,
        message: `The giant trap snares a colossal black bear! The beast fights ferociously. ${villagerDeaths} villager${villagerDeaths > 1 ? 's' : ''} fall${villagerDeaths === 1 ? 's' : ''} to its claws before it is finally slain. You claim its magnificent black fur as a hard-won trophy.`,
        timestamp: Date.now(),
        type: 'system',
      });
    }
  } else {
    // Failure: Nothing caught
    result.logEntries!.push({
      id: `giant-trap-failed-${Date.now()}`,
      message: 'You set the giant trap with care, but when you return to check it, you find only disturbed earth and massive claw marks. Whatever prowls these woods is too cunning for your trap... this time. Perhaps you should try again.',
      timestamp: Date.now(),
      type: 'system',
    });
  }

  return result;
}

