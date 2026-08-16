import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import {
  isCrazyGamesEdition,
  isGalaxyEdition,
  isSteamDemoBuild,
  isSteamPlaytestBuild,
} from "@/lib/edition";
import { logger } from "@/lib/logger";

interface GameDB extends DBSchema {
  saves: {
    key: string;
    value: unknown;
  };
  lastCloudState: {
    key: string;
    value: unknown;
  };
}

const DB_NAME = "ADarkCaveDB";
const DB_VERSION = 2;
const SAVE_KEY_MAIN = "mainSave";
const SAVE_KEY_GALAXY = "galaxySave";
const SAVE_KEY_CRAZYGAMES = "crazyGamesSave";
const SAVE_KEY_STEAM_DEMO = "steamDemoSave";
const SAVE_KEY_STEAM_PLAYTEST = "steamPlaytestSave";

export const LAST_CLOUD_STATE_KEY = "lastCloudState";

export function getSaveKey(): string {
  if (isSteamPlaytestBuild) return SAVE_KEY_STEAM_PLAYTEST;
  if (isSteamDemoBuild) return SAVE_KEY_STEAM_DEMO;
  if (isCrazyGamesEdition()) return SAVE_KEY_CRAZYGAMES;
  if (isGalaxyEdition()) return SAVE_KEY_GALAXY;
  return SAVE_KEY_MAIN;
}

export function getStartupSaveHeaderKey(): string {
  return `adc-startup-save-header:${getSaveKey()}`;
}

export async function getGameSaveDatabase(): Promise<IDBPDatabase<GameDB>> {
  try {
    return await openDB<GameDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          db.createObjectStore("saves");
        }
        if (oldVersion < 2) {
          if (!db.objectStoreNames.contains("lastCloudState")) {
            db.createObjectStore("lastCloudState");
          }
        }
      },
    });
  } catch (error) {
    logger.error("Failed to open database:", error);
    throw error;
  }
}
