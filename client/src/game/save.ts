import { openDB, DBSchema } from "idb";
import { GameState, SaveData } from "@shared/schema";
import {
  saveGameToSupabase,
  loadGameFromSupabase,
  getCurrentUser,
  processReferralAfterConfirmation,
} from "./auth";
import { logger } from "@/lib/logger";

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
    logger.log(`[SAVE] 🔵 Starting save operation:`, {
      isAutosave,
      inputPlayTime: gameState.playTime,
      inputPlayTimeMinutes: gameState.playTime ? (gameState.playTime / 1000 / 60).toFixed(2) : 0,
    });

    // Check if game is inactive - if so, don't save
    const { useGameStore } = await import("./state");
    const currentState = useGameStore.getState();
    if (currentState.inactivityDialogOpen) {
      logger.log("[SAVE] ⚠️ Game is inactive - skipping save");
      return;
    }

    const db = await getDB();

    logger.log(`[SAVE] 🔍 Before sanitization:`, {
      hasFellowship: 'fellowship' in gameState,
      fellowship: gameState.fellowship,
      fellowshipKeys: gameState.fellowship ? Object.keys(gameState.fellowship) : [],
    });

    // Deep clone and sanitize the game state to remove non-serializable data
    const sanitizedState = JSON.parse(JSON.stringify(gameState));

    logger.log(`[SAVE] 🔍 After sanitization:`, {
      sanitizedPlayTime: sanitizedState.playTime,
      originalPlayTime: gameState.playTime,
      playTimesMatch: sanitizedState.playTime === gameState.playTime,
    });

    // Ensure cooldownDurations is always present
    if (!sanitizedState.cooldownDurations) {
      sanitizedState.cooldownDurations = {};
    }

    // Add timestamp to track save recency
    const now = Date.now();
    sanitizedState.lastSaved = now;

    logger.log(`[SAVE] 📦 Creating SaveData object:`, {
      timestamp: now,
      playTime: gameState.playTime,
      playTimeMinutes: gameState.playTime ? (gameState.playTime / 1000 / 60).toFixed(2) : 0,
      gameStatePlayTime: sanitizedState.playTime,
      hasCooldowns: !!sanitizedState.cooldowns,
      cooldownsCount: sanitizedState.cooldowns
        ? Object.keys(sanitizedState.cooldowns).length
        : 0,
    });

    const saveData: SaveData = {
      gameState: sanitizedState,
      timestamp: now,
      playTime: gameState.playTime, // Use gameState.playTime
    };

    logger.log(`[SAVE] 💾 SaveData object created:`, {
      saveDataPlayTime: saveData.playTime,
      saveDataGameStatePlayTime: saveData.gameState.playTime,
      saveDataTimestamp: saveData.timestamp,
    });

    // Save locally first (most important)
    await db.put("saves", saveData, SAVE_KEY);

    // Verify what was actually saved
    const verifyLocalSave = await db.get("saves", SAVE_KEY);
    logger.log(`[SAVE] ✅ Verified IndexedDB save:`, {
      savedPlayTime: verifyLocalSave?.playTime,
      savedGameStatePlayTime: verifyLocalSave?.gameState?.playTime,
      savedTimestamp: verifyLocalSave?.timestamp,
    });

    // Try to save to cloud if user is authenticated
    try {
      const user = await getCurrentUser();
      if (user) {
        const isNewGame = gameState.isNewGame || false;

        // Get and reset click analytics
        const clickData = useGameStore.getState().getAndResetClickAnalytics();

        // Get last cloud state for diff calculation
        const lastCloudState = await db.get(
          "lastCloudState",
          LAST_CLOUD_STATE_KEY,
        );
        const stateDiff = calculateStateDiff(
          lastCloudState || null,
          sanitizedState,
        );

        logger.log("[SAVE] ☁️ Starting cloud save...", {
          diffSize: Object.keys(stateDiff).length,
          diffKeys: Object.keys(stateDiff),
          hasFellowship: 'fellowship' in stateDiff,
          fellowshipValue: stateDiff.fellowship,
          lastCloudFellowship: lastCloudState?.fellowship,
          currentFellowship: sanitizedState.fellowship,
          playTime: gameState.playTime,
          playTimeMinutes: gameState.playTime ? (gameState.playTime / 1000 / 60).toFixed(2) : 0,
        });

        // Save diff to Supabase
        await saveGameToSupabase(
          stateDiff,
          gameState.playTime,
          isNewGame,
          clickData,
        );

        // Update lastCloudState after successful cloud save
        await db.put("lastCloudState", sanitizedState, LAST_CLOUD_STATE_KEY);
        logger.log("[SAVE] ✅ Updated lastCloudState after successful cloud save");
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
    logger.log(`[LOAD] 🎮 Starting game load process...`);

    // Process referral if user just confirmed email
    await processReferralAfterConfirmation();

    const db = await getDB();
    const localSave = await db.get("saves", SAVE_KEY);

    logger.log('[LOAD] 📊 Raw local save from IndexedDB:', {
      exists: !!localSave,
      playTime: localSave?.playTime,
      playTimeMinutes: localSave?.playTime ? (localSave.playTime / 1000 / 60).toFixed(2) : 0,
      timestamp: localSave?.timestamp,
      timestampDate: localSave?.timestamp ? new Date(localSave.timestamp).toISOString() : 'none',
      gameStatePlayTime: localSave?.gameState?.playTime,
      gameStatePlayTimeMinutes: localSave?.gameState?.playTime ? (localSave.gameState.playTime / 1000 / 60).toFixed(2) : 0,
    });

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
      // User is authenticated - always use cloud save
      try {
        const cloudSave = await loadGameFromSupabase();
        logger.log('[LOAD] 📊 Cloud save from Supabase:', {
          exists: !!cloudSave,
          playTime: cloudSave?.playTime,
          playTimeMinutes: cloudSave?.playTime ? (cloudSave.playTime / 1000 / 60).toFixed(2) : 0,
          timestamp: cloudSave?.timestamp,
        });

        if (cloudSave) {
          // Cloud save exists - use it
          logger.log("[LOAD] ☁️ Using cloud save (user authenticated)");

          const processedState = await processUnclaimedReferrals(
            cloudSave.gameState,
          );

          const stateToReturn = { ...processedState, playTime: cloudSave.playTime };

          logger.log('[LOAD] 📊 State being returned:', {
            playTime: stateToReturn.playTime,
            playTimeMinutes: (stateToReturn.playTime / 1000 / 60).toFixed(2),
          });

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
        } else if (localSave) {
          // No cloud save but has local save - sync local to cloud
          logger.log("[LOAD] 📤 No cloud save found, syncing local to cloud");

          const stateWithDefaults = {
            ...localSave.gameState,
            cooldownDurations: localSave.gameState.cooldownDurations || {},
          };
          const processedState = await processUnclaimedReferrals(stateWithDefaults);

          try {
            // Force full sync by clearing lastCloudState, then saveGame will handle it
            await db.delete("lastCloudState", LAST_CLOUD_STATE_KEY);
            await saveGame(processedState, false); // Pass true to skip OCC check during this initial sync
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