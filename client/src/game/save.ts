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
    console.log('[SAVE] Starting game save...');
    const db = await getDB();
    
    // Create a clean serializable copy of the game state
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
    
    const saveData: SaveData = {
      gameState: cleanGameState,
      timestamp: Date.now(),
      playTime: 0, // Could be tracked in the future
    };
    
    await db.put('saves', saveData, SAVE_KEY);
    console.log('[SAVE] Game saved successfully');
  } catch (error) {
    console.error('[SAVE] Failed to save game:', error);
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
