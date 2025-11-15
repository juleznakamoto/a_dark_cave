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
  // RAM TEST: Save game completely disabled
  if (import.meta.env.DEV) {
    console.log('[RAM TEST] saveGame() called but disabled');
  }
  return;
}

export async function loadGame(): Promise<GameState | null> {
  // RAM TEST: Load game completely disabled
  if (import.meta.env.DEV) {
    console.log('[RAM TEST] loadGame() called but disabled - returning null');
  }
  return null;
}

export async function deleteSave(): Promise<void> {
  try {
    const db = await getDB();
    await db.delete('saves', SAVE_KEY);
  } catch (error) {
    console.error('Failed to delete save:', error);
  }
}