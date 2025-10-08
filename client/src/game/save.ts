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
    
    // Create a clean serializable copy of the game state
    const cleanGameState: GameState = {
      resources: { ...gameState.resources },
      stats: { ...gameState.stats },
      flags: { ...gameState.flags },
      tools: { ...gameState.tools },
      weapons: { ...gameState.weapons },
      clothing: { ...gameState.clothing },
      relics: { ...gameState.relics },
      blessings: { ...gameState.blessings },
      schematics: { ...gameState.schematics },
      buildings: { ...gameState.buildings },
      villagers: { ...gameState.villagers },
      story: {
        seen: { ...gameState.story.seen }
      },
      damagedBuildings: { ...gameState.damagedBuildings },
      events: { ...gameState.events },
      effects: { ...gameState.effects },
      bastion_stats: { ...gameState.bastion_stats },
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
      hasWizardTower: gameState.hasWizardTower,
      wizardArrives: gameState.wizardArrives,
      wizardDecryptsScrolls: gameState.wizardDecryptsScrolls,
      templeDedicated: gameState.templeDedicated,
      templeDedicatedTo: gameState.templeDedicatedTo,
    };
    
    const saveData: SaveData = {
      gameState: cleanGameState,
      timestamp: Date.now(),
      playTime: 0, // Could be tracked in the future
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
