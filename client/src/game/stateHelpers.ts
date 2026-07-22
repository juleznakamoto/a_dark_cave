import { GameState, gameStateSchema } from "@shared/schema";
import { overlayToolsFromStorySeen } from "@shared/rebuildToolsFromStorySeen";
import { repairUnlockFlags } from "@shared/repairUnlockFlags";
import type { CombatResultSummary } from "./types";
import { getCurrentPopulation, getMaxPopulation, getVillagersInVillage } from "./population";
import {
  isResourceLimited,
  getResourceLimit,
  capResourceToLimit,
} from "./resourceLimits";
import {
  collectStorageMaxHitUpdates,
  getLifetimeStorageMaxHits,
} from "./resourceStorageMax";
import { getTotalEventDeathReduction } from "./rules/effectsCalculation";
import { getVillagerCapForJob } from "./villagerCapUpgrades";
import { getExecutionTime } from "./rules/executionTime";
import { GAME_CONSTANTS } from "./constants";
import { getGameActions } from "./rules/actionsRegistry";
import { migrateVillagerPresetsPurchasedOnLoad } from "./villagerJobPresets";
import { isSteamBuild } from "@/lib/edition";

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

  const insightSpent =
    resource === "insight" && amount < 0
      ? Math.max(0, currentAmount - cappedAmount)
      : 0;
  const storageMaxHits = collectStorageMaxHitUpdates(state, {
    [resource]: cappedAmount,
  });
  const storySeenPatch: Record<string, boolean | number> = {
    ...storageMaxHits.storySeen,
  };
  if (insightSpent > 0) {
    storySeenPatch.totalInsightSpent =
      (Number(state.story?.seen?.totalInsightSpent) || 0) + insightSpent;
  }
  const hasStoryPatch = Object.keys(storySeenPatch).length > 0;

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
    ...(hasStoryPatch && {
      story: {
        ...state.story,
        seen: {
          ...state.story?.seen,
          ...storySeenPatch,
        },
      },
    }),
    ...(storageMaxHits.lifetimeStorageMaxHits && {
      lifetimeStorageMaxHits: storageMaxHits.lifetimeStorageMaxHits,
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
  let insightSpent = 0;

  for (const [key, delta] of Object.entries(deltas)) {
    if (typeof delta !== 'number' || delta === 0) continue;
    const resource = key as keyof GameState['resources'];
    const currentAmount = newResources[resource] || 0;
    const newAmount = Math.max(0, currentAmount + delta);
    const cappedAmount = capResourceToLimit(resource, newAmount, state);
    if (resource === "insight" && delta < 0) {
      insightSpent += Math.max(0, currentAmount - cappedAmount);
    }
    newResources[resource] = cappedAmount;
    if (isResourceLimited(resource, state) && cappedAmount >= limit) {
      reachedLimit = true;
    }
  }

  const storageMaxHits = collectStorageMaxHitUpdates(state, newResources);
  const storySeenPatch: Record<string, boolean | number> = {
    ...storageMaxHits.storySeen,
  };
  if (insightSpent > 0) {
    storySeenPatch.totalInsightSpent =
      (Number(state.story?.seen?.totalInsightSpent) || 0) + insightSpent;
  }
  const hasStoryPatch = Object.keys(storySeenPatch).length > 0;

  return {
    resources: newResources,
    seenResources: markSeenResources(state.seenResources, newResources),
    ...(reachedLimit && !state.flags.hasHitResourceLimit && {
      flags: {
        ...state.flags,
        hasHitResourceLimit: true,
      },
    }),
    ...(hasStoryPatch && {
      story: {
        ...state.story,
        seen: {
          ...state.story?.seen,
          ...storySeenPatch,
        },
      },
    }),
    ...(storageMaxHits.lifetimeStorageMaxHits && {
      lifetimeStorageMaxHits: storageMaxHits.lifetimeStorageMaxHits,
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

/**
 * Enforce housing cap as an invariant: if headcount (in-village + active
 * expeditions) exceeds `getMaxPopulation`, remove excess from `free` first,
 * then from assigned jobs in stable key order.
 *
 * Used on load (corrupt/legacy saves) and whenever population is refreshed
 * after housing changes. Does not increment death stats — this is integrity
 * enforcement, not a narrative casualty.
 */
export function clampVillagersToHousingCap(
  state: GameState,
  now = Date.now(),
): Partial<GameState> | null {
  const maxPop = getMaxPopulation(state);
  const current = getCurrentPopulation(state, now);
  if (current <= maxPop) return null;

  const inVillage = getVillagersInVillage(state);
  const activeExpedition = current - inVillage;
  // Active expeditions still count against housing; only in-village can be cut.
  const maxInVillage = Math.max(0, maxPop - activeExpedition);
  let remaining = inVillage - maxInVillage;
  if (remaining <= 0) return null;

  const updatedVillagers = { ...state.villagers };

  const freeCount = updatedVillagers.free || 0;
  const freeToRemove = Math.min(remaining, freeCount);
  if (freeToRemove > 0) {
    updatedVillagers.free = freeCount - freeToRemove;
    remaining -= freeToRemove;
  }

  if (remaining > 0) {
    const jobKeys = (
      Object.keys(updatedVillagers) as Array<keyof typeof updatedVillagers>
    )
      .filter((key) => key !== "free")
      .sort();

    for (const job of jobKeys) {
      if (remaining <= 0) break;
      const count = updatedVillagers[job] || 0;
      if (count <= 0) continue;
      const remove = Math.min(remaining, count);
      updatedVillagers[job] = count - remove;
      remaining -= remove;
    }
  }

  const nextState: GameState = { ...state, villagers: updatedVillagers };
  return {
    villagers: updatedVillagers,
    ...updatePopulationCounts(nextState),
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
  'devGameMode',
  'lastSaved',
  'eventDialog',
  'combatDialog',
  'authDialogOpen',
  'shopDialogOpen',
  'shopFilter',
  'investDialogOpen',
  'investmentResultDialog',
  'idleModeDialog',
  'inactivityDialogOpen',
  'inactivityReason',
  'restartGameDialogOpen',
  'deleteAccountDialogOpen',
  'settingsDialogOpen',
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
  'galaxyTimeUpDialogOpen',
  'shopCheckoutItemId',
  'madnessDialog',
  'insightPotionDialog',
  'villageEffectDialog',
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
    shopFilter: null,
    gamblerDiceDialogOpen: false,
    investDialogOpen: false,
    idleModeDialog: { isOpen: false },
    inactivityDialogOpen: false,
    restartGameDialogOpen: false,
    deleteAccountDialogOpen: false,
    settingsDialogOpen: false,
    playlightWelcomeDialogOpen: false,
    feedbackDialogOpen: false,
    socialPromptDialogOpen: false,
    rewardDialog: { isOpen: false, data: null },
    leaderboardDialogOpen: false,
    shareDialogOpen: false,
    fullGamePurchaseDialogOpen: false,
    galaxyTimeUpDialogOpen: false,
    shopCheckoutItemId: null,
    madnessDialog: { isOpen: false, data: null },
    insightPotionDialog: { isOpen: false, data: null },
    villageEffectDialog: { isOpen: false, data: null },
    investmentResultDialog: { isOpen: false, data: null },
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
 * True when a one-shot action's completion flag is already set in `story.seen`.
 * Used to drop cloud deep-merge ghosts that would re-complete (and re-refund
 * expedition villagers) on every reload.
 *
 * Matches `show_when` gates like:
 * - `"!story.seen.swampSanctuaryExplored": true`
 * - `"story.seen.occultistChamberExplored": false`
 */
export function isCompletedOneShotExecutionGhost(
  actionId: string,
  state: GameState,
): boolean {
  const action = getGameActions()[actionId];
  const showWhen = action?.show_when;
  if (!showWhen || typeof showWhen !== "object") return false;

  const keys = Object.keys(showWhen);
  // Tiered merchant-style show_when uses numeric keys — skip those.
  if (keys.some((key) => /^\d+$/.test(key))) return false;

  const seen = state.story?.seen ?? {};

  for (const [path, expectedValue] of Object.entries(showWhen)) {
    if (path.startsWith("!story.seen.") && expectedValue === true) {
      const flag = path.slice("!story.seen.".length);
      if (seen[flag as keyof typeof seen]) return true;
    }
    if (path.startsWith("story.seen.") && expectedValue === false) {
      const flag = path.slice("story.seen.".length);
      if (seen[flag as keyof typeof seen]) return true;
    }
  }

  return false;
}

/**
 * Keep valid in-flight executions from a save so reload can resume the progress
 * bar; drop corrupt/orphan entries that would block buttons forever (e.g.
 * startTime without duration). Expedition villagers stay locked only for
 * resumed actions; stranded locks from dropped entries return to the free pool.
 *
 * Completed one-shot expeditions that linger in cloud JSONB (deep-merge cannot
 * delete keys) are dropped without refunding — villagers were already returned
 * on the real completion.
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
  /** Completed one-shots kept as merge ghosts — do not refund their locks. */
  const completedGhostActionIds = new Set<string>();

  const actionIds = new Set([
    ...Object.keys(rawStart),
    ...Object.keys(rawDur),
    ...Object.keys(rawExpedition),
  ]);

  for (const actionId of actionIds) {
    const isCallMerchant = actionId === "callMerchant";
    if (!isCallMerchant && !getGameActions()[actionId]) {
      continue;
    }

    if (!isCallMerchant && isCompletedOneShotExecutionGhost(actionId, state)) {
      completedGhostActionIds.add(actionId);
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
      durationSec = isCallMerchant
        ? GAME_CONSTANTS.CALL_MERCHANT_EXECUTION_SECONDS
        : getExecutionTime(actionId, state);
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
    if (completedGhostActionIds.has(actionId)) {
      continue;
    }
    if (!executionStartTimes[actionId]) {
      strandedExpeditionVillagers += count || 0;
    }
  }

  const inVillage = getVillagersInVillage(state);
  const maxPop = getMaxPopulation(state);
  const free = state.villagers?.free ?? 0;
  // Ghost expedition locks: villagers already returned to the village pool but
  // cloud JSONB deep-merge kept stale expedition keys. If in-village headcount
  // is already at/over housing, refunding would duplicate them into `free`.
  const isGhostExpeditionLock =
    strandedExpeditionVillagers > 0 && inVillage >= maxPop;

  const villagers =
    strandedExpeditionVillagers > 0 && !isGhostExpeditionLock
      ? {
        ...state.villagers,
        free: free + strandedExpeditionVillagers,
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

/** Steam has no paid shop slots; strip any persisted shop slot counts on load. */
function migrateSteamShopSlotsOnLoad(state: GameState): Partial<GameState> | null {
  if (!isSteamBuild) return null;

  const presetSlots = state.villagerPresetSlotsFromShop ?? 0;
  const queueSlots = state.constructionQueueSlotsFromShop ?? 0;
  if (presetSlots === 0 && queueSlots === 0) return null;

  return {
    villagerPresetSlotsFromShop: 0,
    constructionQueueSlotsFromShop: 0,
  };
}

/**
 * Backfill permanent item slices from schema defaults when a loaded save omits them.
 * Rebuilds owned craft tools from `story.seen` when flags exist but the tools slice
 * is missing or empty (cloud corruption loop).
 * Also merges/repairs tab-unlock flags from progression evidence (village/forest/bastion).
 */
export function hydrateLoadedGameState<T extends Partial<GameState>>(
  savedState: T,
): T & Pick<GameState, "tools" | "weapons" | "books" | "flags"> {
  const defaults = gameStateSchema.parse({});
  const mergedTools = {
    ...defaults.tools,
    ...savedState.tools,
  };
  const withItems = {
    ...savedState,
    tools: overlayToolsFromStorySeen(mergedTools, savedState.story?.seen),
    weapons: {
      ...defaults.weapons,
      ...savedState.weapons,
    },
    books: {
      ...defaults.books,
      ...savedState.books,
    },
  };
  return repairUnlockFlags(withItems, defaults.flags);
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
  const steamShopSlots = migrateSteamShopSlotsOnLoad(migrated);
  if (steamShopSlots) {
    migrated = { ...migrated, ...steamShopSlots };
  }
  // After expedition reconcile (and any other load repairs), enforce housing cap
  // so legacy/corrupt over-population cannot persist into the live session.
  const housingClamp = clampVillagersToHousingCap(migrated);
  if (housingClamp) {
    migrated = { ...migrated, ...housingClamp };
  }
  // Lift legacy story.seen storageMaxHit_* flags into lifetime Resource Maxer hits.
  const lifetimeHits = getLifetimeStorageMaxHits(migrated);
  if (
    lifetimeHits.length >
    (migrated.lifetimeStorageMaxHits?.length ?? 0)
  ) {
    migrated = { ...migrated, lifetimeStorageMaxHits: lifetimeHits };
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