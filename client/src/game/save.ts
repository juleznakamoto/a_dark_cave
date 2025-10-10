import { openDB, DBSchema } from 'idb';
import { GameState, SaveData } from '@shared/schema';
import { buildGameState } from './stateHelpers';

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
