import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import { logger } from "@/lib/logger";
import { getSaveKey, getStartupSaveHeaderKey } from "./saveKeys";

export { getSaveKey, getStartupSaveHeaderKey };

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

export const LAST_CLOUD_STATE_KEY = "lastCloudState";

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
