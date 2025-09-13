
import { GameState } from '@shared/schema';

export function updateResource(
  state: GameState,
  resource: keyof GameState['resources'],
  amount: number
): Partial<GameState> {
  const newAmount = Math.max(0, state.resources[resource] + amount);
  const updates: Partial<GameState> = {
    resources: { ...state.resources, [resource]: newAmount }
  };

  // Track when resources are first seen
  if (newAmount > 0 && !state.story.seen[`has${resource.charAt(0).toUpperCase() + resource.slice(1)}`]) {
    updates.story = {
      ...state.story,
      seen: {
        ...state.story.seen,
        [`has${resource.charAt(0).toUpperCase() + resource.slice(1)}`]: true
      }
    };
  }

  return updates;
}

export function updateFlag(
  state: GameState,
  flag: keyof GameState['flags'],
  value: boolean
): Partial<GameState> {
  return {
    flags: { ...state.flags, [flag]: value }
  };
}

export function updatePopulationCounts(state: GameState): Partial<GameState> {
  const current = state.villagers.free + state.villagers.gatherers + state.villagers.hunters;
  const total = state.buildings.hut * 2;
  
  return {
    current_population: current,
    total_population: total
  };
}

export function assignVillagerToJob(
  state: GameState,
  job: 'gatherers' | 'hunters'
): Partial<GameState> {
  if (state.villagers.free <= 0) return {};

  const updates: Partial<GameState> = {
    villagers: {
      ...state.villagers,
      free: state.villagers.free - 1,
      [job]: state.villagers[job] + 1
    }
  };

  // Track when population types are first assigned
  if (job === 'hunters' && state.villagers.hunters === 0) {
    updates.story = {
      ...state.story,
      seen: {
        ...state.story.seen,
        hasHunters: true
      }
    };
  } else if (job === 'gatherers' && state.villagers.gatherers === 0) {
    updates.story = {
      ...state.story,
      seen: {
        ...state.story.seen,
        hasGatherers: true
      }
    };
  }

  return updates;
}

export function unassignVillagerFromJob(
  state: GameState,
  job: 'gatherers' | 'hunters'
): Partial<GameState> {
  if (state.villagers[job] <= 0) return {};

  return {
    villagers: {
      ...state.villagers,
      free: state.villagers.free + 1,
      [job]: state.villagers[job] - 1
    }
  };
}
