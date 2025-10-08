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
  console.log('[SAVE] getDB called - opening database:', DB_NAME, 'version:', DB_VERSION);
  
  try {
    const db = await openDB<GameDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        console.log('[SAVE] Database upgrade needed, creating object store');
        db.createObjectStore('saves');
      },
    });
    console.log('[SAVE] Database opened successfully');
    return db;
  } catch (error) {
    console.error('[SAVE] Failed to open database:', error);
    throw error;
  }
}

export async function saveGame(gameState: GameState): Promise<void> {
  console.log('[SAVE] saveGame function called');
  
  try {
    console.log('[SAVE] Opening IndexedDB...');
    const db = await getDB();
    console.log('[SAVE] IndexedDB opened successfully');
    
    // Create a clean serializable copy of the game state
    console.log('[SAVE] Creating clean game state copy...');
    const cleanGameState: GameState = {
      resources: { ...gameState.resources },
      stats: { ...gameState.stats },
      flags: { ...gameState.flags },
      tools: { ...gameState.tools },
      weapons: { ...gameState.weapons },
      clothing: { ...gameState.clothing },
      relics: { ...gameState.relics },
      buildings: { ...gameState.buildings },
      villagers: { ...gameState.villagers },
      story: {
        seen: { ...gameState.story.seen }
      },
      events: { ...gameState.events },
      log: gameState.log.map(entry => ({
        id: entry.id,
        message: entry.message,
        timestamp: entry.timestamp,
        type: entry.type,
        title: entry.title,
        // Don't save choices or other function references
      })),
      current_population: gameState.current_population,
      total_population: gameState.total_population,
      version: gameState.version,
    };
    console.log('[SAVE] Clean game state created');
    
    const saveData: SaveData = {
      gameState: cleanGameState,
      timestamp: Date.now(),
      playTime: 0, // Could be tracked in the future
    };
    console.log('[SAVE] Save data object created, timestamp:', saveData.timestamp);
    
    console.log('[SAVE] Writing to IndexedDB...');
    await db.put('saves', saveData, SAVE_KEY);
    console.log('[SAVE] Successfully wrote to IndexedDB with key:', SAVE_KEY);
  } catch (error) {
    console.error('[SAVE] Failed to save game:', error);
    console.error('[SAVE] Error details:', {
      name: error?.name,
      message: error?.message,
      stack: error?.stack
    });
    throw error; // Re-throw to propagate the error
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
