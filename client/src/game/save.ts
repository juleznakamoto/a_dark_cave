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

  // If no user or no referrals, return gameState as is
  if (
    !currentUser ||
    !gameState.referrals ||
    gameState.referrals.length === 0
  ) {
    return gameState;
  }

  let updatedGameState = { ...gameState };
  let goldGained = 0;
  let logEntriesAdded: any[] = [];

  // Process unclaimed referrals
  const updatedReferrals = updatedGameState.referrals.map((referral) => {
    if (!referral.claimed) {
      // Claim this referral
      goldGained += 100;
      logEntriesAdded.push({
        id: `referral-claimed-${referral.userId}-${Date.now()}`,
        timestamp: Date.now(),
        message: `You invited someone new to this world! +100 Gold`,
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
  }

  return updatedGameState;
}

export async function saveGame(
  gameState: GameState,
  isAutosave: boolean = false,
  skipOccCheck: boolean = false,
): Promise<void> {
  try {
    logger.log(`[SAVE] 🔵 Starting save operation:`, {
      isAutosave,
      skipOccCheck,
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

    // Try to save to cloud if user is authenticated (optional enhancement)
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

        // OCC: Optimistic Concurrency Control
        // Before writing, check if cloud has a newer save (but skip during initial load sync or when explicitly skipped)
        if (user && isAutosave && !skipOccCheck) {
          logger.log("[SAVE] 🔍 Starting OCC check...");
          const cloudSave = await loadGameFromSupabase();
          if (cloudSave) {
            const cloudPlayTimeSeconds = cloudSave.playTime || 0;
            const localPlayTimeSeconds = gameState.playTime || 0;

            logger.log("[SAVE] 🔍 OCC check - comparing playtimes:", {
              cloudPlayTimeMs: cloudPlayTimeSeconds.toFixed(2),
              localPlayTimeMs: localPlayTimeSeconds.toFixed(2),
              differenceMs: (
                cloudPlayTimeSeconds - localPlayTimeSeconds
              ).toFixed(2),
              cloudMinutes: (cloudPlayTimeSeconds / 1000 / 60).toFixed(2),
              localMinutes: (localPlayTimeSeconds / 1000 / 60).toFixed(2),
              localIsNewer: localPlayTimeSeconds > cloudPlayTimeSeconds,
              cloudIsNewer: cloudPlayTimeSeconds > localPlayTimeSeconds,
            });

            // If cloud has longer playtime, another instance is ahead
            if (cloudPlayTimeSeconds > localPlayTimeSeconds) {
              logger.warn("[SAVE] ⚠️ Detected newer save in cloud:", {
                cloudPlayTimeMs: cloudPlayTimeSeconds.toFixed(2),
                localPlayTimeMs: localPlayTimeSeconds.toFixed(2),
                differenceMs: (
                  cloudPlayTimeSeconds - localPlayTimeSeconds
                ).toFixed(2),
                cloudMinutes: (cloudPlayTimeSeconds / 1000 / 60).toFixed(2),
                localMinutes: (localPlayTimeSeconds / 1000 / 60).toFixed(2),
              });

              logger.log(
                "[SAVE] 🛑 Another tab/device is actively playing - stopping this tab...",
              );

              // Stop this game instance
              const { stopGameLoop } = await import("./loop");
              stopGameLoop();

              // Show user the InactivityDialog
              useGameStore.setState({
                inactivityDialogOpen: true,
                inactivityReason: "multitab",
              });

              return; // Don't save
            } else {
              logger.log("[SAVE] ✅ OCC check passed - local is newer or equal");
            }
          } else {
            logger.log("[SAVE] ℹ️ No cloud save found during OCC check");
          }
        } else {
          logger.log("[SAVE] ⏭️ Skipping OCC check:", {
            hasUser: !!user,
            isAutosave,
            skipOccCheck,
          });
        }

        // Only save to cloud if not skipping OCC check
        // When skipOccCheck=true, we're syncing local with cloud state, so no need to write back to cloud
        if (!skipOccCheck) {
          logger.log("[SAVE] ☁️ Starting cloud save...", {
            diffSize: Object.keys(stateDiff).length,
            playTime: gameState.playTime,
            playTimeMinutes: gameState.playTime ? (gameState.playTime / 1000 / 60).toFixed(2) : 0,
          });

          // Save diff to Supabase (includes OCC check)
          await saveGameToSupabase(
            stateDiff,
            gameState.playTime,
            isNewGame,
            clickData,
          );
          
          // Update last cloud state
          await db.put("lastCloudState", sanitizedState, LAST_CLOUD_STATE_KEY);
          logger.log("[SAVE] ✅ Cloud save successful");
        } else {
          // Just update last cloud state for future diffs, don't write to cloud
          await db.put("lastCloudState", sanitizedState, LAST_CLOUD_STATE_KEY);
          logger.log("[SAVE] 📥 Local state synced with cloud (no cloud write needed)");
        }
      }
    } catch (cloudError: any) {
      logger.debug("[SAVE] Cloud save skipped:", cloudError);
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
      // Try to load from cloud
      try {
        const cloudSaveData = await loadGameFromSupabase();
        logger.log('[LOAD] 📊 Raw cloud save from Supabase:', {
          exists: !!cloudSaveData,
          playTime: cloudSaveData?.playTime,
          timestamp: cloudSaveData?.timestamp,
          gameStatePlayTime: cloudSaveData?.gameState?.playTime,
        });
        
        const lastCloudState = await db.get(
          "lastCloudState",
          LAST_CLOUD_STATE_KEY,
        );

        let cloudSave: SaveData | null = null;
        if (cloudSaveData) {
          // If lastCloudState exists, merge diff. Otherwise, use cloudSaveData directly.
          if (lastCloudState) {
            // Merge diffs for cloudSave, but only if cloudSaveData contains the actual game state, not just diffs
            // For simplicity here, we assume cloudSaveData is the full state if it's a new load.
            // A more robust solution might involve merging diffs if they were stored separately.
            cloudSave = {
              gameState: mergeStateDiff(
                lastCloudState,
                cloudSaveData.gameState,
              ),
              playTime: cloudSaveData.playTime,
              timestamp: cloudSaveData.timestamp,
            };
            logger.log('[LOAD] 📊 Merged cloud save with lastCloudState:', {
              playTime: cloudSave.playTime,
              gameStatePlayTime: cloudSave.gameState?.playTime,
            });
          } else {
            cloudSave = cloudSaveData;
            logger.log('[LOAD] 📊 Using cloud save directly (no lastCloudState):', {
              playTime: cloudSave.playTime,
              gameStatePlayTime: cloudSave.gameState?.playTime,
            });
          }
        }

        if (isDev) {
          logger.log(`[LOAD] Cloud save processed:`, {
            hasCloudSave: !!cloudSave,
            hasCooldownDurations: !!cloudSave?.gameState?.cooldownDurations,
            cooldownDurations: cloudSave?.gameState?.cooldownDurations,
          });
        }

        // OCC: Compare play times and use the save with longer play time
        if (cloudSave && localSave) {
          const cloudPlayTime = cloudSave.playTime || 0;
          const localPlayTime = localSave.playTime || 0;

          logger.log("[LOAD] 🔍 OCC: Comparing local vs cloud save:", {
            cloudPlayTimeMs: cloudPlayTime.toFixed(2),
            localPlayTimeMs: localPlayTime.toFixed(2),
            cloudPlayTimeMinutes: (cloudPlayTime / 1000 / 60).toFixed(2),
            localPlayTimeMinutes: (localPlayTime / 1000 / 60).toFixed(2),
            differenceMs: (cloudPlayTime - localPlayTime).toFixed(2),
            differenceMinutes: ((cloudPlayTime - localPlayTime) / 1000 / 60).toFixed(2),
            winner:
              cloudPlayTime > localPlayTime
                ? "cloud"
                : localPlayTime === cloudPlayTime
                  ? "equal"
                  : "local",
          });

          // Use whichever has longer play time, but always merge referrals from cloud
          if (cloudPlayTime > localPlayTime) {
            logger.log("[LOAD] ☁️ Using cloud save (longer playTime)");
            
            logger.log('[LOAD] 📊 Before processUnclaimedReferrals:', {
              gameStatePlayTime: cloudSave.gameState?.playTime,
              cloudPlayTime: cloudPlayTime,
              cloudPlayTimeMinutes: (cloudPlayTime / 1000 / 60).toFixed(2),
            });
            
            const processedState = await processUnclaimedReferrals(
              cloudSave.gameState,
            );
            
            logger.log('[LOAD] 📊 After processUnclaimedReferrals:', {
              processedStatePlayTime: processedState?.playTime,
              processedStatePlayTimeMinutes: processedState?.playTime ? (processedState.playTime / 1000 / 60).toFixed(2) : 0,
              cloudPlayTime: cloudPlayTime,
              cloudPlayTimeMinutes: (cloudPlayTime / 1000 / 60).toFixed(2),
            });
            
            const stateToReturn = { ...processedState, playTime: cloudPlayTime };
            
            logger.log('[LOAD] 📊 State being returned to Zustand:', {
              playTime: stateToReturn.playTime,
              playTimeMinutes: (stateToReturn.playTime / 1000 / 60).toFixed(2),
              hasPlayTime: 'playTime' in stateToReturn,
              allPlayTimeKeys: Object.keys(stateToReturn).filter(k => k.includes('play') || k.includes('time')),
            });
            
            logger.log('[LOAD] 💾 About to save cloud state to IndexedDB...');
            // Save to IndexedDB to keep it in sync - use skipOccCheck=true for initial load
            await saveGame(stateToReturn, false, true);
            
            // Verify what was saved
            const verifyLocalSave = await db.get("saves", SAVE_KEY);
            logger.log('[LOAD] ✅ Verified IndexedDB after cloud sync:', {
              savedPlayTime: verifyLocalSave?.playTime,
              savedPlayTimeMinutes: verifyLocalSave?.playTime ? (verifyLocalSave.playTime / 1000 / 60).toFixed(2) : 0,
              savedGameStatePlayTime: verifyLocalSave?.gameState?.playTime,
              expectedPlayTime: cloudPlayTime,
              expectedPlayTimeMinutes: (cloudPlayTime / 1000 / 60).toFixed(2),
              playTimesMatch: verifyLocalSave?.playTime === cloudPlayTime,
            });
            
            await db.put(
              "lastCloudState",
              processedState,
              LAST_CLOUD_STATE_KEY,
            );
            logger.log("[LOAD] ✅ Cloud save loaded and synced locally");
            return stateToReturn;
          } else if (localPlayTime === cloudPlayTime) {
            if (isDev)
              logger.log(
                "[LOAD] ⚖️ Local and cloud have identical playTime - using local without sync",
              );
            // Merge referrals from cloud but don't attempt to sync
            const mergedState = {
              ...localSave.gameState,
              referrals:
                cloudSave.gameState.referrals || localSave.gameState.referrals,
              referralCount:
                cloudSave.gameState.referralCount !== undefined
                  ? cloudSave.gameState.referralCount
                  : localSave.gameState.referralCount,
              cooldowns: localSave.gameState.cooldowns || {},
              cooldownDurations: localSave.gameState.cooldownDurations || {},
            };

            const processedLocalState =
              await processUnclaimedReferrals(mergedState);

            // Update lastCloudState so next save will be a diff
            await db.put(
              "lastCloudState",
              processedLocalState,
              LAST_CLOUD_STATE_KEY,
            );
            if (isDev)
              logger.log("[LOAD] ✅ Using local save (identical playTime)");
            return processedLocalState;
          } else {
            // This case means we're signing in and cloud has MORE playtime than local
            // This is the NORMAL sign-in scenario - cloud has previous sessions
            // DO NOT sync local to cloud in this case, use cloud save instead
            if (isDev)
              logger.log(
                "[LOAD] 🔐 Sign-in detected: Cloud save is newer, using cloud save",
              );
            const processedState = await processUnclaimedReferrals(
              cloudSave.gameState,
            );
            // Save cloud state locally to sync them
            await db.put(
              "saves",
              {
                gameState: processedState,
                timestamp: Date.now(),
                playTime: cloudSave.playTime || 0,
              },
              SAVE_KEY,
            );
            await db.put(
              "lastCloudState",
              processedState,
              LAST_CLOUD_STATE_KEY,
            );
            logger.log("[LOAD] ✅ Cloud save loaded and synced locally");
            return processedState;
          }
        } else if (cloudSave) {
          // Only cloud save exists
          const processedState = await processUnclaimedReferrals(
            cloudSave.gameState,
          );
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
          return processedState;
        } else if (localSave) {
          // Only local save exists, sync to cloud
          const stateWithDefaults = {
            ...localSave.gameState,
            cooldownDurations: localSave.gameState.cooldownDurations || {},
          };
          const processedState =
            await processUnclaimedReferrals(stateWithDefaults);

          try {
            // Force full sync by clearing lastCloudState, then saveGame will handle it
            await db.delete("lastCloudState", LAST_CLOUD_STATE_KEY);
            await saveGame(processedState, false, true); // Pass true to skip OCC check during this initial sync
            await db.put(
              "lastCloudState",
              processedState,
              LAST_CLOUD_STATE_KEY,
            );
          } catch (syncError: any) {
            // If OCC violates due to equal playTimes, that's fine - cloud already has this state
            if (syncError.message?.includes("OCC violation")) {
              if (isDev)
                logger.log(
                  "[LOAD] 📊 Cloud already has this save state - skipping sync",
                );
              await db.put(
                "lastCloudState",
                processedState,
                LAST_CLOUD_STATE_KEY,
              );
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