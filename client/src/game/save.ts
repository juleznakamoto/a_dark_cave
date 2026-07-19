import { openDB, DBSchema } from "idb";
import { GameState, SaveData, REFERRAL_REWARD_GOLD } from "@shared/schema";
import {
  saveGameToSupabase,
  loadGameFromSupabase,
  getCurrentUser,
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
import { isGalaxyEdition, isLocalOnlyEdition, isSteamBuild, isSteamDemoBuild, isSteamPlaytestBuild } from "@/lib/edition";
import {
  writeSteamCloudSave,
  readSteamCloudSave,
  pickNewerSave,
} from "./steamSaveAdapter";

const isDev = import.meta.env.DEV;

interface GameDB extends DBSchema {
  saves: {
    key: string;
    value: string | SaveData;
  };
  lastCloudState: {
    key: string;
    value: string | GameState;
  };
}

const DB_NAME = "ADarkCaveDB";
const DB_VERSION = 2;
const SAVE_KEY_MAIN = "mainSave";
const SAVE_KEY_GALAXY = "galaxySave";
const SAVE_KEY_STEAM_DEMO = "steamDemoSave";
const SAVE_KEY_STEAM_PLAYTEST = "steamPlaytestSave";
const LAST_CLOUD_STATE_KEY = "lastCloudState";

function getSaveKey(): string {
  if (isSteamPlaytestBuild) return SAVE_KEY_STEAM_PLAYTEST;
  if (isSteamDemoBuild) return SAVE_KEY_STEAM_DEMO;
  if (isGalaxyEdition()) return SAVE_KEY_GALAXY;
  return SAVE_KEY_MAIN;
}

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
  db: Awaited<ReturnType<typeof getDB>>,
  data: SaveData,
): Promise<void> {
  const encoded = encodeLocalSave(data);
  await db.put("saves", encoded, getSaveKey());
  // Steam build: also mirror to the Steam Cloud file (no-op on web).
  if (isSteamBuild) {
    await writeSteamCloudSave(encoded);
  }
}

async function getLocalSave(
  db: Awaited<ReturnType<typeof getDB>>,
): Promise<SaveData | undefined> {
  const raw = await db.get("saves", getSaveKey());
  const local = decodeLocalSave(raw) ?? undefined;
  // Steam build: reconcile IndexedDB with the cloud-synced file (newer wins).
  if (isSteamBuild) {
    const cloud = await readSteamCloudSave();
    return pickNewerSave(local, cloud);
  }
  return local;
}

async function putLastCloudState(
  db: Awaited<ReturnType<typeof getDB>>,
  state: GameState,
): Promise<void> {
  await db.put("lastCloudState", encodeLocalGameState(state), LAST_CLOUD_STATE_KEY);
}

async function getLastCloudState(
  db: Awaited<ReturnType<typeof getDB>>,
): Promise<GameState | undefined> {
  const raw = await db.get("lastCloudState", LAST_CLOUD_STATE_KEY);
  return decodeLocalGameState(raw) ?? undefined;
}

/** Sync local IndexedDB after cloud referral refresh (avoids duplicating codec in auth). */
export async function syncLocalSaveFromCloud(data: SaveData): Promise<void> {
  const db = await getDB();
  await putLocalSave(db, data);
  await putLastCloudState(db, data.gameState);
}

/** Clear cloud diff baseline only (e.g. sign-out); local main save is kept. */
export async function clearLastCloudState(): Promise<void> {
  const db = await getDB();
  await db.delete("lastCloudState", LAST_CLOUD_STATE_KEY);
}

async function getDB() {
  try {
    const db = await openDB<GameDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          db.createObjectStore("saves");
        }
        if (oldVersion < 2) {
          if (!db.objectStoreNames.contains("lastCloudState")) {
            db.createObjectStore("lastCloudState");
          }
        }
      },
    });
    return db;
  } catch (error) {
    logger.error("Failed to open database:", error);
    throw error;
  }
}

type ReferralEntry = GameState["referrals"][number];

function mergeReferralEntries(
  local: ReferralEntry,
  cloud: ReferralEntry,
): ReferralEntry {
  return {
    userId: local.userId,
    claimed: local.claimed || cloud.claimed,
    timestamp: Math.max(local.timestamp, cloud.timestamp),
  };
}

/**
 * Server-side referral processing updates the referrer's cloud save directly.
 * When local IndexedDB has more playTime, load still prefers local — merge cloud
 * referrals so invite rewards are not lost.
 */
export function mergeCloudReferralsIntoState(
  localState: GameState,
  cloudState: Pick<GameState, "referrals" | "referralCount" | "referredUsers">,
): GameState {
  const localRefs = Array.isArray(localState.referrals) ? localState.referrals : [];
  const cloudRefs = Array.isArray(cloudState.referrals) ? cloudState.referrals : [];

  const byUserId = new Map<string, ReferralEntry>();
  for (const entry of localRefs) {
    if (entry?.userId) byUserId.set(entry.userId, entry);
  }
  for (const entry of cloudRefs) {
    if (!entry?.userId) continue;
    const existing = byUserId.get(entry.userId);
    byUserId.set(
      entry.userId,
      existing ? mergeReferralEntries(existing, entry) : entry,
    );
  }

  const mergedReferrals = Array.from(byUserId.values()).sort(
    (a, b) => a.timestamp - b.timestamp,
  );
  const referralCount = Math.max(
    localState.referralCount ?? 0,
    cloudState.referralCount ?? 0,
    mergedReferrals.length,
  );
  const referredUsers = mergedReferrals.map((entry) => entry.userId);

  const unchanged =
    mergedReferrals.length === localRefs.length &&
    (localState.referralCount ?? 0) === referralCount &&
    localRefs.every(
      (entry, index) =>
        entry.userId === mergedReferrals[index]?.userId &&
        entry.claimed === mergedReferrals[index]?.claimed &&
        entry.timestamp === mergedReferrals[index]?.timestamp,
    );

  if (unchanged) return localState;

  return {
    ...localState,
    referrals: mergedReferrals,
    referralCount,
    referredUsers,
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
): Promise<void> {
  try {
    // Check if game is inactive - if so, don't save
    const { useGameStore } = await import("./state");
    const currentState = useGameStore.getState();
    if (currentState.inactivityDialogOpen) {
      logger.log("[SAVE] ⚠️ Game is inactive - skipping save");
      return;
    }

    const db = await getDB();

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

    // Ensure cooldownDurations is always present
    if (!sanitizedState.cooldownDurations) {
      sanitizedState.cooldownDurations = {};
    }

    // Ensure startTime is always present for completion tracking
    if (!sanitizedState.startTime) {
      sanitizedState.startTime = Date.now();
    }

    // Add timestamp to track save recency
    const now = Date.now();
    sanitizedState.lastSaved = now;

    // Stamp the running client build so cloud saves can be audited for stale bundles.
    const runningBuildSha =
      typeof __BUILD_SHA__ !== "undefined" ? __BUILD_SHA__ : "dev";
    sanitizedState.clientBuildSha = runningBuildSha;

    const saveData: SaveData = {
      gameState: sanitizedState,
      timestamp: now,
      playTime: gameState.playTime,
    };

    // Save locally first (most important)
    await putLocalSave(db, saveData);

    // Guests: local IndexedDB only — no Supabase / edge-function / server calls.
    if (!currentState.isUserSignedIn) {
      return;
    }

    // Try to save to cloud if user is authenticated
    try {
      const user = await getCurrentUser();
      if (user) {
        const isNewGame = gameState.isNewGame || false;

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
                  const { useGameStore } = await import("./state");
                  useGameStore.setState({ g, ...(fn && { fn }), g_fn_checked: true });
                } else {
                  const { useGameStore } = await import("./state");
                  useGameStore.setState({ g_fn_checked: true });
                }
              } else {
                const errBody = await res.json().catch(() => ({}));
                logger.warn("[SAVE] Gender detection failed:", res.status, errBody.error ?? errBody.hint ?? res.statusText);
                const { useGameStore } = await import("./state");
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

        // Get last cloud state for diff calculation
        const lastCloudState = await getLastCloudState(db);
        let stateDiff = omitPlayTimeFromDiffIfUnchanged(
          calculateStateDiff(lastCloudState || null, sanitizedState),
          lastCloudState,
          sanitizedState,
        );

        // Permanent slices: always send full objects so incremental diffs cannot omit
        // the `tools` key when lastCloudState and serialized state both lack it.
        stateDiff.tools = sanitizedState.tools;
        stateDiff.weapons = sanitizedState.weapons;
        stateDiff.books = sanitizedState.books;

        // Execution / expedition slices use delete semantics (completed actions remove
        // keys). Cloud save uses JSONB deep-merge, so partial diffs cannot express
        // deletions — always replace these objects wholesale (mirrors tools above).
        stateDiff.expeditionVillagers = sanitizedState.expeditionVillagers;
        stateDiff.executionStartTimes = sanitizedState.executionStartTimes;
        stateDiff.executionDurations = sanitizedState.executionDurations;
        stateDiff.executionAbortEligible = sanitizedState.executionAbortEligible;
        stateDiff.executionSpendSnapshots = sanitizedState.executionSpendSnapshots;

        // Always include startTime and gameId for completion tracking
        if (sanitizedState.startTime && !stateDiff.startTime) {
          stateDiff.startTime = sanitizedState.startTime;
        }
        if (sanitizedState.gameId && !stateDiff.gameId) {
          stateDiff.gameId = sanitizedState.gameId;
        }

        // Always refresh build SHA even when nothing else in the diff changed.
        stateDiff.clientBuildSha = sanitizedState.clientBuildSha;

        // Ensure playTime is an integer for the database
        if (stateDiff.playTime !== undefined) {
          stateDiff.playTime = Math.floor(stateDiff.playTime);
        }

        // Check if this is a new game that needs playtime overwrite
        const allowOverwrite = sanitizedState.allowPlaytimeOverwrite === true || sanitizedState.isNewGame === true;

        logger.log('[SAVE CLOUD] 🔍 Playtime overwrite check:', {
          allowPlaytimeOverwrite: sanitizedState.allowPlaytimeOverwrite,
          isNewGame: sanitizedState.isNewGame,
          willAllowOverwrite: allowOverwrite,
          currentPlayTime: stateDiff.playTime,
        });

        // Save via Edge Function → save_game_with_analytics (deep-merges nested JSONB
        // objects server-side; see supabase/migrations/024_jsonb_deep_merge_game_state.sql).
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
            allowPlaytimeOverwrite: allowOverwrite
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

        // Update lastCloudState only after successful cloud save
        await putLastCloudState(db, sanitizedState);
        logger.log("[SAVE] ✅ Updated lastCloudState after successful cloud save");

        // Clear the allowPlayTimeOverwrite flag after successful save
        if (gameState.allowPlaytimeOverwrite) {
          const { useGameStore } = await import("./state");
          useGameStore.setState({ allowPlaytimeOverwrite: false });
          logger.log("[SAVE] 🔓 Cleared allowPlayTimeOverwrite flag after successful cloud save");
        }
      }
    } catch (cloudError) {
      logger.error("[SAVE] Cloud save failed:", cloudError);
      // Don't throw - local save succeeded
    }
  } catch (error) {
    logger.error("[SAVE] ❌ Failed to save game locally:", error);
    throw error;
  }
}

export async function loadGame(): Promise<GameState | null> {
  try {
    // Referral metadata sync is web only (Supabase-backed).
    if (!isLocalOnlyEdition()) {
      await flushPendingReferralToUserMetadata();
      await processReferralAfterConfirmation();
    }

    const db = await getDB();
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
    const user = isLocalOnlyEdition() ? null : await getCurrentUser();

    if (user) {
      // User is authenticated - compare local and cloud saves
      try {
        const cloudSave = await loadGameFromSupabase();

        let loadedState: GameState; // Declare loadedState here

        if (cloudSave && localSave) {
          // Both saves exist - use the most recent one
          // Floor playTime values to avoid floating-point comparison issues
          const cloudPlayTime = Math.floor(cloudSave.playTime || 0);
          const localPlayTime = Math.floor(localSave.playTime || 0);

          logger.log("[LOAD] 🔍 Comparing local and cloud saves:", {
            cloudPlayTime,
            localPlayTime,
            cloudTimestamp: cloudSave.timestamp,
            localTimestamp: localSave.timestamp,
          });

          // Use whichever has more playtime (most progress)
          if (localPlayTime > cloudPlayTime) {
            logger.log("[LOAD] 💾 Local save is newer - using local and syncing to cloud");
            loadedState = mergeCloudReferralsIntoState(
              localSave.gameState,
              cloudSave.gameState,
            );

            const stateWithDefaults = {
              ...loadedState,
              cooldownDurations: loadedState.cooldownDurations || {},
            };
            const processedState = await processUnclaimedReferrals(stateWithDefaults);
            const reconciled = mergeSavePlayTimeIntoState(localSave, processedState);

            // Sync local progress to cloud
            try {
              await db.delete("lastCloudState", LAST_CLOUD_STATE_KEY);
              await saveGame(reconciled, false);
              await putLastCloudState(db, reconciled);
              logger.log("[LOAD] ✅ Local progress synced to cloud");
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
            // Cloud save is newer or equal - use cloud
            logger.log("[LOAD] ☁️ Cloud save is newer - using cloud save");
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
  } catch (error) {
    logger.error("Failed to load game:", error);
    return null;
  }
}

export async function deleteSave(): Promise<void> {
  try {
    const db = await getDB();
    await db.delete("saves", getSaveKey());
  } catch (error) {
    logger.error("Failed to delete save:", error);
  }
}