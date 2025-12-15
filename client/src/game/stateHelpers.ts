import { GameState } from "@shared/schema";
import { getMaxPopulation } from "./population";

export function updateResource(
  state: GameState,
  resource: keyof GameState['resources'],
  amount: number,
): Partial<GameState> {
  const currentAmount = state.resources[resource] || 0;
  const newAmount = currentAmount + amount;
  const clampedAmount = Math.max(0, newAmount);

  // Apply resource limit cap
  const finalAmount = capResourceToLimit(resource, clampedAmount, state);

  return {
    resources: {
      ...state.resources,
      [resource]: finalAmount,
    },
  };
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
 * List of UI-only properties that should not be persisted
 * These are transient state used only for UI rendering
 */
const UI_ONLY_PROPERTIES = [
  'activeTab',
  'devMode',
  'lastSaved',
  'eventDialog',
  'combatDialog',
  'authDialogOpen',
  'shopDialogOpen',
  'idleModeDialog',
  'inactivityDialogOpen',
  'inactivityReason',
  'current_population',
  'total_population',
] as const;

/**
 * Builds a clean GameState object from the Zustand store state
 * Filters out UI-only properties and functions
 */
export function buildGameState(state: any): GameState {
  const cleaned: any = {};

  // Copy all properties except UI-only ones
  for (const key in state) {
    // Skip functions
    if (typeof state[key] === 'function') continue;

    // Skip UI-only properties
    if (UI_ONLY_PROPERTIES.includes(key as any)) continue;

    // Copy everything else
    cleaned[key] = state[key];
  }

  // Always reset pause state when saving (never save as paused)
  cleaned.isPaused = false;

  return cleaned as GameState;
}

// Placeholder for the new capResourceToLimit function.
// This function needs to be implemented to actually cap resources.
// It will likely depend on the 'buildings' and 'flags' in the GameState.
function capResourceToLimit(resource: keyof GameState['resources'], amount: number, state: GameState): number {
  // Feature flag for new games
  if (!state.flags.newGameFeatures) {
    return amount;
  }

  // Silver and gold are not limited
  if (resource === 'silver' || resource === 'gold') {
    return amount;
  }

  const buildingLevels = {
    "Supply Hut": 1,
    "Storehouse": 2,
    "Fortified Storehouse": 3,
    "Village Warehouse": 4,
    "Grand Repository": 5,
    "City Vault": 6,
  };

  const resourceLimits = {
    1: 1000,
    2: 5000,
    3: 10000,
    4: 25000,
    5: 50000,
    6: 100000,
  };

  let maxLimit = 0;

  // Determine the highest level of storage building the player has
  for (const buildingName in state.buildings) {
    const buildingLevel = state.buildings[buildingName];
    const level = Object.keys(buildingLevels).find(key => key === buildingName);
    if (level) {
      const currentBuildingLevel = buildingLevels[level as keyof typeof buildingLevels];
      if (currentBuildingLevel > maxLimit) {
        maxLimit = currentBuildingLevel;
      }
    }
  }

  // If no storage building is found, use a default or minimal limit, or 0 if that's intended.
  // For now, let's assume 0 if no specific limit is found or applicable.
  const limit = resourceLimits[maxLimit as keyof typeof resourceLimits] || 0;


  return Math.min(amount, limit);
}