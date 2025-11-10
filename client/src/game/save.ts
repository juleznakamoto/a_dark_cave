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

export async function saveGame(gameState: GameState): Promise<void> {
  try {
    const db = await getDB();
    
    // Deep clone and sanitize the game state to remove non-serializable data
    const sanitizedState = JSON.parse(JSON.stringify(gameState));
    
    const saveData: SaveData = {
      gameState: sanitizedState,
      timestamp: Date.now(),
    };
    
    // Save locally first (most important)
    await db.put('saves', saveData, SAVE_KEY);
    console.log('Game saved locally');
    
    // Try to save to cloud if user is authenticated (optional enhancement)
    try {
      const user = await getCurrentUser();
      if (user) {
        await saveGameToSupabase(sanitizedState);
        console.log('Game saved to cloud');
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
    // Check if user is authenticated
    const user = await getCurrentUser();
    
    if (user) {
      // Try to load from cloud first
      try {
        const cloudSave = await loadGameFromSupabase();
        if (cloudSave) {
          console.log('Game loaded from cloud');
          console.log('Loaded stats from Supabase:', cloudSave.stats);
          // Also save to local storage
          const db = await getDB();
          await db.put('saves', {
            gameState: cloudSave,
            timestamp: Date.now(),
          }, SAVE_KEY);
          return cloudSave;
        }
      } catch (cloudError) {
        console.error('Failed to load from cloud:', cloudError);
        // Fall back to local save
      }
    }
    
    // Load from local storage
    const db = await getDB();
    const saveData = await db.get('saves', SAVE_KEY);
    
    if (saveData) {
      return saveData.gameState;
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
