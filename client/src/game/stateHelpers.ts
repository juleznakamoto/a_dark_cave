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
  // Calculate current population by summing all villager types
  const current_population = Object.values(state.villagers).reduce((sum, count) => sum + (count || 0), 0);
  const total_population = current_population; // For now, same as current

  return {
    current_population,
    total_population
  };
}

export function assignVillagerToJob(
  state: GameState,
  job: "gatherer" | "hunter" | "iron_miner" | "coal_miner" | "sulfur_miner" | "silver_miner" | "gold_miner" | "obsidian_miner" | "adamant_miner" | "moonstone_miner"
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
  job: "gatherer" | "hunter" | "iron_miner" | "coal_miner" | "sulfur_miner" | "silver_miner" | "gold_miner" | "obsidian_miner" | "adamant_miner" | "moonstone_miner"
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