import { GameState } from '@shared/schema';
import { gameActions, applyActionEffects } from '@/game/rules';
import { getCooldownReduction, getActionBonuses } from '@/game/rules/effects';
import { LogEntry } from '@/game/events';
import { useGameStore } from '@/game/state';



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
    case 'buildHut':
      return handleBuildHut(state, result);
    case 'buildCabin':
      return handleBuildCabin(state, result);
    case 'buildBlacksmith':
      return handleBuildBlacksmith(state, result);
    case 'buildPit':
      return handleBuildPit(state, result);
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
    case 'forgeSteel':
      return handleforgeSteel(state, result);
    case 'craftSteelAxe':
      return handleCraftSteelAxe(state, result);
    case 'craftSteelPickaxe':
      return handleCraftSteelPickaxe(state, result);
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

  // Handle triggered events
  if (effectUpdates.triggeredEvents) {
    effectUpdates.triggeredEvents.forEach((eventId: string) => {
      if (eventId === 'trinketFound') {
        // Apply the trinket effects immediately
        Object.assign(result.stateUpdates, {
          flags: {
            ...state.flags,
            ...result.stateUpdates.flags,
            trinketDrunk: true,
          },
          events: {
            ...state.events,
            ...result.stateUpdates.events,
            trinket_found: true,
          },
          stats: {
            ...state.stats,
            ...result.stateUpdates.stats,
            strength: (state.stats.strength || 0) + 5,
          },
        });

        // Add log entry for the trinket discovery
        result.logEntries!.push({
          id: `trinketFound-${Date.now()}`,
          message: "While gathering wood, you find an old trinket with glowing amber liquid inside. You drink it without hesitation. The liquid burns as it goes down, but you feel stronger than before. (+5 Strength)",
          timestamp: Date.now(),
          type: 'event',
          title: 'Old Trinket',
        });
      }
    });
    delete effectUpdates.triggeredEvents;
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

function handleBuildHut(state: GameState, result: ActionResult): ActionResult {
  const level = state.buildings.hut + 1;
  const actionEffects = gameActions.buildHut.effects[level];
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
    hut: state.buildings.hut + 1
  };

  if (state.buildings.hut === 0) {
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

function handleBuildPit(state: GameState, result: ActionResult): ActionResult {
  return handleBuildingConstruction(state, result, 'buildPit', 'pit');
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
      message: 'Ancient ruins sprawl before you, their crumbling walls telling stories of a lost civilization. Your steel lantern reveals treasures hidden in the shadows of time.',
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
      message: 'A magnificent temple rises from the cavern floor, its obsidian pillars reaching toward the darkness above. Sacred chambers hold relics of immense power and beauty.',
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
      message: 'The ultimate depths reveal a vast citadel, its adamantine walls gleaming with otherworldly light. This is the heart of the ancient realm, where the greatest treasures await.',
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

function handleforgeSteel(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('forgeSteel', state);

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

  // Add a special log message for steel forging
  if (!state.story.seen.hasSteel) {
    result.logEntries!.push({
      id: `steel-forged-${Date.now()}`,
      message: 'The blacksmith forge roars to life as coal and iron merge in the intense heat. The resulting steel gleams with superior strength and durability.',
      timestamp: Date.now(),
      type: 'system',
    });
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