import { openDB, DBSchema } from 'idb';
import { GameState, SaveData } from '@shared/schema';
import { buildGameState } from './stateHelpers';
import { saveGameToSupabase, loadGameFromSupabase, getCurrentUser } from './auth';

interface GameDB extends DBSchema {
  saves: {
    key: string;
    value: SaveData;
  };
}

const DB_NAME = 'ADarkCaveDB';
const DB_VERSION = 1;
const SAVE_KEY = 'mainSave';

async function getDB() {
  try {
    const db = await openDB<GameDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        db.createObjectStore('saves');
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
        
        // Always send click data (never null unless it's actually empty)
        await saveGameToSupabase(sanitizedState, playTime, isNewGame, clickData);
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
            return cloudSave;
          } else {
            if (import.meta.env.DEV) {
              console.log('Using local save (longer play time), syncing to cloud');
            }
            // Local has longer play time, sync it to cloud
            await saveGameToSupabase(localSave.gameState);
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
          return cloudSave;
        } else if (localSave) {
          // Only local save exists, sync to cloud
          if (import.meta.env.DEV) {
            console.log('Local save found, syncing to cloud');
          }
          await saveGameToSupabase(localSave.gameState);
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