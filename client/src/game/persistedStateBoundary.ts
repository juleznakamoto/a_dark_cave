import { gameStateSchema, type GameState } from "@shared/schema";
import {
  getDialogRuntimeOnlyKeys,
  getTransientDialogResetFromRegistry,
} from "./dialogRegistry";

/** Schema keys that must never be written into save blobs. */
export const SCHEMA_KEYS_STRIPPED_ON_SAVE = [
  "isUserSignedIn",
  "current_population",
  "total_population",
] as const;

/**
 * Keys persisted intentionally but absent/mismatched in schema.
 * Keep execution timers and timed visits so refresh can resume mid-action.
 */
export const PERSISTED_STORE_EXTENSION_KEYS = [
  "executionStartTimes",
  "executionDurations",
  "executionAbortEligible",
  "executionSpendSnapshots",
  "cooldownDurations",
  "initialCooldowns",
  "timedEventTab",
  "loopProgress",
  "isGameLoopActive",
  "isPaused",
  "musicMuted",
  "sfxMuted",
  "musicVolume",
  "sfxVolume",
  "highlightedResources",
  "game_stats",
] as const;

/** Non-dialog runtime-only store keys that must never persist from the store snapshot. */
export const RUNTIME_ONLY_NON_DIALOG_KEYS = [
  "activeTab",
  "devMode",
  "devGameMode",
  "activeDevSaveId",
  // save.ts stamps lastSaved onto the sanitized blob after buildGameState.
  "lastSaved",
  "resourceChangeEvents",
  "signUpPromptEligibleForGold",
  "inactivityReason",
  "insightRevealing",
  "_completingExecution",
  "compassGlowButton",
  "isPausedPreviously",
  "demoEndDialogDismissed",
] as const;

const TIMED_EVENT_TAB_PERSISTED_KEYS = [
  "isActive",
  "event",
  "expiryTime",
  "startTime",
  "gamblerRoundsRemaining",
  "collectorBuyAvailable",
  "collectorSellAvailable",
  "collectorBuyDone",
  "collectorSellDone",
  "collectorBuyChoiceId",
  "collectorSellChoiceId",
  "collectorPendingRewards",
] as const;

let cachedSchemaKeys: readonly string[] | null = null;

export function getSchemaPersistedKeys(): readonly string[] {
  if (!cachedSchemaKeys) {
    cachedSchemaKeys = Object.keys(gameStateSchema.shape);
  }
  return cachedSchemaKeys;
}

export function getRuntimeOnlyStoreKeys(): readonly string[] {
  return [...getDialogRuntimeOnlyKeys(), ...RUNTIME_ONLY_NON_DIALOG_KEYS];
}

export function getPersistedStoreKeys(): readonly string[] {
  const stripped = new Set<string>(SCHEMA_KEYS_STRIPPED_ON_SAVE);
  const schemaKeys = getSchemaPersistedKeys().filter((key) => !stripped.has(key));
  return [...new Set([...schemaKeys, ...PERSISTED_STORE_EXTENSION_KEYS])];
}

export function serializeTimedEventTabForSave(
  tab: Record<string, unknown> | null | undefined,
): Record<string, unknown> | undefined {
  if (!tab || typeof tab !== "object") return undefined;
  const out: Record<string, unknown> = {};
  for (const key of TIMED_EVENT_TAB_PERSISTED_KEYS) {
    if (key in tab) out[key] = tab[key];
  }
  return out;
}

/**
 * Build a clean GameState object from the Zustand store using an allowlist.
 * Unknown/runtime keys are omitted instead of silently persisting.
 */
export function buildPersistedGameState(state: Record<string, unknown>): GameState {
  const allowed = new Set(getPersistedStoreKeys());
  const cleaned: Record<string, unknown> = {};

  for (const key of allowed) {
    if (!(key in state)) continue;
    const value = state[key];
    if (typeof value === "function") continue;
    if (value === undefined) continue;

    if (key === "timedEventTab") {
      const serialized = serializeTimedEventTabForSave(
        value as Record<string, unknown>,
      );
      if (serialized) cleaned[key] = serialized;
      continue;
    }

    cleaned[key] = value;
  }

  // Always reset pause state when saving (never save as paused).
  cleaned.isPaused = false;

  return cleaned as GameState;
}

/** Closed dialog slices + session-only flags applied on load. */
export function getTransientDialogResetOnLoad(): Record<string, unknown> {
  return {
    ...getTransientDialogResetFromRegistry(),
    signUpPromptEligibleForGold: false,
    inactivityReason: null,
  };
}

/** @deprecated Prefer getRuntimeOnlyStoreKeys(); kept for one-release call-site compatibility. */
export const UI_ONLY_PROPERTIES = getRuntimeOnlyStoreKeys();
