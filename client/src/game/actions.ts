
import { GameState } from '@shared/schema';
import { gameActions, applyActionEffects } from '@/game/rules';
import { LogEntry } from '@/game/events';

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
    case 'buildLodge':
      return handleBuildLodge(state, result);
    case 'buildWorkshop':
      return handleBuildWorkshop(state, result);
    case 'exploreCave':
      return handleExploreCave(state, result);
    case 'craftStoneAxe':
      return handleCraftStoneAxe(state, result);
    case 'craftStonePickaxe':
      return handleCraftStonePickaxe(state, result);
    case 'mineIron':
      return handleMineIron(state, result);
    case 'hunt':
      return handleHunt(state, result);
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
  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

function handleBuildTorch(state: GameState, result: ActionResult): ActionResult {
  result.stateUpdates.resources = { 
    ...state.resources, 
    wood: state.resources.wood - 10, 
    torch: state.resources.torch + 1 
  };
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
  const level = state.buildings.huts + 1;
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
    huts: state.buildings.huts + 1
  };

  if (state.buildings.huts === 0) {
    result.delayedEffects!.push(() => {
      // Stranger approaches logic will be handled by the caller
    });
  }
  
  return result;
}

function handleBuildLodge(state: GameState, result: ActionResult): ActionResult {
  return handleBuildingConstruction(state, result, 'buildLodge', 'lodges');
}

function handleBuildWorkshop(state: GameState, result: ActionResult): ActionResult {
  return handleBuildingConstruction(state, result, 'buildWorkshop', 'workshops');
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

function handleMineIron(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('mineIron', state);
  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

function handleHunt(state: GameState, result: ActionResult): ActionResult {
  const effectUpdates = applyActionEffects('hunt', state);
  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}
