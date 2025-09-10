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
  return openDB<GameDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      db.createObjectStore('saves');
    },
  });
}

export async function saveGame(gameState: GameState): Promise<void> {
  try {
    const db = await getDB();
    const saveData: SaveData = {
      gameState,
      timestamp: Date.now(),
      playTime: 0, // Could be tracked in the future
    };
    
    await db.put('saves', saveData, SAVE_KEY);
  } catch (error) {
    console.error('Failed to save game:', error);
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
