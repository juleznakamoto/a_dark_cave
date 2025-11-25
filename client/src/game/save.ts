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
        message: `A friend joined using your invite link! +100 Gold`,
        type: 'system',
      });

      return { ...referral, claimed: true };
    }
    return referral;
  });

  // Update game state if any referrals were claimed
  if (goldGained > 0) {
    updatedGameState.referrals = updatedReferrals;
    updatedGameState.resources = {
      ...updatedGameState.resources,
      gold: (updatedGameState.resources?.gold || 0) + goldGained,
    };
    updatedGameState.log = [...(updatedGameState.log || []), ...logEntriesAdded].slice(-100);

    // Update the store as well
    useGameStore.setState({
      resources: updatedGameState.resources,
      log: updatedGameState.log,
      referrals: updatedGameState.referrals,
    });

    console.log('[REFERRAL] Processed unclaimed referrals. Gained:', { goldGained, count: logEntriesAdded.length });
  }

  return updatedGameState;
}


export async function saveGame(gameState: GameState, playTime: number = 0): Promise<void> {
  try {
    const db = await getDB();

    // Deep clone and sanitize the game state to remove non-serializable data
    const sanitizedState = JSON.parse(JSON.stringify(gameState));

    // Add timestamp to track save recency
    const now = Date.now();
    sanitizedState.lastSaved = now;

    const saveData: SaveData = {
      gameState: sanitizedState,
      timestamp: now,
      playTime: playTime,
    };

    // Save locally first (most important)
    await db.put('saves', saveData, SAVE_KEY);

    // Try to save to cloud if user is authenticated (optional enhancement)
    try {
      const user = await getCurrentUser();
      if (user) {
        const isNewGame = gameState.isNewGame || false;

        // Get and reset click analytics
        const { useGameStore } = await import('./state');
        const clickData = useGameStore.getState().getAndResetClickAnalytics();

        // Get last cloud state for diff calculation
        const lastCloudState = await db.get('lastCloudState', LAST_CLOUD_STATE_KEY);
        const stateDiff = calculateStateDiff(lastCloudState || null, sanitizedState);

        // Save diff to Supabase
        await saveGameToSupabase(stateDiff, playTime, isNewGame, clickData);

        // Update last cloud state
        await db.put('lastCloudState', sanitizedState, LAST_CLOUD_STATE_KEY);
      }
    } catch (cloudError) {
      // Silently fail cloud save - local save is what matters
      console.debug('Cloud save skipped:', cloudError);
    }
  } catch (error) {
    console.error('Failed to save game locally:', error);
    throw error;
  }
}

export async function loadGame(): Promise<GameState | null> {
  try {
    // Process referral if user just confirmed email
    await processReferralAfterConfirmation();

    const db = await getDB();
    const localSave = await db.get('saves', SAVE_KEY);

    // Check if user is authenticated
    const user = await getCurrentUser();

    if (user) {
      // Try to load from cloud
      try {
        const cloudSaveData = await loadGameFromSupabase();
        // Ensure we have a valid GameState object from cloudSaveData
        const cloudSave = cloudSaveData ? cloudSaveData.gameState : null;

        // Compare play times and use the save with longer play time
        if (cloudSave && localSave) {
          const cloudPlayTime = cloudSave.playTime || 0;
          const localPlayTime = localSave.playTime || 0;

          console.log('[LOAD] Comparing saves:', {
            cloudPlayTime,
            localPlayTime,
            cloudGold: cloudSave.resources?.gold,
            localGold: localSave.gameState.resources?.gold,
          });

          // Use whichever has longer play time, but always merge referrals from cloud
          if (cloudPlayTime > localPlayTime) {
            console.log('[LOAD] ✓ Using cloud save (longer play time)');
            const processedState = await processUnclaimedReferrals(cloudSave);
            // Update local with cloud save
            await db.put('saves', {
              gameState: processedState,
              timestamp: Date.now(),
              playTime: cloudPlayTime,
            }, SAVE_KEY);
            // Store as last cloud state
            await db.put('lastCloudState', processedState, LAST_CLOUD_STATE_KEY);
            return processedState;
          } else {
            if (import.meta.env.DEV) {
              console.log('Using local save (longer play time), merging referrals from cloud');
            }
            // Local has longer play time, but merge referrals from cloud
            const mergedState = {
              ...localSave.gameState,
              // Always use referrals from cloud (they're the source of truth)
              referrals: cloudSave.referrals || localSave.gameState.referrals,
              referralCount: cloudSave.referralCount !== undefined ? cloudSave.referralCount : localSave.gameState.referralCount,
            };
            
            // Process any unclaimed referrals
            const processedLocalState = await processUnclaimedReferrals(mergedState);
            
            // Sync merged state to cloud
            await db.delete('lastCloudState', LAST_CLOUD_STATE_KEY); // Force full sync
            await saveGameToSupabase(processedLocalState);
            await db.put('lastCloudState', processedLocalState, LAST_CLOUD_STATE_KEY);
            return processedLocalState;
          }
        } else if (cloudSave) {
          // Only cloud save exists
          console.log('[LOAD] ✓ Using cloud save (no local save):', {
            gold: cloudSave.resources?.gold,
            hasLog: cloudSave.log?.length > 0,
          });
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
          console.log('[LOAD] ✓ Using local save, syncing to cloud:', {
            gold: localSave.gameState.resources?.gold,
          });
          const processedState = await processUnclaimedReferrals(localSave.gameState);
          await saveGameToSupabase(processedState);
          await db.put('lastCloudState', processedState, LAST_CLOUD_STATE_KEY);
          return processedState;
        }
      } catch (cloudError) {
        console.error('Failed to load from cloud:', cloudError);
        // Fall back to local save if cloud fails
        if (localSave) {
          if (import.meta.env.DEV) {
            console.log('Using local save (cloud error)');
          }
          const processedState = await processUnclaimedReferrals(localSave.gameState);
          return processedState;
        }
      }
    } else {
      // Not authenticated, use local save only
      if (localSave) {
        const processedState = await processUnclaimedReferrals(localSave.gameState);
        return processedState;
      }
    }

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