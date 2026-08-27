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
} from "@/lib/crazyGames";
import { isCrazyGamesEdition } from "@/lib/edition";
import { logger } from "@/lib/logger";
import { decodeLocalSave } from "./saveCodec";
import { getStartupSaveHeaderKey } from "./saveKeys";

/** Encoded `ADC2:` blob (or legacy JSON) in Data + localStorage. */
export const CRAZYGAMES_SAVE_STORAGE_KEY = "adc-cg-save";

function canUseCrazyGamesPersist(): boolean {
  return isCrazyGamesEdition();
}

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

function writeDataItem(key: string, value: string): void {
  const data = getCrazyGamesData();
  if (!data) return;
  try {
    data.setItem(key, value);
  } catch (error) {
    logger.warn("[CRAZYGAMES] Data module write failed:", error);
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

/** Persist the encoded save to Data + localStorage. No-op off CrazyGames. */
export async function writeCrazyGamesCloudSave(encoded: string): Promise<void> {
  if (!canUseCrazyGamesPersist() || !encoded) return;
  await initCrazyGamesSdk();
  writeDataItem(CRAZYGAMES_SAVE_STORAGE_KEY, encoded);
  writeLocalStorageItem(CRAZYGAMES_SAVE_STORAGE_KEY, encoded);
}

export function writeCrazyGamesHeaderJson(json: string): void {
  if (!canUseCrazyGamesPersist() || !json) return;
  writeDataItem(getStartupSaveHeaderKey(), json);
  // Header also stays in localStorage via writeStartupSaveHeader.
}

export function readCrazyGamesHeaderJson(): string | null {
  if (!canUseCrazyGamesPersist()) return null;
  return (
    readDataItem(getStartupSaveHeaderKey()) ??
    readLocalStorageItem(getStartupSaveHeaderKey())
  );
}

export function readCrazyGamesEncodedSave(): string | null {
  if (!canUseCrazyGamesPersist()) return null;
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
  if (!canUseCrazyGamesPersist()) return null;
  await initCrazyGamesSdk();
  return decodeStoredSave(readCrazyGamesEncodedSave());
}

export function clearCrazyGamesPersistedData(): void {
  if (!canUseCrazyGamesPersist()) return;
  removeDataItem(CRAZYGAMES_SAVE_STORAGE_KEY);
  removeDataItem(getStartupSaveHeaderKey());
  removeLocalStorageItem(CRAZYGAMES_SAVE_STORAGE_KEY);
}

/**
 * Init the SDK and copy a Data-module header into localStorage so the sync
 * `peekStartupGameStarted()` check can skip the start-screen chunk.
 */
export async function prepareCrazyGamesStartup(): Promise<void> {
  if (!canUseCrazyGamesPersist()) return;
  await initCrazyGamesSdk();
  const headerJson = readDataItem(getStartupSaveHeaderKey());
  if (!headerJson) return;
  writeLocalStorageItem(getStartupSaveHeaderKey(), headerJson);
}
