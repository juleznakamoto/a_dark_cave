import { openDB, DBSchema } from 'idb';
import { GameState, SaveData } from '@shared/schema';

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
    
    // Custom serializer that excludes functions and non-serializable data
    const cleanGameState = JSON.parse(JSON.stringify(gameState, (key, value) => {
      // Filter out functions
      if (typeof value === 'function') {
        return undefined;
      }
      // Filter out any Zustand-specific properties
      if (key.startsWith('_') || key === 'subscribe' || key === 'getState' || key === 'setState') {
        return undefined;
      }
      return value;
    }));
    
    const saveData: SaveData = {
      gameState: cleanGameState,
      timestamp: Date.now(),
    };
    
    await db.put('saves', saveData, SAVE_KEY);
  } catch (error) {
    console.error('Failed to save game:', error);
    throw error;
  }
}

export async function loadGame(): Promise<GameState | null> {
  try {
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
