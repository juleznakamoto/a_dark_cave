import { GameState, gameStateSchema } from "@shared/schema";
import { getMaxPopulation } from "./population";

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

export const updatePopulationCounts = (
  state: GameState,
): Partial<GameState> => {
  const current = Object.values(state.villagers).reduce(
    (sum, count) => sum + (count || 0),
    0,
  );

  const total = getMaxPopulation(state);

  return {
    current_population: current,
    total_population: total,
  };
};

export function assignVillagerToJob(
  state: GameState,
  job: keyof GameState['villagers']
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
  if (job === 'hunter' && state.villagers.hunter === 0) {
    updates.story = {
      ...state.story,
      seen: {
        ...state.story.seen,
        hashunter: true
      }
    };
  } else if (job === 'gatherer' && state.villagers.gatherer === 0) {
    updates.story = {
      ...state.story,
      seen: {
        ...state.story.seen,
        hasgatherer: true
      }
    };
  }

  return updates;
}

export function unassignVillagerFromJob(
  state: GameState,
  job: keyof GameState['villagers']
): Partial<GameState> {
  if (job === 'free' || state.villagers[job] <= 0) return {};

  return {
    villagers: {
      ...state.villagers,
      free: state.villagers.free + 1,
      [job]: state.villagers[job] - 1
    }
  };
}

export function killVillagers(state: GameState, deathCount: number): Partial<GameState> {
  if (deathCount <= 0) return {};

  let updatedVillagers = { ...state.villagers };
  let remainingDeaths = deathCount;

  // First, kill free villagers
  if (updatedVillagers.free && updatedVillagers.free > 0) {
    const freeToKill = Math.min(remainingDeaths, updatedVillagers.free);
    updatedVillagers.free -= freeToKill;
    remainingDeaths -= freeToKill;
  }

  // If more deaths are needed, kill from other villager types randomly
  if (remainingDeaths > 0) {
    const villagerTypes = Object.keys(updatedVillagers).filter(type => type !== 'free') as Array<keyof typeof updatedVillagers>;
    
    // Create a pool of non-free villagers
    const villagerPool: string[] = [];
    villagerTypes.forEach(type => {
      const count = updatedVillagers[type] || 0;
      for (let i = 0; i < count; i++) {
        villagerPool.push(type);
      }
    });

    // Kill remaining villagers randomly from the pool
    const actualDeaths = Math.min(remainingDeaths, villagerPool.length);
    for (let i = 0; i < actualDeaths; i++) {
      if (villagerPool.length === 0) break;

      const randomIndex = Math.floor(Math.random() * villagerPool.length);
      const selectedType = villagerPool[randomIndex];

      // Remove the selected villager from the pool and from the state
      villagerPool.splice(randomIndex, 1);
      updatedVillagers[selectedType as keyof typeof updatedVillagers]--;
    }
  }

  return {
    villagers: updatedVillagers
  };
}

/**
 * Builds a clean GameState object from the Zustand store state
 * Filters out functions and Zustand-specific properties
 */
export function buildGameState(state: any): GameState {
  // Get all keys from the schema
  const schemaKeys = Object.keys(gameStateSchema.shape);

  // Build the state object dynamically
  const gameState: Partial<GameState> = {};

  for (const key of schemaKeys) {
    if (key in state) {
      gameState[key as keyof GameState] = state[key as keyof typeof state];
    }
  }

  return gameState as GameState;
}