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
        // Create the trinket event log entry immediately
        const trinketLogEntry: LogEntry = {
          id: `trinketFound-${Date.now()}`,
          message: "While gathering wood, you find an old trinket with glowing amber liquid inside. Do you dare drink it?",
          timestamp: Date.now(),
          type: 'event',
          title: 'Old Trinket',
          choices: [
            {
              id: 'drinkTrinket',
              label: 'Drink the glowing liquid',
              effect: (state) => ({
                flags: {
                  ...state.flags,
                  trinketDrunk: true,
                },
                events: {
                  ...state.events,
                  trinket_found: true,
                },
                stats: {
                  ...state.stats,
                  strength: (state.stats.strength || 0) + 5,
                },
                _logMessage: "You drink the amber liquid. It burns as it goes down, but you feel stronger than before. (+5 Strength)",
              })
            },
            {
              id: 'ignoreTrinket',
              label: 'Leave it be',
              effect: (state) => ({
                events: {
                  ...state.events,
                  trinket_found: true,
                },
                _logMessage: "You decide not to risk drinking the mysterious liquid. You carefully bury the trinket back where you found it and continue gathering wood."
              })
            }
          ]
        };

        // Add to log entries to trigger immediately
        result.logEntries!.push(trinketLogEntry);

        // Set up delayed effect to show dialog
        result.delayedEffects!.push(() => {
          setTimeout(() => {
            useGameStore.getState().setEventDialog(true, trinketLogEntry);
          }, 100);
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

  // Add forest unlock message if forest is being unlocked
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