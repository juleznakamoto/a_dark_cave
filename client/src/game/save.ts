import { GameState, SaveData, REFERRAL_REWARD_GOLD } from "@shared/schema";
import { mergeReferralLists } from "@shared/referralMerge";
import {
  saveGameToSupabase,
  loadGameFromSupabase,
  getCurrentUser,
  getCurrentUserForLoad,
  flushPendingReferralToUserMetadata,
  processReferralAfterConfirmation,
} from "./auth";
import { logger } from "@/lib/logger";
import { getSupabaseClient } from "@/lib/supabase";
import {
  encodeLocalGameState,
  encodeLocalSave,
  decodeLocalGameState,
  decodeLocalSave,
} from "./saveCodec";
import { tWithFallback } from "@/i18n/resolveGameText";
import { syncSocialPromoExclusiveRewardPending } from "./socialPromoExclusiveReward";
import { buildGameState } from "./stateHelpers";
import { isLocalOnlyEdition, isSteamBuild } from "@/lib/edition";
import {
  writeSteamCloudSave,
  readSteamCloudSave,
  pickNewerSave,
} from "./steamSaveAdapter";
import {
  needsPlaytimeOverwriteForSync,
  pickPreferredSave,
  shouldAllowPlaytimeOverwrite,
} from "./saveConflict";
import {
  getGameSaveDatabase,
  getSaveKey,
  LAST_CLOUD_STATE_KEY,
} from "./saveStorage";
import {
  clearStartupSaveHeader,
  writeStartupSaveHeader,
} from "./startupSaveHeader";
const isDev = import.meta.env.DEV;

export type SaveGameResult = {
  localSaved: boolean;
  cloudSaved: boolean;
  /** Cloud intentionally skipped (guest / local-only / inactive dialog). */
  cloudSkipped: boolean;
};

export type LoadGameResult =
  | { status: "loaded"; state: GameState }
  | { status: "not-found" }
  | { status: "error"; error: unknown; retryable: boolean };

class InvalidLocalSaveError extends Error {
  constructor() {
    super("The local save exists but could not be decoded");
    this.name = "InvalidLocalSaveError";
  }
}

const SAVE_SKIPPED: SaveGameResult = {
  localSaved: false,
  cloudSaved: false,
  cloudSkipped: true,
};

async function clearPlaytimeOverwriteFlags(): Promise<void> {
  const { useGameStore } = await import("./state");
  useGameStore.setState({
    allowPlayTimeOverwrite: false,
    // Legacy typo key some restarts persisted
    allowPlaytimeOverwrite: false,
    isNewGame: false,
  } as never);
}

/** Normalize restart overwrite fields onto the schema key before persisting. */
function normalizePlaytimeOverwriteFields<T extends Record<string, unknown>>(
  state: T,
): T {
  const legacy = (state as { allowPlaytimeOverwrite?: boolean })
    .allowPlaytimeOverwrite;
  // Do not promote `isNewGame` → overwrite. A fresh Light Fire on another device
  // is a new game, but must not be allowed to wipe a longer cloud save on login.
  if (legacy === true || state.allowPlayTimeOverwrite === true) {
    (state as { allowPlayTimeOverwrite?: boolean }).allowPlayTimeOverwrite =
      state.allowPlayTimeOverwrite === true || legacy === true;
  }
  delete (state as { allowPlaytimeOverwrite?: boolean }).allowPlaytimeOverwrite;
  return state;
}

/**
 * Cloud save full-document replace on the V1 path (`game_state`).
 * On by default for new clients. Rollback to diff + deep-merge: `VITE_SAVE_FULL_REPLACE=0`.
 * Requires migration 030 + updated `save-game` edge function.
 */
export function isSaveFullReplaceEnabled(): boolean {
  return import.meta.env.VITE_SAVE_FULL_REPLACE !== "0";
}

/**
 * Top-level slices always written in full on cloud save (not only when the diff
 * thinks they changed). Omitted keys + JSONB deep-merge into an empty/partial row
 * permanently drops progression (tools wipe, missing tab flags, missing buildings).
 */
const ALWAYS_FULL_CLOUD_SLICES = [
  // Ownership / unlock maps (same class as the original tools/flags fix)
  "tools",
  "weapons",
  "books",
  "flags",
  "buildings",
  "clothing",
  "schematics",
  "relics",
  "blessings",
  "fellowship",
  // Core progression — often unchanged for a stretch, catastrophic if omitted
  "stats",
  "story",
  "villagers",
  "resources",
  // Mid/late progression maps missed by the same sparse first-write path
  "bastion_stats",
  "sleepUpgrades",
  "combatSkills",
  "huntingSkills",
  "chainmasterSkills",
  "crowsEyeSkills",
  "disgracedPriorSkills",
  "weaponEnchantments",
  "absolvedItems",
  "merchantTrades",
  "triggeredEvents",
  "effects",
  "unlockedAchievements",
  "claimedAchievements",
  "buttonUpgrades",
] as const satisfies ReadonlyArray<keyof GameState>;

/**
 * Delete-semantic maps: completed actions remove keys; diffs cannot express deletes.
 * Some keys live on the runtime store / sanitized blob but are not all on the Zod
 * `GameState` type — keep this list untyped against `keyof GameState`.
 */
const ALWAYS_FULL_DELETE_SEMANTIC_CLOUD_SLICES = [
  "expeditionVillagers",
  "executionStartTimes",
  "executionDurations",
  "executionAbortEligible",
  "executionSpendSnapshots",
  "constructionBoostsUsed",
] as const;

/**
 * Order-independent deep equality with early exit on first difference.
 *
 * Used by the save diff instead of `JSON.stringify(a) !== JSON.stringify(b)`: for large
 * append-only objects (e.g. `story.seen`, `triggeredEvents`, `eventCooldowns`) this avoids
 * building two big JSON strings on every cloud save and bails as soon as a value differs.
 * Both inputs are JSON-clean (no functions/undefined) since they come from JSON round-trips.
 */
function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (a === null || b === null) return a === b;
  if (typeof a !== "object" || typeof b !== "object") return a === b;

  const aIsArray = Array.isArray(a);
  if (aIsArray !== Array.isArray(b)) return false;

  if (aIsArray) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  for (const key of aKeys) {
    if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
    if (!deepEqual(a[key], b[key])) return false;
  }
  return true;
}

// Calculate diff between two states
function calculateStateDiff(
  oldState: GameState | null,
  newState: GameState,
): Partial<GameState> {
  if (!oldState) return newState; // First save, send everything

  const diff: any = {};

  // Helper to check if values are different
  const isDifferent = (a: any, b: any): boolean => {
    if (typeof a !== typeof b) return true;
    if (a === b) return false;
    if (a === null || b === null) return true;
    if (typeof a === "object") {
      // Early-exit deep compare instead of stringifying both sides (cheaper for large objects).
      return !deepEqual(a, b);
    }
    return true;
  };

  // Compare all top-level properties
  for (const key in newState) {
    const newValue = newState[key as keyof GameState];
    const oldValue = oldState[key as keyof GameState];

    // playTime: compare floored ms so float jitter does not spuriously include it in the diff
    if (key === "playTime") {
      const newPt = Math.floor(Number(newValue) || 0);
      const oldPt = Math.floor(Number(oldValue) || 0);
      if (newPt > oldPt) {
        diff[key] = newValue;
      }
      continue;
    }

    if (isDifferent(oldValue, newValue)) {
      diff[key] = newValue;
    }
  }

  return diff;
}

/** Drop playTime from an outgoing diff when it has not advanced since lastCloudState. */
function omitPlayTimeFromDiffIfUnchanged(
  diff: Partial<GameState>,
  lastCloudState: GameState | null,
  newState: GameState,
): Partial<GameState> {
  if (!("playTime" in diff) || lastCloudState === null) {
    return diff;
  }

  const newPlayTime = Math.floor(
    Number(diff.playTime ?? newState.playTime ?? 0),
  );
  const baselinePlayTime = Math.floor(Number(lastCloudState.playTime ?? 0));

  if (newPlayTime <= baselinePlayTime) {
    const { playTime: _removed, ...rest } = diff;
    return rest;
  }

  return diff;
}

// Merge diff into existing state
function mergeStateDiff(
  baseState: GameState,
  diff: Partial<GameState>,
): GameState {
  return { ...baseState, ...diff };
}

/** Reconcile `GameState.playTime` with top-level save metadata (they can drift; envelope is authoritative for OCC/comparisons). */
function mergeSavePlayTimeIntoState(
  save: { playTime?: number },
  state: GameState,
): GameState {
  const top = Math.floor(save.playTime ?? 0);
  const emb = Math.floor(state.playTime ?? 0);
  const merged = Math.max(top, emb);
  if (merged === emb) return state;
  return { ...state, playTime: merged };
}

async function putLocalSave(
  db: Awaited<ReturnType<typeof getGameSaveDatabase>>,
  data: SaveData,
): Promise<void> {
  const encoded = encodeLocalSave(data);
  await db.put("saves", encoded, getSaveKey());
  writeStartupSaveHeader(data);
  // Steam build: also mirror to the Steam Cloud file (no-op on web).
  if (isSteamBuild) {
    await writeSteamCloudSave(encoded);
  }
}

async function getLocalSave(
  db: Awaited<ReturnType<typeof getGameSaveDatabase>>,
): Promise<SaveData | undefined> {
  const raw = await db.get("saves", getSaveKey());
  const decoded = decodeLocalSave(raw);
  if (raw !== undefined && raw !== null && !decoded) {
    throw new InvalidLocalSaveError();
  }
  const local = decoded ?? undefined;
  // Steam build: reconcile IndexedDB with the cloud-synced file (newer wins).
  if (isSteamBuild) {
    const cloud = await readSteamCloudSave();
    return pickNewerSave(local, cloud);
  }
  return local;
}

async function putLastCloudState(
  db: Awaited<ReturnType<typeof getGameSaveDatabase>>,
  state: GameState,
): Promise<void> {
  await db.put("lastCloudState", encodeLocalGameState(state), LAST_CLOUD_STATE_KEY);
}

async function getLastCloudState(
  db: Awaited<ReturnType<typeof getGameSaveDatabase>>,
): Promise<GameState | undefined> {
  const raw = await db.get("lastCloudState", LAST_CLOUD_STATE_KEY);
  return decodeLocalGameState(raw) ?? undefined;
}

/** Sync local IndexedDB after cloud referral refresh (avoids duplicating codec in auth). */
export async function syncLocalSaveFromCloud(data: SaveData): Promise<void> {
  const db = await getGameSaveDatabase();
  await putLocalSave(db, data);
  await putLastCloudState(db, data.gameState);
}

/** Clear cloud diff baseline only (e.g. sign-out); local main save is kept. */
export async function clearLastCloudState(): Promise<void> {
  const db = await getGameSaveDatabase();
  await db.delete("lastCloudState", LAST_CLOUD_STATE_KEY);
}

/**
 * Server-side referral processing updates the referrer's cloud save directly.
 * When local IndexedDB has more playTime, load still prefers local — merge cloud
 * referrals so invite rewards are not lost. (SQL save path also union-merges.)
 */
export function mergeCloudReferralsIntoState(
  localState: GameState,
  cloudState: Pick<
    GameState,
    | "referrals"
    | "referralCount"
    | "referredUsers"
    | "referralProcessed"
    | "referralCode"
  >,
): GameState {
  const localRefs = Array.isArray(localState.referrals) ? localState.referrals : [];
  const cloudRefs = Array.isArray(cloudState.referrals) ? cloudState.referrals : [];

  const { referrals, referralCount, referredUsers } = mergeReferralLists(
    localRefs,
    cloudRefs,
    {
      localReferralCount: localState.referralCount ?? 0,
      cloudReferralCount: cloudState.referralCount ?? 0,
    },
  );

  const referralProcessed =
    localState.referralProcessed === true ||
    cloudState.referralProcessed === true;
  // Match SQL merge_game_state_referrals: btrim + treat empty as absent.
  // Never fall back to the untrimmed original (whitespace-only must be discarded).
  const localCode =
    typeof localState.referralCode === "string"
      ? localState.referralCode.trim()
      : "";
  const cloudCode =
    typeof cloudState.referralCode === "string"
      ? cloudState.referralCode.trim()
      : "";
  const referralCode = localCode || cloudCode || undefined;

  const listUnchanged =
    referrals.length === localRefs.length &&
    (localState.referralCount ?? 0) === referralCount &&
    localRefs.every(
      (entry, index) =>
        entry.userId === referrals[index]?.userId &&
        entry.claimed === referrals[index]?.claimed &&
        entry.timestamp === referrals[index]?.timestamp,
    );
  const inviteeUnchanged =
    (localState.referralProcessed === true) === referralProcessed &&
    (localState.referralCode ?? "") === (referralCode ?? "");

  if (listUnchanged && inviteeUnchanged) return localState;

  return {
    ...localState,
    referrals,
    referralCount,
    referredUsers,
    referralProcessed,
    referralCode,
  };
}

/** Serialize referral claiming so concurrent loadGame() paths cannot double-award (promise chain: swap gate before awaiting prev). */
let referralClaimGate = Promise.resolve();

async function processUnclaimedReferrals(
  gameState: GameState,
): Promise<GameState> {
  const prevGate = referralClaimGate;
  let release!: () => void;
  referralClaimGate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await prevGate;
  try {
    return await processUnclaimedReferralsImpl(gameState);
  } finally {
    release();
  }
}

async function processUnclaimedReferralsImpl(
  gameState: GameState,
): Promise<GameState> {
  const { useGameStore } = await import("./state");
  const currentUser = await getCurrentUser();

  logger.log('[REFERRAL] 🔍 Processing unclaimed referrals...', {
    hasUser: !!currentUser,
    hasReferrals: !!gameState.referrals,
    referralsCount: gameState.referrals?.length || 0,
    referrals: gameState.referrals,
  });

  // If no user or no referrals, return gameState as is
  if (
    !currentUser ||
    !gameState.referrals ||
    gameState.referrals.length === 0
  ) {
    logger.log('[REFERRAL] ⏭️ Skipping - no user or no referrals');
    return gameState;
  }

  let goldGained = 0;
  const logEntriesAdded: any[] = [];

  // Process unclaimed referrals
  const updatedReferrals = gameState.referrals.map((referral) => {
    if (!referral.claimed) {
      logger.log('[REFERRAL] 💰 Claiming referral:', {
        userId: referral.userId,
        timestamp: referral.timestamp,
      });

      goldGained += REFERRAL_REWARD_GOLD;
      logEntriesAdded.push({
        id: `referral-claimed-${referral.userId}-${Date.now()}`,
        timestamp: Date.now(),
        message: tWithFallback(
          "ui",
          "referral.invitedLog",
          `You invited someone new to this world! +${REFERRAL_REWARD_GOLD} Gold`,
          { amount: REFERRAL_REWARD_GOLD },
        ),
        type: "system",
      });

      return { ...referral, claimed: true };
    }
    return referral;
  });

  if (goldGained <= 0) {
    logger.log('[REFERRAL] ℹ️ No unclaimed referrals to process');
    return gameState;
  }

  const oldGold = gameState.resources?.gold || 0;
  const newGold = oldGold + goldGained;

  logger.log('[REFERRAL] ✅ Referral rewards ready (applied after cloud save):', {
    oldGold,
    goldGained,
    newGold,
    claimedCount: logEntriesAdded.length,
  });

  const cooldownDurations =
    (gameState as unknown as { cooldownDurations?: Record<string, number> })
      .cooldownDurations || {};

  const updatedGameState = {
    ...gameState,
    referrals: updatedReferrals,
    resources: {
      ...(gameState.resources ?? {}),
      gold: newGold,
    },
    log: [...(gameState.log || []), ...logEntriesAdded].slice(-100),
    cooldownDurations,
  };

  logger.log('[REFERRAL] 💾 Saving claimed referrals to Supabase...');
  try {
    // Omit playTime so cloud OCC does not reject saves where playTime did not increase since load.
    await saveGameToSupabase(
      {
        referrals: updatedReferrals,
        resources: updatedGameState.resources,
        log: updatedGameState.log,
      },
      undefined,
      false,
    );
    logger.log('[REFERRAL] ✅ Successfully saved claimed referrals to cloud');

    useGameStore.setState({
      resources: updatedGameState.resources,
      log: updatedGameState.log,
      referrals: updatedReferrals,
    });

    syncSocialPromoExclusiveRewardPending();

    return updatedGameState;
  } catch (error) {
    logger.error('[REFERRAL] ❌ Failed to save claimed referrals to cloud:', error);
    return gameState;
  }
}

export async function saveGame(
  gameState: GameState,
  isAutosave: boolean = true,
): Promise<SaveGameResult> {
  try {
    // Check if game is inactive - if so, don't save
    const { useGameStore } = await import("./state");
    const currentState = useGameStore.getState();
    if (currentState.inactivityDialogOpen) {
      logger.log("[SAVE] ⚠️ Game is inactive - skipping save");
      return SAVE_SKIPPED;
    }

    const db = await getGameSaveDatabase();

    // Strip UI-only store fields (dialog open flags, etc.) even when callers pass get().
    const persistedState = buildGameState(gameState);

    // Deep clone and sanitize the game state to remove non-serializable data
    let sanitizedState: any;
    try {
      // Omit undefined keys — persisting them as null breaks load (object spread / Object.entries).
      sanitizedState = JSON.parse(JSON.stringify(persistedState));
    } catch (parseError) {
      logger.warn("[SAVE] ⚠️ JSON serialization failed, using gameState directly:", parseError);
      // Fallback: use gameState directly if JSON round-trip fails
      sanitizedState = { ...gameState };
    }

    normalizePlaytimeOverwriteFields(sanitizedState);

    // Ensure cooldownDurations is always present
    if (!sanitizedState.cooldownDurations) {
      sanitizedState.cooldownDurations = {};
    }

    // Ensure startTime is always present for completion tracking
    if (!sanitizedState.startTime) {
      sanitizedState.startTime = Date.now();
    }

    // New-game saves must persist playTime 0 so load envelopes cannot keep a stale clock.
    if (sanitizedState.isNewGame === true) {
      sanitizedState.playTime = 0;
    }

    // Add timestamp to track save recency
    const now = Date.now();
    sanitizedState.lastSaved = now;

    // Stamp the running client build so cloud saves can be audited for stale bundles.
    const runningBuildSha =
      typeof __BUILD_SHA__ !== "undefined" ? __BUILD_SHA__ : "dev";
    sanitizedState.clientBuildSha = runningBuildSha;

    const playTimeForEnvelope =
      typeof sanitizedState.playTime === "number"
        ? sanitizedState.playTime
        : gameState.playTime;

    const saveData: SaveData = {
      gameState: sanitizedState,
      timestamp: now,
      playTime: playTimeForEnvelope,
    };

    // Save locally first (most important)
    await putLocalSave(db, saveData);

    const allowOverwrite = shouldAllowPlaytimeOverwrite(sanitizedState);

    // Local-only editions: no cloud. Still clear restart flags so they
    // do not stick forever in the store after a successful local write.
    if (isLocalOnlyEdition()) {
      if (allowOverwrite) {
        await clearPlaytimeOverwriteFlags();
      }
      return { localSaved: true, cloudSaved: false, cloudSkipped: true };
    }

    // Cloud gating must use the live session, not the persisted store flag.
    // Guest saves often rehydrate `isUserSignedIn: false` and would otherwise
    // skip cloud forever for confirmed accounts.
    try {
      const user = await getCurrentUser();
      if (!user) {
        // Guest / signed-out: no cloud document to replace.
        if (allowOverwrite) {
          await clearPlaytimeOverwriteFlags();
        }
        return { localSaved: true, cloudSaved: false, cloudSkipped: true };
      }

      // Heal store/auth desync so autosave interval + UI match the session.
      // We already resolved a confirmed user above; write the flag directly.
      if (!currentState.isUserSignedIn) {
        useGameStore.setState({ isUserSignedIn: true });
      }

      const isNewGame = sanitizedState.isNewGame === true;

      // If gender not yet detected and not yet attempted, try once via internal service
      if (!sanitizedState.g && !sanitizedState.g_fn_checked) {
        sanitizedState.g_fn_checked = true;
        try {
          const supabaseClient = await getSupabaseClient();
          const { data: { session } } = await supabaseClient.auth.getSession();
          if (session?.access_token) {
            const res = await fetch("/api/gender", {
              method: "POST",
              headers: { Authorization: `Bearer ${session.access_token}` },
            });
            if (res.ok) {
              const { g, fn } = await res.json();
              if (g === "m" || g === "f") {
                sanitizedState.g = g;
                if (fn) sanitizedState.fn = fn;
                useGameStore.setState({ g, ...(fn && { fn }), g_fn_checked: true });
              } else {
                useGameStore.setState({ g_fn_checked: true });
              }
            } else {
              const errBody = await res.json().catch(() => ({}));
              logger.warn("[SAVE] Gender detection failed:", res.status, errBody.error ?? errBody.hint ?? res.statusText);
              useGameStore.setState({ g_fn_checked: true });
            }
          }
        } catch (e) {
          logger.warn("[SAVE] Gender detection skipped:", e);
        }
      }

      // Get and reset click analytics
      const clickData = useGameStore.getState().getAndResetClickAnalytics();

      // Get resource snapshot only during autosaves (when game loop is running)
      // This ensures resources are tracked at consistent intervals with proper playTime
      const resourceData = isAutosave
        ? useGameStore.getState().getAndResetResourceAnalytics()
        : null;

      // Log snapshot to verify stats are included
      if (resourceData) {
        const hasStats = Object.keys(resourceData).some(key =>
          ['luck', 'strength', 'knowledge', 'madness'].includes(key)
        );
        logger.log('[SAVE CLOUD] 📊 Resource snapshot includes stats:', {
          hasStats,
          statsKeys: Object.keys(resourceData).filter(key =>
            ['luck', 'strength', 'knowledge', 'madness'].includes(key)
          ),
          snapshotKeys: Object.keys(resourceData),
        });
      }

      const fullReplace = isSaveFullReplaceEnabled();
      let stateDiff: Partial<GameState>;

      if (fullReplace) {
        // Full document — server stores as game_state when p_full_replace=true.
        stateDiff = sanitizedState as Partial<GameState>;
        if (stateDiff.playTime !== undefined) {
          stateDiff.playTime = Math.floor(Number(stateDiff.playTime));
        }
      } else {
        // Legacy path: diff + deep-merge (old clients / kill switch).
        const lastCloudState = await getLastCloudState(db);
        stateDiff = omitPlayTimeFromDiffIfUnchanged(
          calculateStateDiff(lastCloudState || null, sanitizedState),
          lastCloudState,
          sanitizedState,
        );

        // Permanent / foundational slices: always send full objects. Incremental diffs
        // omit unchanged keys; JSONB deep-merge into an empty/partial cloud row then
        // permanently drops them. Seen in prod: wiped tools, missing unlock flags, and
        // missing `buildings` (housing/cap reads as 0 while villagers remain).
        for (const key of ALWAYS_FULL_CLOUD_SLICES) {
          stateDiff[key] = sanitizedState[key] as never;
        }

        // Execution / expedition slices use delete semantics (completed actions remove
        // keys). Cloud save uses JSONB deep-merge, so partial diffs cannot express
        // deletions — always send full objects.
        for (const key of ALWAYS_FULL_DELETE_SEMANTIC_CLOUD_SLICES) {
          (stateDiff as Record<string, unknown>)[key] =
            (sanitizedState as Record<string, unknown>)[key];
        }

        if (sanitizedState.startTime && !stateDiff.startTime) {
          stateDiff.startTime = sanitizedState.startTime;
        }
        if (sanitizedState.gameId && !stateDiff.gameId) {
          stateDiff.gameId = sanitizedState.gameId;
        }

        stateDiff.clientBuildSha = sanitizedState.clientBuildSha;

        if (stateDiff.playTime !== undefined) {
          stateDiff.playTime = Math.floor(stateDiff.playTime);
        }
      }

      // Persist the schema overwrite flag in the blob while the server flag is set.
      if (allowOverwrite) {
        stateDiff.allowPlayTimeOverwrite = true;
      }

      logger.log('[SAVE CLOUD] 🔍 Playtime overwrite check:', {
        allowPlayTimeOverwrite: sanitizedState.allowPlayTimeOverwrite,
        isNewGame: sanitizedState.isNewGame,
        willAllowOverwrite: allowOverwrite,
        currentPlayTime: stateDiff.playTime,
        fullReplace,
      });

      // Save via Edge Function → save_game_with_analytics.
      // fullReplace: full blob replace (migration 030); else deep-merge (024/025).
      const supabaseClient = await getSupabaseClient();

      // Verify we have an active session (Supabase client will automatically include the JWT)
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const { data, error } = await supabaseClient.functions.invoke('save-game', {
        body: {
          gameStateDiff: stateDiff,
          clickAnalytics: clickData,
          resourceAnalytics: resourceData,
          clearAnalytics: isNewGame,
          allowPlaytimeOverwrite: allowOverwrite,
          fullReplace,
        }
      });

      if (error) {
        logger.error('[SAVE CLOUD] Edge Function error details:', {
          error,
          message: error.message,
          context: error.context,
        });
        throw error;
      }

      logger.log('[SAVE CLOUD] Edge Function success:', data);

      // Clear restart flags in the persisted blob + store only after cloud accepts.
      if (allowOverwrite) {
        sanitizedState.allowPlayTimeOverwrite = false;
        sanitizedState.isNewGame = false;
        await clearPlaytimeOverwriteFlags();
        logger.log("[SAVE] 🔓 Cleared playtime overwrite flags after successful cloud save");
      }

      // Update lastCloudState only after successful cloud save
      await putLastCloudState(db, sanitizedState);
      logger.log("[SAVE] ✅ Updated lastCloudState after successful cloud save");

      return { localSaved: true, cloudSaved: true, cloudSkipped: false };
    } catch (cloudError) {
      logger.error("[SAVE] Cloud save failed:", cloudError);
      // Don't throw - local save succeeded. Keep overwrite flags for retry.
      return { localSaved: true, cloudSaved: false, cloudSkipped: false };
    }
  } catch (error) {
    logger.error("[SAVE] ❌ Failed to save game locally:", error);
    throw error;
  }
}

async function loadGameStateOrThrow(): Promise<GameState | null> {
  // Referral metadata sync is web only (Supabase-backed).
  if (!isLocalOnlyEdition()) {
    await flushPendingReferralToUserMetadata();
    await processReferralAfterConfirmation();
  }

  const db = await getGameSaveDatabase();
  const localSave = await getLocalSave(db);

  if (isDev) {
    logger.log(`[LOAD] 💾 Local save retrieved:`, {
      hasLocalSave: !!localSave,
      timestamp: localSave?.timestamp
        ? new Date(localSave.timestamp).toISOString()
        : "none",
      playTime: localSave?.playTime,
      playTimeMinutes: localSave?.playTime
        ? Math.round(localSave.playTime / 1000 / 60)
        : 0,
      hasCooldowns: !!localSave?.gameState?.cooldowns,
      cooldowns: localSave?.gameState?.cooldowns,
      hasCooldownDurations: !!localSave?.gameState?.cooldownDurations,
      cooldownDurations: localSave?.gameState?.cooldownDurations,
      cooldownDetails: Object.keys(localSave?.gameState?.cooldowns || {}).map(
        (key) => ({
          action: key,
          remaining: localSave?.gameState?.cooldowns[key],
          duration: localSave?.gameState?.cooldownDurations?.[key],
        }),
      ),
    });
  }

  // Check if user is authenticated (never on Steam — fully offline).
  let user = null;
  if (!isLocalOnlyEdition()) {
    try {
      user = await getCurrentUserForLoad();
    } catch (authError) {
      if (!localSave) throw authError;
      logger.warn(
        "[LOAD] Auth could not be resolved; using the local save fallback",
        authError,
      );
    }
  }

  if (user) {
    // User is authenticated - compare local and cloud saves
    try {
      const cloudSave = await loadGameFromSupabase();

      let loadedState: GameState; // Declare loadedState here

      if (cloudSave && localSave) {
        const preferred = pickPreferredSave(localSave, cloudSave);
        const cloudPlayTime = Math.floor(cloudSave.playTime || 0);
        const localPlayTime = Math.floor(localSave.playTime || 0);

        logger.log("[LOAD] 🔍 Comparing local and cloud saves:", {
          preferred,
          localGameId: localSave.gameState?.gameId,
          cloudGameId: cloudSave.gameState?.gameId,
          localStartTime: localSave.gameState?.startTime,
          cloudStartTime: cloudSave.gameState?.startTime,
          cloudPlayTime,
          localPlayTime,
          cloudTimestamp: cloudSave.timestamp,
          localTimestamp: localSave.timestamp,
        });

        if (preferred === "local") {
          logger.log("[LOAD] 💾 Preferring local save and syncing to cloud");
          loadedState = mergeCloudReferralsIntoState(
            localSave.gameState,
            cloudSave.gameState,
          );

          const stateWithDefaults = {
            ...loadedState,
            cooldownDurations: loadedState.cooldownDurations || {},
          };
          const processedState = await processUnclaimedReferrals(stateWithDefaults);
          let reconciled = mergeSavePlayTimeIntoState(localSave, processedState);

          // Only keep/propagate overwrite when the preferred local save already
          // carries an explicit restart flag. Never inject it just because gameIds
          // differ — that let a fresh other-screen start wipe cloud on login.
          const localAllowsOverwrite = shouldAllowPlaytimeOverwrite(
            localSave.gameState,
          );
          if (
            localAllowsOverwrite &&
            needsPlaytimeOverwriteForSync(localSave, cloudSave)
          ) {
            reconciled = {
              ...reconciled,
              allowPlayTimeOverwrite: true,
            };
          }

          // Sync local progress to cloud
          try {
            await db.delete("lastCloudState", LAST_CLOUD_STATE_KEY);
            const syncResult = await saveGame(reconciled, false);
            const cleared = {
              ...reconciled,
              allowPlayTimeOverwrite: false,
              isNewGame: false,
            };
            if (syncResult.cloudSaved || syncResult.cloudSkipped) {
              await putLastCloudState(db, cleared);
            }
            if (syncResult.cloudSaved) {
              logger.log("[LOAD] ✅ Local progress synced to cloud");
            } else if (!syncResult.cloudSkipped) {
              logger.warn(
                "[LOAD] ⚠️ Local preferred but cloud sync failed — overwrite may retry on next save",
              );
            }
            // If cloud accepted (or skipped), do not hand overwrite flags back into the store.
            return syncResult.cloudSaved || syncResult.cloudSkipped
              ? cleared
              : reconciled;
          } catch (syncError: any) {
            if (syncError.message?.includes("OCC violation")) {
              logger.log("[LOAD] 📊 Cloud already has this save state - skipping sync");
              await putLastCloudState(db, reconciled);
            } else {
              throw syncError;
            }
          }

          return reconciled;
        } else {
          // Cloud preferred (same-run higher playTime, or newer gameId/startTime)
          logger.log("[LOAD] ☁️ Preferring cloud save");
          loadedState = cloudSave.gameState; // Assign to loadedState

          const { formatSaveTimestamp } = await import("@/lib/utils");

          const stateWithDefaults = {
            ...loadedState,
            cooldownDurations: loadedState.cooldownDurations || {},
            // Format lastSaved if it's a timestamp
            lastSaved: loadedState.lastSaved && typeof loadedState.lastSaved === 'number'
              ? formatSaveTimestamp()
              : loadedState.lastSaved,
          };

          const processedState = await processUnclaimedReferrals(
            stateWithDefaults,
          );

          const stateToReturn = { ...processedState, playTime: cloudSave.playTime };

          // Save to IndexedDB to keep it in sync
          await putLocalSave(db, {
            gameState: processedState,
            timestamp: Date.now(),
            playTime: cloudSave.playTime || 0,
          });
          await putLastCloudState(db, processedState);

          logger.log("[LOAD] ✅ Cloud save loaded and synced locally");
          return stateToReturn;
        }
      } else if (cloudSave) {
        // Only cloud save exists - use it
        logger.log("[LOAD] ☁️ Using cloud save (no local save)");
        loadedState = cloudSave.gameState; // Assign to loadedState

        const { formatSaveTimestamp } = await import("@/lib/utils");

        const stateWithDefaults = {
          ...loadedState,
          cooldownDurations: loadedState.cooldownDurations || {},
          // Format lastSaved if it's a timestamp
          lastSaved: loadedState.lastSaved && typeof loadedState.lastSaved === 'number'
            ? formatSaveTimestamp()
            : loadedState.lastSaved,
        };

        const processedState = await processUnclaimedReferrals(
          stateWithDefaults,
        );

        const stateToReturn = { ...processedState, playTime: cloudSave.playTime };

        await putLocalSave(db, {
          gameState: processedState,
          timestamp: Date.now(),
          playTime: cloudSave.playTime || 0,
        });
        await putLastCloudState(db, processedState);

        logger.log("[LOAD] ✅ Cloud save loaded and synced locally");
        return stateToReturn;
      } else if (localSave) {
        // No cloud save but has local save - sync local to cloud
        logger.log("[LOAD] 📤 No cloud save found, syncing local to cloud");
        loadedState = localSave.gameState; // Assign to loadedState

        const stateWithDefaults = {
          ...loadedState,
          cooldownDurations: loadedState.cooldownDurations || {},
        };
        const processedState = await processUnclaimedReferrals(stateWithDefaults);
        const reconciled = mergeSavePlayTimeIntoState(localSave, processedState);

        try {
          // Force sync by clearing lastCloudState, then saveGame will handle it
          await db.delete("lastCloudState", LAST_CLOUD_STATE_KEY);
          // Do NOT use allowPlaytimeOverwrite here - this is not a new game
          await saveGame(reconciled, false);
          await putLastCloudState(db, reconciled);
        } catch (syncError: any) {
          // If OCC violates due to equal playTimes, that's fine - cloud already has this state
          if (syncError.message?.includes("OCC violation")) {
            if (isDev)
              logger.log("[LOAD] 📊 Cloud already has this save state - skipping sync");
            await putLastCloudState(db, reconciled);
          } else {
            throw syncError;
          }
        }

        return reconciled;
      }
    } catch (cloudError) {
      logger.error("Failed to load from cloud:", cloudError);
      // Fall back to local save if cloud fails
      if (localSave) {
        logger.warn("[LOAD] ⚠️ Using local save as fallback");
        const processedState = await processUnclaimedReferrals(
          localSave.gameState,
        );
        return mergeSavePlayTimeIntoState(localSave, processedState);
      }
      throw cloudError;
    }
  } else {
    // Not authenticated, use local save only
    if (localSave) {
      const stateWithDefaults = {
        ...localSave.gameState,
        cooldownDurations: localSave.gameState.cooldownDurations || {},
      };
      // Steam build has no referral system; skip the Supabase-backed processing.
      const processedState = isLocalOnlyEdition()
        ? stateWithDefaults
        : await processUnclaimedReferrals(stateWithDefaults);
      if (isDev) {
        logger.log(`[LOAD] Returning local state (no auth):`, {
          hasCooldownDurations: !!processedState.cooldownDurations,
          cooldownDurations: processedState.cooldownDurations,
        });
      }
      return mergeSavePlayTimeIntoState(localSave, processedState);
    }
  }

  logger.log(`[LOAD] No save found, returning null`);
  return null;
}

export async function loadGameResult(): Promise<LoadGameResult> {
  try {
    const state = await loadGameStateOrThrow();
    return state ? { status: "loaded", state } : { status: "not-found" };
  } catch (error) {
    logger.error("Failed to load game:", error);
    return {
      status: "error",
      error,
      retryable: !(error instanceof InvalidLocalSaveError),
    };
  }
}

/**
 * Compatibility API for existing callers. Errors are thrown so callers can
 * never confuse an unavailable/corrupt save with a confirmed missing save.
 */
export async function loadGame(): Promise<GameState | null> {
  const result = await loadGameResult();
  if (result.status === "error") throw result.error;
  return result.status === "loaded" ? result.state : null;
}

export async function deleteSave(): Promise<void> {
  try {
    const db = await getGameSaveDatabase();
    await db.delete("saves", getSaveKey());
    clearStartupSaveHeader();
  } catch (error) {
    logger.error("Failed to delete save:", error);
  }
}