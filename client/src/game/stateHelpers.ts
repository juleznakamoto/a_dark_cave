import { GameState } from "@shared/schema";
import type { CombatResultSummary } from "./types";
import { getCurrentPopulation, getMaxPopulation } from "./population";
import {
  isResourceLimited,
  getResourceLimit,
  capResourceToLimit,
} from "./resourceLimits";
import { getTotalEventDeathReduction } from "./rules/effectsCalculation";
import { getVillagerCapForJob } from "./villagerCapUpgrades";
import { getExecutionTime } from "./rules/executionTime";
import { getGameActions } from "./rules/actionsRegistry";
import { migrateVillagerPresetsPurchasedOnLoad } from "./villagerJobPresets";

type CombatResultPayload =
  | CombatResultSummary
  | (Record<string, unknown> & { _combatSummary?: CombatResultSummary });

/** Unwrap `_combatSummary` from combat callbacks that return `Partial<GameState>`. */
export function extractCombatResultSummary(
  result: CombatResultPayload | null | undefined,
): CombatResultSummary {
  if (!result || typeof result !== "object") {
    return {};
  }
  if (
    "_combatSummary" in result &&
    result._combatSummary &&
    typeof result._combatSummary === "object"
  ) {
    return result._combatSummary;
  }
  return result as CombatResultSummary;
}

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
  const resources = {
    ...prevState.resources,
    silver: (prevState.resources.silver ?? 0) + (vr.silver ?? 0),
    gold: (prevState.resources.gold ?? 0) + (vr.gold ?? 0),
  };
  return {
    ...prevState,
    ...rest,
    resources,
    seenResources: markSeenResources(prevState.seenResources, resources),
  };
}

/** Merge resource keys into persisted side-panel visibility once amount > 0. */
export function markSeenResources(
  existing: string[] | undefined,
  resources: Partial<Record<string, number>>,
): string[] {
  const seen = new Set(existing ?? []);
  for (const [key, amount] of Object.entries(resources)) {
    if (typeof amount === "number" && amount > 0) {
      seen.add(key);
    }
  }
  return Array.from(seen);
}

/** Effective side-panel resource keys: persisted seen + any currently held. */
export function getSeenResourceKeys(state: GameState): string[] {
  return markSeenResources(state.seenResources, state.resources);
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
    seenResources: markSeenResources(state.seenResources, {
      [resource]: cappedAmount,
    }),
    ...(reachedLimit && {
      flags: {
        ...state.flags,
        hasHitResourceLimit: true,
      },
    }),
  };
}

/**
 * Apply many resource deltas in a single pass (same clamping/cap/seen/limit-flag semantics as
 * `updateResource`, just batched). Used by the production cycle so a tick that updates N resources
 * results in one store write instead of N — avoids a burst of re-renders late game.
 *
 * `deltas` are amounts to add (can be negative). Returns a `Partial<GameState>` to feed into `set`.
 */
export function applyResourceDeltas(
  state: GameState,
  deltas: Partial<Record<keyof GameState['resources'], number>>,
): Partial<GameState> {
  const newResources = { ...state.resources };
  const limit = getResourceLimit(state);
  let reachedLimit = false;

  for (const [key, delta] of Object.entries(deltas)) {
    if (typeof delta !== 'number' || delta === 0) continue;
    const resource = key as keyof GameState['resources'];
    const currentAmount = newResources[resource] || 0;
    const newAmount = Math.max(0, currentAmount + delta);
    const cappedAmount = capResourceToLimit(resource, newAmount, state);
    newResources[resource] = cappedAmount;
    if (isResourceLimited(resource, state) && cappedAmount >= limit) {
      reachedLimit = true;
    }
  }

  return {
    resources: newResources,
    seenResources: markSeenResources(state.seenResources, newResources),
    ...(reachedLimit && !state.flags.hasHitResourceLimit && {
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

  if (currentJobCount >= getVillagerCapForJob(state, job)) return {};

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

/** Deducts villagers from the free pool only (event payments, not combat casualties). */
export function spendFreeVillagers(
  state: GameState,
  count: number,
): Partial<GameState> & { villagersKilled?: number } {
  if (count <= 0) return { villagersKilled: 0 };

  const free = state.villagers?.free ?? 0;
  const spent = Math.min(count, free);
  if (spent <= 0) return { villagersKilled: 0 };

  return {
    villagers: {
      ...state.villagers,
      free: free - spent,
    },
    villagersKilled: spent,
    stats: {
      ...state.stats,
      villagerDeathsLifetime:
        (state.stats.villagerDeathsLifetime ?? 0) + spent,
    },
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
  'restartGameDialogOpen',
  'deleteAccountDialogOpen',
  'playlightWelcomeDialogOpen',
  'feedbackDialogOpen',
  'socialPromptDialogOpen',
  'signUpPromptEligibleForGold',
  'resourceChangeEvents',
  'current_population',
  'total_population',
  'gamblerDiceDialogOpen',
  'rewardDialog',
  'leaderboardDialogOpen',
  'shareDialogOpen',
  'fullGamePurchaseDialogOpen',
  'shopCheckoutItemId',
  'madnessDialog',
  'insightPotionDialog',
  'versionCheckDialogOpen',
  'insightRevealing',
  '_completingExecution',
] as const;

/** Closed dialog slices applied on load so persisted UI flags never block hotkeys or freeze sim. */
export function getTransientDialogResetOnLoad() {
  return {
    eventDialog: { isOpen: false, currentEvent: null },
    combatDialog: {
      isOpen: false,
      enemy: null,
      eventTitle: "",
      eventMessage: "",
      onVictory: null,
      onDefeat: null,
    },
    authDialogOpen: false,
    shopDialogOpen: false,
    shopCruelModeHighlight: false,
    gamblerDiceDialogOpen: false,
    investDialogOpen: false,
    idleModeDialog: { isOpen: false },
    inactivityDialogOpen: false,
    restartGameDialogOpen: false,
    deleteAccountDialogOpen: false,
    playlightWelcomeDialogOpen: false,
    feedbackDialogOpen: false,
    socialPromptDialogOpen: false,
    rewardDialog: { isOpen: false, data: null },
    leaderboardDialogOpen: false,
    shareDialogOpen: false,
    fullGamePurchaseDialogOpen: false,
    shopCheckoutItemId: null,
    madnessDialog: { isOpen: false, data: null },
    insightPotionDialog: { isOpen: false, data: null },
    investmentResultDialog: { isOpen: false, data: null },
    versionCheckDialogOpen: false,
  };
}

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

const TRADER_SHOP_UNLOCK_V2_APPLIED_KEY = "traderShopUnlockV2Applied";

/**
 * One-time load migration: before `traderSettles`, the real-money Trader tab unlocked at
 * `tradePost >= 1`. Grandfather those saves on first load after the story gate shipped.
 * New games get `traderShopUnlockV2Applied` on first load while `tradePost` is still 0, so
 * building a trade post later still requires the `traderSettles` event.
 */
export function migrateTraderShopUnlockOnLoad(
  state: Pick<GameState, "buildings" | "story" | "traderDialogOpens">,
): Partial<Pick<GameState, "story">> | null {
  const seen = { ...(state.story?.seen ?? {}) };
  if (seen[TRADER_SHOP_UNLOCK_V2_APPLIED_KEY]) return null;

  const tradePost = state.buildings?.tradePost ?? 0;
  const dialogOpens = state.traderDialogOpens ?? 0;
  const shouldGrandfatherUnlock =
    !seen.traderSettled && (tradePost >= 1 || dialogOpens > 0);

  seen[TRADER_SHOP_UNLOCK_V2_APPLIED_KEY] = true;
  if (shouldGrandfatherUnlock) {
    seen.traderSettled = true;
  }

  return {
    story: {
      ...state.story,
      seen,
      merchantPurchases: state.story?.merchantPurchases ?? 0,
    },
  };
}

/** Any completed real-money shop purchase (paid checkout or activated owned item). */
export function hasAnyShopPurchase(state: {
  hasMadeNonFreePurchase?: boolean;
  activatedPurchases?: Record<string, boolean>;
}): boolean {
  if (state.hasMadeNonFreePurchase) return true;
  return Object.values(state.activatedPurchases ?? {}).some(Boolean);
}

/** Real-money Trader tab unlocks after `traderSettles` (or mid-session shop opens before that flag is saved). */
export function isTraderShopUnlocked(state: {
  story?: { seen?: Record<string, unknown> };
  traderDialogOpens?: number;
}): boolean {
  if (state.story?.seen?.traderSettled) return true;
  if ((state.traderDialogOpens ?? 0) > 0) return true;
  return false;
}

type InFlightExecutionSlice = {
  executionStartTimes?: Record<string, number>;
  executionDurations?: Record<string, number>;
  executionAbortEligible?: Record<string, boolean>;
  executionSpendSnapshots?: Record<string, unknown>;
  expeditionVillagers?: Record<string, number>;
};

/**
 * Keep valid in-flight executions from a save so reload can resume the progress
 * bar; drop corrupt/orphan entries that would block buttons forever (e.g.
 * startTime without duration). Expedition villagers stay locked only for
 * resumed actions; stranded locks from dropped entries return to the free pool.
 */
export function reconcileInFlightExecutionsOnLoad(
  state: GameState,
  now = Date.now(),
): GameState {
  const slice = state as GameState & InFlightExecutionSlice;
  const rawStart = slice.executionStartTimes ?? {};
  const rawDur = slice.executionDurations ?? {};
  const rawAbort = slice.executionAbortEligible ?? {};
  const rawSpend = { ...(slice.executionSpendSnapshots ?? {}) };
  const rawExpedition = slice.expeditionVillagers ?? {};

  const executionStartTimes: Record<string, number> = {};
  const executionDurations: Record<string, number> = {};
  const executionAbortEligible: Record<string, boolean> = {};
  const executionSpendSnapshots: Record<string, unknown> = {};
  const expeditionVillagers: Record<string, number> = {};

  const actionIds = new Set([
    ...Object.keys(rawStart),
    ...Object.keys(rawDur),
    ...Object.keys(rawExpedition),
  ]);

  for (const actionId of actionIds) {
    if (!getGameActions()[actionId]) {
      continue;
    }

    let startTime = rawStart[actionId];
    let durationSec = rawDur[actionId];

    if (typeof startTime !== "number" || !Number.isFinite(startTime)) {
      continue;
    }
    if (
      typeof durationSec !== "number" ||
      !Number.isFinite(durationSec) ||
      durationSec <= 0
    ) {
      durationSec = getExecutionTime(actionId, state);
    }
    if (durationSec <= 0) {
      continue;
    }

    if (startTime > now) {
      startTime = now;
    }

    executionStartTimes[actionId] = startTime;
    executionDurations[actionId] = durationSec;
    if (rawAbort[actionId]) {
      executionAbortEligible[actionId] = true;
    }
    if (rawSpend[actionId]) {
      executionSpendSnapshots[actionId] = rawSpend[actionId];
    }
    const locked = rawExpedition[actionId];
    if (typeof locked === "number" && locked > 0) {
      expeditionVillagers[actionId] = locked;
    }
  }

  let strandedExpeditionVillagers = 0;
  for (const [actionId, count] of Object.entries(rawExpedition)) {
    if (!executionStartTimes[actionId]) {
      strandedExpeditionVillagers += count || 0;
    }
  }

  const villagers =
    strandedExpeditionVillagers > 0
      ? {
        ...state.villagers,
        free: (state.villagers?.free || 0) + strandedExpeditionVillagers,
      }
      : state.villagers;

  return {
    ...state,
    villagers,
    executionStartTimes,
    executionDurations,
    executionAbortEligible,
    executionSpendSnapshots,
    expeditionVillagers,
    constructionBoostsUsed: Object.fromEntries(
      Object.entries(state.constructionBoostsUsed ?? {}).filter(([actionId]) =>
        Boolean(executionStartTimes[actionId]),
      ),
    ),
  } as GameState;
}

/** Default post-completion wave counter on older saves. */
export function migratePostCompletionAttackWavesOnLoad(
  state: GameState,
): Partial<GameState> | null {
  if (state.postCompletionAttackWaveCount !== undefined) {
    return null;
  }
  return { postCompletionAttackWaveCount: 0 };
}

/** Run one-time load migrations on loaded saves (trader shop unlock gate). */
export function applyGameStateLoadMigrations(state: GameState): GameState {
  let migrated = reconcileInFlightExecutionsOnLoad(state);
  const trader = migrateTraderShopUnlockOnLoad(migrated);
  if (trader?.story) {
    migrated = { ...migrated, story: trader.story };
  }
  const postCompletion = migratePostCompletionAttackWavesOnLoad(migrated);
  if (postCompletion) {
    migrated = { ...migrated, ...postCompletion };
  }
  const presetPurchases = migrateVillagerPresetsPurchasedOnLoad(migrated);
  if (presetPurchases) {
    migrated = { ...migrated, ...presetPurchases };
  }
  if (
    !migrated.boostApplied &&
    (migrated as { boostMode?: boolean }).boostMode === true
  ) {
    migrated = { ...migrated, boostApplied: true };
  }
  return migrated;
}

/** Footer Trader button: normal tab unlock, or cruel mode, or any prior shop purchase. */
export function isTraderFooterShopVisible(state: {
  story?: { seen?: Record<string, unknown> };
  traderDialogOpens?: number;
  cruelMode?: boolean;
  devMode?: boolean;
  hasMadeNonFreePurchase?: boolean;
  activatedPurchases?: Record<string, boolean>;
}): boolean {
  if (state.devMode) return true;
  if (state.cruelMode) return true;
  if (hasAnyShopPurchase(state)) return true;
  return isTraderShopUnlocked(state);
}

/** Slice of a timed debuff stored on game state (disgust, fog, etc.). */
export type TimedDebuffSlice = {
  isActive?: boolean;
  endTime?: number;
  duration?: number;
};

export type StackedTimedDebuff = {
  isActive: true;
  endTime: number;
  duration: number;
};

/**
 * Extend an active timed debuff by stacking duration on its current end time.
 * If inactive or expired, starts a fresh window from `now`.
 * `duration` is the total remaining span from `now` (for UI progress rings).
 */
export function stackTimedDebuff(
  current: TimedDebuffSlice | undefined,
  additionalDurationMs: number,
  now = Date.now(),
): StackedTimedDebuff {
  const active =
    current?.isActive === true && (current.endTime ?? 0) > now;
  const baseEnd = active ? current!.endTime! : now;
  const endTime = baseEnd + additionalDurationMs;
  return {
    isActive: true,
    endTime,
    duration: endTime - now,
  };
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