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

export const updatePopulationCounts = (state: GameState) => {
  const current_population = Object.values(state.villagers).reduce(
    (sum, count) => sum + (count || 0),
    0,
  );

  // Calculate max population based on buildings
  const total_population = (state.buildings.woodenHut * 2) + (state.buildings.stoneHut * 4);

  return {
    current_population,
    total_population,
  };
};

export function assignVillagerToJob(
  state: GameState,
  job: "gatherer" | "hunter" | "iron_miner" | "coal_miner" | "sulfur_miner" | "silver_miner" | "gold_miner" | "obsidian_miner" | "adamant_miner" | "moonstone_miner" | "steel_forger" | "tanner"
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
  job: "gatherer" | "hunter" | "iron_miner" | "coal_miner" | "sulfur_miner" | "silver_miner" | "gold_miner" | "obsidian_miner" | "adamant_miner" | "moonstone_miner" | "steel_forger" | "tanner"
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

export function killVillagers(state: GameState, deathCount: number): Partial<GameState> {
  if (deathCount <= 0) return {};

  let updatedVillagers = { ...state.villagers };
  let remainingDeaths = deathCount;

  // All villager types that can die
  const villagerTypes = [
    'free', 
    'gatherer', 
    'hunter', 
    'iron_miner', 
    'coal_miner', 
    'sulfur_miner', 
    'silver_miner', 
    'gold_miner', 
    'obsidian_miner', 
    'adamant_miner', 
    'moonstone_miner', 
    'steel_forger',
    'tanner'
  ];

  // Create a pool of all available villagers with their types
  const villagerPool: string[] = [];
  villagerTypes.forEach(type => {
    const count = updatedVillagers[type as keyof typeof updatedVillagers] || 0;
    for (let i = 0; i < count; i++) {
      villagerPool.push(type);
    }
  });

  // If we have fewer villagers than deaths requested, kill all available
  const actualDeaths = Math.min(remainingDeaths, villagerPool.length);
  
  // Randomly select villagers to kill
  for (let i = 0; i < actualDeaths; i++) {
    if (villagerPool.length === 0) break;
    
    const randomIndex = Math.floor(Math.random() * villagerPool.length);
    const selectedType = villagerPool[randomIndex];
    
    // Remove the selected villager from the pool and from the state
    villagerPool.splice(randomIndex, 1);
    updatedVillagers[selectedType as keyof typeof updatedVillagers]--;
  }

  return {
    villagers: updatedVillagers
  };
}