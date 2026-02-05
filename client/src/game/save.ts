import { openDB, DBSchema } from "idb";
import { GameState, SaveData } from "@shared/schema";
import {
  saveGameToSupabase,
  loadGameFromSupabase,
  getCurrentUser,
  processReferralAfterConfirmation,
} from "./auth";
import { logger } from "@/lib/logger";
import { getSupabaseClient } from "@/lib/supabase";

const isDev = import.meta.env.DEV;

interface GameDB extends DBSchema {
  saves: {
    key: string;
    value: SaveData;
  };
  lastCloudState: {
    key: string;
    value: GameState;
  };
}

const DB_NAME = "ADarkCaveDB";
const DB_VERSION = 2;
const SAVE_KEY = "mainSave";
const LAST_CLOUD_STATE_KEY = "lastCloudState";

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
      return JSON.stringify(a) !== JSON.stringify(b);
    }
    return true;
  };

  // Compare all top-level properties
  for (const key in newState) {
    const newValue = newState[key as keyof GameState];
    const oldValue = oldState[key as keyof GameState];

    if (isDifferent(oldValue, newValue)) {
      diff[key] = newValue;
    }
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

// Helper function to process unclaimed referrals
async function processUnclaimedReferrals(
  gameState: GameState,
): Promise<GameState> {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/33ba3fb0-527b-48ba-8316-dce19cab51cb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'save.ts:96',message:'processUnclaimedReferrals - before dynamic import',data:{},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  const stateModule = await import("./state");
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/33ba3fb0-527b-48ba-8316-dce19cab51cb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'save.ts:100',message:'processUnclaimedReferrals - after import',data:{hasUseGameStore:'useGameStore' in (stateModule||{}),useGameStoreType:typeof stateModule?.useGameStore},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  const { useGameStore } = stateModule;
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

  let updatedGameState = { ...gameState };
  let goldGained = 0;
  let logEntriesAdded: any[] = [];

  // Process unclaimed referrals
  const updatedReferrals = updatedGameState.referrals.map((referral) => {
    if (!referral.claimed) {
      logger.log('[REFERRAL] 💰 Claiming referral:', {
        userId: referral.userId,
        timestamp: referral.timestamp,
      });

      // Claim this referral
      goldGained += 100;
      logEntriesAdded.push({
        id: `referral-claimed-${referral.userId}-${Date.now()}`,
        timestamp: Date.now(),
        message: `You invited someone new to this world! +250 Gold`,
        type: "system",
      });

      return { ...referral, claimed: true };
    }
    return referral;
  });

  // Update game state if any referrals were claimed
  if (goldGained > 0) {
    const oldGold = updatedGameState.resources?.gold || 0;
    const newGold = oldGold + goldGained;

    logger.log('[REFERRAL] ✅ Awarding gold:', {
      oldGold,
      goldGained,
      newGold,
      claimedCount: logEntriesAdded.length,
    });

    updatedGameState = {
      ...updatedGameState,
      referrals: updatedReferrals,
      resources: {
        ...updatedGameState.resources,
        gold: newGold,
      },
      log: [...(updatedGameState.log || []), ...logEntriesAdded].slice(-100),
      cooldownDurations: updatedGameState.cooldownDurations || {},
    };

    // Update the store as well
    useGameStore.setState({
      resources: updatedGameState.resources,
      log: updatedGameState.log,
      referrals: updatedGameState.referrals,
    });

    // CRITICAL: Save the claimed referrals back to Supabase immediately
    logger.log('[REFERRAL] 💾 Saving claimed referrals to Supabase...');
    try {
      await saveGameToSupabase(
        {
          referrals: updatedReferrals,
          resources: updatedGameState.resources,
          log: updatedGameState.log,
        },
        updatedGameState.playTime,
        false
      );
      logger.log('[REFERRAL] ✅ Successfully saved claimed referrals to cloud');
    } catch (error) {
      logger.error('[REFERRAL] ❌ Failed to save claimed referrals to cloud:', error);
    }
  } else {
    logger.log('[REFERRAL] ℹ️ No unclaimed referrals to process');
  }

  return updatedGameState;
}

export async function saveGame(
  gameState: GameState,
  isAutosave: boolean = true,
): Promise<void> {
  try {
    // Check if game is inactive - if so, don't save
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/33ba3fb0-527b-48ba-8316-dce19cab51cb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'save.ts:201',message:'saveGame start - before dynamic import',data:{isAutosave,hasGameState:!!gameState},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    const stateModule = await import("./state");
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/33ba3fb0-527b-48ba-8316-dce19cab51cb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'save.ts:205',message:'after dynamic import',data:{stateModuleType:typeof stateModule,stateModuleKeys:stateModule?Object.keys(stateModule):[],hasUseGameStore:'useGameStore' in (stateModule||{}),useGameStoreType:typeof stateModule?.useGameStore},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,B,D'})}).catch(()=>{});
    // #endregion
    const { useGameStore } = stateModule;
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/33ba3fb0-527b-48ba-8316-dce19cab51cb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'save.ts:209',message:'after destructuring useGameStore',data:{useGameStoreExists:!!useGameStore,useGameStoreType:typeof useGameStore,hasGetState:useGameStore&&typeof useGameStore.getState==='function'},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,D'})}).catch(()=>{});
    // #endregion
    if (!useGameStore || typeof useGameStore.getState !== 'function') {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/33ba3fb0-527b-48ba-8316-dce19cab51cb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'save.ts:213',message:'CRITICAL: useGameStore is undefined or missing getState',data:{useGameStoreValue:String(useGameStore),stateModuleStr:JSON.stringify(Object.keys(stateModule||{}))},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,D'})}).catch(()=>{});
      // #endregion
      throw new Error('useGameStore is undefined after dynamic import - circular dependency issue');
    }
    const currentState = useGameStore.getState();
    if (currentState.inactivityDialogOpen) {
      logger.log("[SAVE] ⚠️ Game is inactive - skipping save");
      return;
    }

    const db = await getDB();

    // Deep clone and sanitize the game state to remove non-serializable data
    let sanitizedState: any;
    try {
      // Use custom replacer to convert undefined to null for safe serialization
      sanitizedState = JSON.parse(JSON.stringify(gameState, (key, value) => {
        return value === undefined ? null : value;
      }));
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

    const saveData: SaveData = {
      gameState: sanitizedState,
      timestamp: now,
      playTime: gameState.playTime,
    };

    // Save locally first (most important)
    await db.put("saves", saveData, SAVE_KEY);

    // Try to save to cloud if user is authenticated
    try {
      const user = await getCurrentUser();
      if (user) {
        const isNewGame = gameState.isNewGame || false;

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
        const lastCloudState = await db.get(
          "lastCloudState",
          LAST_CLOUD_STATE_KEY,
        );
        const stateDiff = calculateStateDiff(
          lastCloudState || null,
          sanitizedState,
        );

        // Always include startTime and gameId for completion tracking
        if (sanitizedState.startTime && !stateDiff.startTime) {
          stateDiff.startTime = sanitizedState.startTime;
        }
        if (sanitizedState.gameId && !stateDiff.gameId) {
          stateDiff.gameId = sanitizedState.gameId;
        }

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

        // Save via Edge Function (handles auth, rate limiting, and trust)
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
        await db.put("lastCloudState", sanitizedState, LAST_CLOUD_STATE_KEY);
        logger.log("[SAVE] ✅ Updated lastCloudState after successful cloud save");

        // Clear the allowPlayTimeOverwrite flag after successful save
        if (gameState.allowPlaytimeOverwrite) {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/33ba3fb0-527b-48ba-8316-dce19cab51cb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'save.ts:367',message:'clearing allowPlaytimeOverwrite - before import',data:{},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
          // #endregion
          const stateModule2 = await import("./state");
          const { useGameStore } = stateModule2;
          if (useGameStore && typeof useGameStore.setState === 'function') {
            useGameStore.setState({ allowPlaytimeOverwrite: false });
          }
          logger.log("[SAVE] 🔓 Cleared allowPlayTimeOverwrite flag after successful cloud save");
        }
      }
    } catch (cloudError) {
      logger.error("[SAVE] Cloud save failed:", cloudError);
      // Don't throw - local save succeeded
    }
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/33ba3fb0-527b-48ba-8316-dce19cab51cb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'save.ts:378',message:'saveGame CAUGHT ERROR',data:{errorMessage:error instanceof Error?error.message:String(error),errorStack:error instanceof Error?error.stack:'no stack',errorName:error instanceof Error?error.name:'unknown'},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,B,C,D,E'})}).catch(()=>{});
    // #endregion
    logger.error("[SAVE] ❌ Failed to save game locally:", error);
    throw error;
  }
}

export async function loadGame(): Promise<GameState | null> {
  try {
    // Process referral if user just confirmed email
    await processReferralAfterConfirmation();

    const db = await getDB();
    const localSave = await db.get("saves", SAVE_KEY);

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

    // Check if user is authenticated
    const user = await getCurrentUser();

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
            loadedState = localSave.gameState; // Assign to loadedState

            const stateWithDefaults = {
              ...loadedState,
              cooldownDurations: loadedState.cooldownDurations || {},
            };
            const processedState = await processUnclaimedReferrals(stateWithDefaults);

            // Sync local progress to cloud
            try {
              await db.delete("lastCloudState", LAST_CLOUD_STATE_KEY);
              await saveGame(processedState, false);
              await db.put("lastCloudState", processedState, LAST_CLOUD_STATE_KEY);
              logger.log("[LOAD] ✅ Local progress synced to cloud");
            } catch (syncError: any) {
              if (syncError.message?.includes("OCC violation")) {
                logger.log("[LOAD] 📊 Cloud already has this save state - skipping sync");
                await db.put("lastCloudState", processedState, LAST_CLOUD_STATE_KEY);
              } else {
                throw syncError;
              }
            }

            return processedState;
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
            await db.put(
              "saves",
              {
                gameState: processedState,
                timestamp: Date.now(),
                playTime: cloudSave.playTime || 0,
              },
              SAVE_KEY,
            );
            await db.put("lastCloudState", processedState, LAST_CLOUD_STATE_KEY);

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

          await db.put(
            "saves",
            {
              gameState: processedState,
              timestamp: Date.now(),
              playTime: cloudSave.playTime || 0,
            },
            SAVE_KEY,
          );
          await db.put("lastCloudState", processedState, LAST_CLOUD_STATE_KEY);

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

          try {
            // Force sync by clearing lastCloudState, then saveGame will handle it
            await db.delete("lastCloudState", LAST_CLOUD_STATE_KEY);
            // Do NOT use allowPlaytimeOverwrite here - this is not a new game
            await saveGame(processedState, false);
            await db.put("lastCloudState", processedState, LAST_CLOUD_STATE_KEY);
          } catch (syncError: any) {
            // If OCC violates due to equal playTimes, that's fine - cloud already has this state
            if (syncError.message?.includes("OCC violation")) {
              if (isDev)
                logger.log("[LOAD] 📊 Cloud already has this save state - skipping sync");
              await db.put("lastCloudState", processedState, LAST_CLOUD_STATE_KEY);
            } else {
              throw syncError;
            }
          }

          return processedState;
        }
      } catch (cloudError) {
        logger.error("Failed to load from cloud:", cloudError);
        // Fall back to local save if cloud fails
        if (localSave) {
          logger.warn("[LOAD] ⚠️ Using local save as fallback");
          const processedState = await processUnclaimedReferrals(
            localSave.gameState,
          );
          return processedState;
        }
      }
    } else {
      // Not authenticated, use local save only
      if (localSave) {
        const stateWithDefaults = {
          ...localSave.gameState,
          cooldownDurations: localSave.gameState.cooldownDurations || {},
        };
        const processedState =
          await processUnclaimedReferrals(stateWithDefaults);
        if (isDev) {
          logger.log(`[LOAD] Returning local state (no auth):`, {
            hasCooldownDurations: !!processedState.cooldownDurations,
            cooldownDurations: processedState.cooldownDurations,
          });
        }
        return processedState;
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
    await db.delete("saves", SAVE_KEY);
  } catch (error) {
    logger.error("Failed to delete save:", error);
  }
}