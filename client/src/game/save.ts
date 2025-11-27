import { openDB, DBSchema } from 'idb';
import { GameState, SaveData } from '@shared/schema';
import { buildGameState } from './stateHelpers';
import { saveGameToSupabase, loadGameFromSupabase, getCurrentUser, processReferralAfterConfirmation } from './auth';

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

const DB_NAME = 'ADarkCaveDB';
const DB_VERSION = 2;
const SAVE_KEY = 'mainSave';
const LAST_CLOUD_STATE_KEY = 'lastCloudState';

// Calculate diff between two states
function calculateStateDiff(oldState: GameState | null, newState: GameState): Partial<GameState> {
  if (!oldState) return newState; // First save, send everything

  const diff: any = {};

  // Helper to check if values are different
  const isDifferent = (a: any, b: any): boolean => {
    if (typeof a !== typeof b) return true;
    if (a === b) return false;
    if (a === null || b === null) return true;
    if (typeof a === 'object') {
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
function mergeStateDiff(baseState: GameState, diff: Partial<GameState>): GameState {
  return { ...baseState, ...diff };
}

async function getDB() {
  try {
    const db = await openDB<GameDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          db.createObjectStore('saves');
        }
        if (oldVersion < 2) {
          if (!db.objectStoreNames.contains('lastCloudState')) {
            db.createObjectStore('lastCloudState');
          }
        }
      },
    });
    return db;
  } catch (error) {
    console.error('Failed to open database:', error);
    throw error;
  }
}

// Helper function to process unclaimed referrals
async function processUnclaimedReferrals(gameState: GameState): Promise<GameState> {
  const { useGameStore } = await import('./state');
  const currentUser = await getCurrentUser();

  // If no user or no referrals, return gameState as is
  if (!currentUser || !gameState.referrals || gameState.referrals.length === 0) {
    return gameState;
  }

  let updatedGameState = { ...gameState };
  let goldGained = 0;
  let logEntriesAdded: any[] = [];

  // Process unclaimed referrals
  const updatedReferrals = updatedGameState.referrals.map(referral => {
    if (!referral.claimed) {
      // Claim this referral
      goldGained += 100;
      logEntriesAdded.push({
        id: `referral-claimed-${referral.userId}-${Date.now()}`,
        timestamp: Date.now(),
        message: `You invited someone new to this world! +100 Gold`,
        type: 'system',
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


export async function saveGame(gameState: GameState, playTime: number = 0): Promise<void> {
  try {
    // Check if game is inactive - if so, don't save
    const { useGameStore } = await import('./state');
    const currentState = useGameStore.getState();
    if (currentState.inactivityDialogOpen) {
      console.log('[SAVE] ⚠️ Game is inactive - skipping save');
      return;
    }

    const db = await getDB();

    // Deep clone and sanitize the game state to remove non-serializable data
    const sanitizedState = JSON.parse(JSON.stringify(gameState));

    // Ensure cooldownDurations is always present
    if (!sanitizedState.cooldownDurations) {
      sanitizedState.cooldownDurations = {};
    }

    // Add timestamp to track save recency
    const now = Date.now();
    sanitizedState.lastSaved = now;

    console.log(`[SAVE] Saving game state:`, {
      timestamp: now,
      playTime,
      hasCooldowns: !!sanitizedState.cooldowns,
      cooldownsCount: sanitizedState.cooldowns ? Object.keys(sanitizedState.cooldowns).length : 0,
      cooldowns: sanitizedState.cooldowns,
      hasCooldownDurations: !!sanitizedState.cooldownDurations,
      cooldownDurationsCount: sanitizedState.cooldownDurations ? Object.keys(sanitizedState.cooldownDurations).length : 0,
      cooldownDurations: sanitizedState.cooldownDurations,
      cooldownDetails: Object.keys(sanitizedState.cooldowns || {}).map(key => ({
        action: key,
        remaining: sanitizedState.cooldowns[key],
        duration: sanitizedState.cooldownDurations?.[key]
      }))
    });

    const saveData: SaveData = {
      gameState: sanitizedState,
      timestamp: now,
      playTime: playTime,
    };

    // Save locally first (most important)
    await db.put('saves', saveData, SAVE_KEY);
    console.log(`[SAVE] ✅ Successfully saved to IndexedDB`);

    // Try to save to cloud if user is authenticated (optional enhancement)
    try {
      const user = await getCurrentUser();
      if (user) {
        const isNewGame = gameState.isNewGame || false;

        // Get and reset click analytics
        const clickData = useGameStore.getState().getAndResetClickAnalytics();

        // Get last cloud state for diff calculation
        const lastCloudState = await db.get('lastCloudState', LAST_CLOUD_STATE_KEY);
        const stateDiff = calculateStateDiff(lastCloudState || null, sanitizedState);

        console.log('[SAVE] 📤 Attempting cloud save with OCC check...', {
          playTime,
          isNewGame,
          hasClickData: !!clickData
        });

        // Before saving, check if there's a newer save in the cloud
        const cloudSave = await loadGameFromSupabase();
        if (cloudSave) {
          const cloudPlayTime = cloudSave.playTime || 0;
          const localPlayTime = playTime;

          const timeDifference = localPlayTime - cloudPlayTime;
          const MIN_TIME_AHEAD = 5000; // Local must be at least 5 seconds ahead

          console.log('[SAVE] 🔍 OCC check - comparing playtimes:', {
            cloudPlayTimeSeconds: (cloudPlayTime / 1000).toFixed(2),
            localPlayTimeSeconds: (localPlayTime / 1000).toFixed(2),
            differenceSeconds: (timeDifference / 1000).toFixed(2),
            minRequiredAheadSeconds: (MIN_TIME_AHEAD / 1000).toFixed(2),
            isAheadEnough: timeDifference >= MIN_TIME_AHEAD,
            willStopTab: timeDifference < MIN_TIME_AHEAD
          });

          // Enforce minimum time ahead requirement
          if (timeDifference < MIN_TIME_AHEAD) {
            console.warn('[SAVE] ⚠️ Local playTime not ahead enough - stopping this tab:', {
              cloudPlayTimeSeconds: (cloudPlayTime / 1000).toFixed(2),
              localPlayTimeSeconds: (localPlayTime / 1000).toFixed(2),
              differenceSeconds: (timeDifference / 1000).toFixed(2),
              requiredSeconds: (MIN_TIME_AHEAD / 1000).toFixed(2)
            });
            console.log('[SAVE] 🛑 Another tab/device is actively playing - stopping this tab...');

            // Stop game loop and show inactivity dialog
            const { stopGameLoop } = await import('./loop');

            useGameStore.setState({
              isGameLoopActive: false,
              inactivityDialogOpen: true,
              inactivityReason: 'multitab'
            });

            stopGameLoop();
            return; // Don't save
          }

          if (cloudPlayTime > localPlayTime) {
            console.warn('[SAVE] ⚠️ Detected newer save in cloud:', {
              cloudPlayTimeSeconds: (cloudPlayTime / 1000).toFixed(2),
              localPlayTimeSeconds: (localPlayTime / 1000).toFixed(2),
              differenceSeconds: ((cloudPlayTime - localPlayTime) / 1000).toFixed(2)
            });
            console.log('[SAVE] 🛑 Another tab/device is actively playing - stopping this tab...');

            // Stop game loop and show inactivity dialog
            const { stopGameLoop } = await import('./loop');

            useGameStore.setState({
              isGameLoopActive: false,
              inactivityDialogOpen: true,
              inactivityReason: 'multitab'
            });

            stopGameLoop();
            return; // Don't save
          }
        }

        // Save diff to Supabase (includes OCC check)
        await saveGameToSupabase(stateDiff, playTime, isNewGame, clickData);

        // Update last cloud state
        await db.put('lastCloudState', sanitizedState, LAST_CLOUD_STATE_KEY);
        console.log('[SAVE] ✅ Cloud save successful');
      }
    } catch (cloudError: any) {
      console.debug('[SAVE] Cloud save skipped:', cloudError);
    }
  } catch (error) {
    console.error('[SAVE] ❌ Failed to save game locally:', error);
    throw error;
  }
}

export async function loadGame(): Promise<GameState | null> {
  try {
    console.log(`[LOAD] 🎮 Starting game load process...`);

    // Process referral if user just confirmed email
    await processReferralAfterConfirmation();

    const db = await getDB();
    const localSave = await db.get('saves', SAVE_KEY);

    console.log(`[LOAD] 💾 Local save retrieved:`, {
      hasLocalSave: !!localSave,
      timestamp: localSave?.timestamp ? new Date(localSave.timestamp).toISOString() : 'none',
      playTime: localSave?.playTime,
      playTimeMinutes: localSave?.playTime ? Math.round(localSave.playTime / 1000 / 60) : 0,
      hasCooldowns: !!localSave?.gameState?.cooldowns,
      cooldowns: localSave?.gameState?.cooldowns,
      hasCooldownDurations: !!localSave?.gameState?.cooldownDurations,
      cooldownDurations: localSave?.gameState?.cooldownDurations,
      cooldownDetails: Object.keys(localSave?.gameState?.cooldowns || {}).map(key => ({
        action: key,
        remaining: localSave?.gameState?.cooldowns[key],
        duration: localSave?.gameState?.cooldownDurations?.[key]
      }))
    });

    // Check if user is authenticated
    const user = await getCurrentUser();

    if (user) {
      // Try to load from cloud
      try {
        const cloudSaveData = await loadGameFromSupabase();
        const lastCloudState = await db.get('lastCloudState', LAST_CLOUD_STATE_KEY);
        const cloudSave = cloudSaveData ? (lastCloudState ? mergeStateDiff(lastCloudState, cloudSaveData) : cloudSaveData) : null;

        console.log(`[LOAD] Cloud save processed:`, {
          hasCloudSave: !!cloudSave,
          hasCooldownDurations: !!cloudSave?.cooldownDurations,
          cooldownDurations: cloudSave?.cooldownDurations
        });

        // OCC: Compare play times and use the save with longer play time
        if (cloudSave && localSave) {
          const cloudPlayTime = cloudSave.playTime || 0;
          const localPlayTime = localSave.playTime || 0;

          const timeDifference = localPlayTime - cloudPlayTime;
          const MIN_TIME_AHEAD = 5000; // Local must be at least 5 seconds ahead

          console.log('[LOAD] 🔍 OCC: Comparing local vs cloud save:', {
            cloudPlayTimeSeconds: (cloudPlayTime / 1000).toFixed(2),
            localPlayTimeSeconds: (localPlayTime / 1000).toFixed(2),
            differenceSeconds: (timeDifference / 1000).toFixed(2),
            minRequiredAheadSeconds: (MIN_TIME_AHEAD / 1000).toFixed(2),
            winner: timeDifference >= MIN_TIME_AHEAD ? 'local' : 'cloud'
          });

          // Use whichever has longer play time, but always merge referrals from cloud
          if (cloudPlayTime > localPlayTime) {
            console.log('[LOAD] ☁️ Using cloud save (longer playTime)');
            const processedState = await processUnclaimedReferrals(cloudSave);
            await db.put('saves', {
              gameState: processedState,
              timestamp: Date.now(),
              playTime: cloudPlayTime,
            }, SAVE_KEY);
            await db.put('lastCloudState', processedState, LAST_CLOUD_STATE_KEY);
            console.log('[LOAD] ✅ Cloud save loaded and synced locally');
            return processedState;
          } else {
            console.log('[LOAD] 💾 Using local save (longer playTime), syncing to cloud...');
            // Local has longer play time, but merge referrals from cloud
            const mergedState = {
              ...localSave.gameState,
              referrals: cloudSave.referrals || localSave.gameState.referrals,
              referralCount: cloudSave.referralCount !== undefined ? cloudSave.referralCount : localSave.gameState.referralCount,
              cooldowns: localSave.gameState.cooldowns || {},
              cooldownDurations: localSave.gameState.cooldownDurations || {},
            };

            const processedLocalState = await processUnclaimedReferrals(mergedState);

            // Sync merged state to cloud
            console.log('[LOAD] 📤 Syncing local save to cloud...');
            await db.delete('lastCloudState', LAST_CLOUD_STATE_KEY); // Force full sync
            await saveGameToSupabase(processedLocalState);
            await db.put('lastCloudState', processedLocalState, LAST_CLOUD_STATE_KEY);
            console.log('[LOAD] ✅ Local save synced to cloud');
            return processedLocalState;
          }
        } else if (cloudSave) {
          // Only cloud save exists
          const processedState = await processUnclaimedReferrals(cloudSave);
          await db.put('saves', {
            gameState: processedState,
            timestamp: Date.now(),
            playTime: processedState.playTime || 0,
          }, SAVE_KEY);
          await db.put('lastCloudState', processedState, LAST_CLOUD_STATE_KEY);
          return processedState;
        } else if (localSave) {
          // Only local save exists, sync to cloud
          const stateWithDefaults = {
            ...localSave.gameState,
            cooldownDurations: localSave.gameState.cooldownDurations || {},
          };
          const processedState = await processUnclaimedReferrals(stateWithDefaults);

          try {
            await saveGameToSupabase(processedState);
            await db.put('lastCloudState', processedState, LAST_CLOUD_STATE_KEY);
          } catch (syncError: any) {
            // If OCC rejects due to equal playTimes, that's fine - cloud already has this state
            if (syncError.message?.includes('OCC violation')) {
              console.log('[LOAD] 📊 Cloud already has this save state - skipping sync');
              await db.put('lastCloudState', processedState, LAST_CLOUD_STATE_KEY);
            } else {
              throw syncError;
            }
          }

          return processedState;
        }
      } catch (cloudError) {
        console.error('Failed to load from cloud:', cloudError);
        // Fall back to local save if cloud fails
        if (localSave) {
          const processedState = await processUnclaimedReferrals(localSave.gameState);
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
        const processedState = await processUnclaimedReferrals(stateWithDefaults);
        console.log(`[LOAD] Returning local state (no auth):`, {
          hasCooldownDurations: !!processedState.cooldownDurations,
          cooldownDurations: processedState.cooldownDurations
        });
        return processedState;
      }
    }

    console.log(`[LOAD] No save found, returning null`);
    return null;
  } catch (error) {
    console.error('Failed to load game:', error);
    return null;
  }
}

export async function deleteSave(): Promise<void> {
  try {
    const db = await getDB();
    await db.delete('saves', SAVE_KEY);
  } catch (error) {
    console.error('Failed to delete save:', error);
  }
}