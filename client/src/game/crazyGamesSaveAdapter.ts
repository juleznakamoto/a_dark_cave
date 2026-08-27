/**
 * CrazyGames save adapter.
 *
 * The hosted iframe often wipes IndexedDB between visits. CrazyGames APS only
 * restores localStorage for HTML5 games. Their Data module is the official
 * persist path (account sync when logged in; localStorage for guests).
 *
 * Writes go to Data (when the SDK is up) and to localStorage so APS can still
 * restore progress if the Data module toggle is off. IndexedDB stays a
 * same-session cache via save.ts.
 */
import type { SaveData } from "@shared/schema";
import {
  getCrazyGamesData,
  initCrazyGamesSdk,
  shouldUseCrazyGamesPersist,
} from "@/lib/crazyGames";
import { logger } from "@/lib/logger";
import { decodeLocalSave } from "./saveCodec";
import { getGameSaveDatabase, getSaveKey, getStartupSaveHeaderKey } from "./saveStorage";

/** Encoded `ADC2:` blob (or legacy JSON) in Data + localStorage. */
export const CRAZYGAMES_SAVE_STORAGE_KEY = "adc-cg-save";

export { shouldUseCrazyGamesPersist };

function readLocalStorageItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeLocalStorageItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    logger.warn("[CRAZYGAMES] localStorage write failed:", error);
  }
}

function removeLocalStorageItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // Private-mode / quota.
  }
}

function writeDataItem(key: string, value: string): boolean {
  const data = getCrazyGamesData();
  if (!data) return false;
  try {
    data.setItem(key, value);
    return true;
  } catch (error) {
    logger.warn("[CRAZYGAMES] Data module write failed:", error);
    return false;
  }
}

function readDataItem(key: string): string | null {
  const data = getCrazyGamesData();
  if (!data) return null;
  try {
    return data.getItem(key);
  } catch (error) {
    logger.warn("[CRAZYGAMES] Data module read failed:", error);
    return null;
  }
}

function removeDataItem(key: string): void {
  const data = getCrazyGamesData();
  if (!data) return;
  try {
    data.removeItem(key);
  } catch {
    // Disabled module / already cleared.
  }
}

async function ensureCrazyGamesReady(): Promise<boolean> {
  if (!shouldUseCrazyGamesPersist()) return false;
  await initCrazyGamesSdk();
  return !!getCrazyGamesData();
}

/** Persist the encoded save to Data + localStorage. No-op off CrazyGames. */
export async function writeCrazyGamesCloudSave(encoded: string): Promise<void> {
  if (!encoded || !shouldUseCrazyGamesPersist()) return;
  await ensureCrazyGamesReady();
  writeDataItem(CRAZYGAMES_SAVE_STORAGE_KEY, encoded);
  writeLocalStorageItem(CRAZYGAMES_SAVE_STORAGE_KEY, encoded);
}

export function writeCrazyGamesHeaderJson(json: string): void {
  if (!json || !shouldUseCrazyGamesPersist()) return;
  // Header writes are sync at the call site; init may still be in flight.
  void ensureCrazyGamesReady().then((ready) => {
    if (ready) writeDataItem(getStartupSaveHeaderKey(), json);
  });
}

export function readCrazyGamesHeaderJson(): string | null {
  if (!shouldUseCrazyGamesPersist()) return null;
  return (
    readDataItem(getStartupSaveHeaderKey()) ??
    readLocalStorageItem(getStartupSaveHeaderKey())
  );
}

export function readCrazyGamesEncodedSave(): string | null {
  if (!shouldUseCrazyGamesPersist()) return null;
  return (
    readDataItem(CRAZYGAMES_SAVE_STORAGE_KEY) ??
    readLocalStorageItem(CRAZYGAMES_SAVE_STORAGE_KEY)
  );
}

function decodeStoredSave(raw: string | null): SaveData | null {
  if (!raw) return null;
  const asEncoded = decodeLocalSave(raw);
  if (asEncoded) return asEncoded;
  try {
    return decodeLocalSave(JSON.parse(raw));
  } catch {
    return null;
  }
}

/** Read + decode the Data / localStorage save, or null when absent. */
export async function readCrazyGamesSave(): Promise<SaveData | null> {
  if (!shouldUseCrazyGamesPersist()) return null;
  await ensureCrazyGamesReady();
  return decodeStoredSave(readCrazyGamesEncodedSave());
}

export function clearCrazyGamesPersistedData(): void {
  if (!shouldUseCrazyGamesPersist()) return;
  removeDataItem(CRAZYGAMES_SAVE_STORAGE_KEY);
  removeDataItem(getStartupSaveHeaderKey());
  removeLocalStorageItem(CRAZYGAMES_SAVE_STORAGE_KEY);
}

async function readIndexedDbEncodedSave(): Promise<string | null> {
  try {
    const db = await getGameSaveDatabase();
    const raw = await db.get("saves", getSaveKey());
    return typeof raw === "string" && raw.length > 0 ? raw : null;
  } catch {
    return null;
  }
}

/**
 * Init the SDK, hydrate the localStorage header peek, and write any existing
 * save back through `setItem` (CrazyGames QA only lists methods we call, and
 * docs want get-then-set so progress is not dropped).
 */
export async function prepareCrazyGamesStartup(): Promise<void> {
  if (!shouldUseCrazyGamesPersist()) return;
  await ensureCrazyGamesReady();

  const headerKey = getStartupSaveHeaderKey();
  const dataSave = readDataItem(CRAZYGAMES_SAVE_STORAGE_KEY);
  const dataHeader = readDataItem(headerKey);
  const saveRaw =
    dataSave ??
    readLocalStorageItem(CRAZYGAMES_SAVE_STORAGE_KEY) ??
    (await readIndexedDbEncodedSave());

  if (saveRaw) {
    writeDataItem(CRAZYGAMES_SAVE_STORAGE_KEY, saveRaw);
    writeLocalStorageItem(CRAZYGAMES_SAVE_STORAGE_KEY, saveRaw);
  }

  if (dataHeader) {
    writeDataItem(headerKey, dataHeader);
    writeLocalStorageItem(headerKey, dataHeader);
  }
}
