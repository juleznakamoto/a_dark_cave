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
        const cloudSave = await loadGameFromSupabase();

        // Compare play times and use the save with longer play time
        if (cloudSave && localSave) {
          const cloudPlayTime = cloudSave.playTime || 0;
          const localPlayTime = localSave.playTime || 0;

          if (import.meta.env.DEV) {
            console.log('Comparing saves - Cloud playTime:', cloudPlayTime, 'Local playTime:', localPlayTime);
          }

          // Use whichever has longer play time
          if (cloudPlayTime > localPlayTime) {
            if (import.meta.env.DEV) {
              console.log('Using cloud save (longer play time)');
            }
            // Update local with cloud save
            await db.put('saves', {
              gameState: cloudSave,
              timestamp: Date.now(),
              playTime: cloudPlayTime,
            }, SAVE_KEY);
            // Store as last cloud state
            await db.put('lastCloudState', cloudSave, LAST_CLOUD_STATE_KEY);
            return cloudSave;
          } else {
            if (import.meta.env.DEV) {
              console.log('Using local save (longer play time), syncing to cloud');
            }
            // Local has longer play time, sync it to cloud (full state on first sync)
            await db.delete('lastCloudState', LAST_CLOUD_STATE_KEY); // Force full sync
            await saveGameToSupabase(localSave.gameState);
            await db.put('lastCloudState', localSave.gameState, LAST_CLOUD_STATE_KEY);
            return localSave.gameState;
          }
        } else if (cloudSave) {
          // Only cloud save exists
          if (import.meta.env.DEV) {
            console.log('Game State loaded from cloud (no local save)');
          }
          await db.put('saves', {
            gameState: cloudSave,
            timestamp: Date.now(),
            playTime: cloudSave.playTime || 0,
          }, SAVE_KEY);
          await db.put('lastCloudState', cloudSave, LAST_CLOUD_STATE_KEY);
          return cloudSave;
        } else if (localSave) {
          // Only local save exists, sync to cloud
          if (import.meta.env.DEV) {
            console.log('Local save found, syncing to cloud');
          }
          await saveGameToSupabase(localSave.gameState);
          await db.put('lastCloudState', localSave.gameState, LAST_CLOUD_STATE_KEY);
          return localSave.gameState;
        }
      } catch (cloudError) {
        console.error('Failed to load from cloud:', cloudError);
        // Fall back to local save if cloud fails
        if (localSave) {
          if (import.meta.env.DEV) {
            console.log('Using local save (cloud error)');
          }
          return localSave.gameState;
        }
      }
    } else {
      // Not authenticated, use local save only
      if (localSave) {
        return localSave.gameState;
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