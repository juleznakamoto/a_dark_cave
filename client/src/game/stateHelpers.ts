import { GameState } from "@shared/schema";
import { getCurrentPopulation, getMaxPopulation } from "./population";
import { isResourceLimited, getResourceLimit } from "./resourceLimits";
import { getTotalEventDeathReduction } from "./rules/effectsCalculation";

/**
 * Merge combat victory updates onto live `prevState`. Combat `onVictory` must not spread stale
 * `state.resources` (that would revert bombs spent during combat). `silver` and `gold` in
 * `victoryResult.resources` are **deltas** added to the live store.
 */
export function mergeCombatVictoryState(
  prevState: GameState,
  victoryResult: Partial<GameState> & { _combatSummary?: unknown },
): Partial<GameState> {
  const { resources: vr, ...rest } = victoryResult;
  if (vr === undefined) {
    return { ...prevState, ...victoryResult };
  }
  return {
    ...prevState,
    ...rest,
    resources: {
      ...prevState.resources,
      silver: (prevState.resources.silver ?? 0) + (vr.silver ?? 0),
      gold: (prevState.resources.gold ?? 0) + (vr.gold ?? 0),
    },
  };
}

export function updateResource(
  state: GameState,
  resource: keyof GameState['resources'],
  amount: number,
): Partial<GameState> {
  const currentAmount = state.resources[resource] || 0;
  const newAmount = Math.max(0, currentAmount + amount);

  // Apply resource cap
  const cappedAmount = capResourceToLimit(resource, newAmount, state);

  // Check if we hit the limit for the first time
  // This should trigger when the resource reaches the limit, not just when capped
  const limit = getResourceLimit(state);
  const isLimitedResource = isResourceLimited(resource, state);
  const reachedLimit = isLimitedResource && cappedAmount >= limit && !state.flags.hasHitResourceLimit;

  return {
    resources: {
      ...state.resources,
      [resource]: cappedAmount,
    },
    ...(reachedLimit && {
      flags: {
        ...state.flags,
        hasHitResourceLimit: true,
      },
    }),
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
  const current = getCurrentPopulation(state);

  const total = getMaxPopulation(state);
  const prevMax = Number(state.story?.seen?.maxPopulationReached) || 0;
  const newMax = Math.max(prevMax, current);

  return {
    current_population: current,
    total_population: total,
    ...(newMax > prevMax && {
      story: {
        ...state.story,
        seen: {
          ...state.story?.seen,
          maxPopulationReached: newMax,
        },
      },
    }),
  };
};

/** How many villagers can be added without exceeding housing cap. */
export function countVillagersAddableWithinCap(
  state: GameState,
  desired: number,
): number {
  const room = Math.max(
    0,
    getMaxPopulation(state) - getCurrentPopulation(state),
  );
  return Math.min(desired, room);
}

/**
 * Adds up to `desired` villagers to `free`, clamped by housing.
 * Includes `updatePopulationCounts` so stored population fields stay in sync.
 */
export function addFreeVillagersWithinCap(
  state: GameState,
  desired: number,
): { added: number; patch: Partial<GameState> } {
  const added = countVillagersAddableWithinCap(state, desired);
  if (added <= 0) {
    return { added: 0, patch: {} };
  }
  const villagers = {
    ...state.villagers,
    free: (state.villagers.free || 0) + added,
  };
  const nextState: GameState = { ...state, villagers };
  const popPatch = updatePopulationCounts(nextState);
  return {
    added,
    patch: {
      villagers,
      ...popPatch,
    },
  };
}

export function assignVillagerToJob(
  state: GameState,
  job: keyof GameState['villagers']
): Partial<GameState> {
  if (state.villagers.free <= 0) return {};

  // Initialize job count to 0 if undefined (for backwards compatibility with old saves)
  const currentJobCount = state.villagers[job] ?? 0;

  const updates: Partial<GameState> = {
    villagers: {
      ...state.villagers,
      free: state.villagers.free - 1,
      [job]: currentJobCount + 1
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
  // Initialize job count to 0 if undefined (for backwards compatibility with old saves)
  const currentJobCount = state.villagers[job] ?? 0;

  if (job === 'free' || currentJobCount <= 0) return {};

  return {
    villagers: {
      ...state.villagers,
      free: state.villagers.free + 1,
      [job]: currentJobCount - 1
    }
  };
}

export function killVillagers(state: GameState, deathCount: number): Partial<GameState> & { villagersKilled?: number } {
  if (deathCount <= 0) return { villagersKilled: 0 };

  // Apply eventDeathReduction bonus if available
  const reductionRate = getTotalEventDeathReduction(state);
  let actualDeaths = deathCount;
  if (reductionRate > 0) {
    actualDeaths = Math.ceil(deathCount * (1 - reductionRate));
  }

  let updatedVillagers = { ...state.villagers };
  let remainingDeaths = actualDeaths;
  let totalKilled = 0;

  // First, kill free villagers
  if (updatedVillagers.free && updatedVillagers.free > 0) {
    const freeToKill = Math.min(remainingDeaths, updatedVillagers.free);
    updatedVillagers.free -= freeToKill;
    remainingDeaths -= freeToKill;
    totalKilled += freeToKill;
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
    const actualKills = Math.min(remainingDeaths, villagerPool.length);
    for (let i = 0; i < actualKills; i++) {
      if (villagerPool.length === 0) break;

      const randomIndex = Math.floor(Math.random() * villagerPool.length);
      const selectedType = villagerPool[randomIndex];

      // Remove the selected villager from the pool and from the state
      villagerPool.splice(randomIndex, 1);
      updatedVillagers[selectedType as keyof typeof updatedVillagers]--;
      totalKilled++;
    }
  }

  const updates: Partial<GameState> & { villagersKilled?: number } = {
    villagers: updatedVillagers,
    villagersKilled: totalKilled,
  };

  if (totalKilled > 0) {
    updates.stats = {
      ...state.stats,
      villagerDeathsLifetime:
        (state.stats.villagerDeathsLifetime ?? 0) + totalKilled,
    };
  }

  return updates;
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
  'investDialogOpen',
  'investmentResultDialog',
  'idleModeDialog',
  'inactivityDialogOpen',
  'inactivityReason',
  'signUpPromptDialogOpen',
  'restartGameDialogOpen',
  'deleteAccountDialogOpen',
  'playlightWelcomeDialogOpen',
  'socialPromptDialogOpen',
  'signUpPromptEligibleForGold',
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

// Cap resource to current storage limit
function capResourceToLimit(resource: keyof GameState['resources'], amount: number, state: GameState): number {
  // Check if this resource should be limited
  if (!isResourceLimited(resource, state)) {
    return amount;
  }

  // Get the current limit and cap the amount
  const limit = getResourceLimit(state);
  return Math.min(amount, limit);
}