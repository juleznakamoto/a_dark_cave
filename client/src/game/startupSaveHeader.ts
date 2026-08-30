import type { SaveData } from "@shared/schema";
import { type DevGameMode } from "@/lib/edition";
import { logger } from "@/lib/logger";
import {
  readCrazyGamesHeaderJson,
  readCrazyGamesSave,
  shouldUseCrazyGamesPersist,
  writeCrazyGamesHeaderJson,
} from "./crazyGamesSaveAdapter";
import { decodeLocalSave } from "./saveCodec";
import {
  getGameSaveDatabase,
  getSaveKey,
  getStartupSaveHeaderKey,
} from "./saveStorage";

export interface StartupSaveHeader {
  version: 1;
  gameStarted: boolean;
  cruelMode: boolean;
  musicMuted: boolean;
  sfxMuted: boolean;
  musicVolume: number;
  sfxVolume: number;
  devGameMode: DevGameMode;
}

export type StartupSaveHeaderResult =
  | { status: "loaded"; header: StartupSaveHeader }
  | { status: "not-found" }
  | { status: "error"; error: unknown; retryable: boolean };

type StartupStateFields = {
  flags?: {
    gameStarted?: boolean;
    villageUnlocked?: boolean;
    forestUnlocked?: boolean;
    bastionUnlocked?: boolean;
  };
  story?: { seen?: { fireLit?: boolean } };
  playTime?: number;
  cruelMode?: boolean;
  musicMuted?: boolean;
  sfxMuted?: boolean;
  musicVolume?: number;
  sfxVolume?: number;
  devGameMode?: DevGameMode;
};

const DEV_GAME_MODES = new Set<DevGameMode>([
  "normal",
  "steamGame",
  "steamPlaytest",
  "steamDemo",
  "demoEnd",
  "crazyGamesDemo",
]);

class InvalidStartupSaveError extends Error {
  constructor() {
    super("The local save exists but its startup metadata could not be decoded");
    this.name = "InvalidStartupSaveError";
  }
}

function clampVolume(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.min(1, value))
    : 1;
}

function isStartupSaveHeader(value: unknown): value is StartupSaveHeader {
  if (!value || typeof value !== "object") return false;
  const header = value as Partial<StartupSaveHeader>;
  return (
    header.version === 1 &&
    typeof header.gameStarted === "boolean" &&
    typeof header.cruelMode === "boolean" &&
    typeof header.musicMuted === "boolean" &&
    typeof header.sfxMuted === "boolean" &&
    typeof header.musicVolume === "number" &&
    typeof header.sfxVolume === "number" &&
    typeof header.devGameMode === "string" &&
    DEV_GAME_MODES.has(header.devGameMode as DevGameMode)
  );
}

export function createStartupSaveHeader(data: SaveData): StartupSaveHeader {
  const state = data.gameState as typeof data.gameState & StartupStateFields;
  const hasProgress =
    state.flags?.gameStarted === true ||
    state.flags?.villageUnlocked === true ||
    state.flags?.forestUnlocked === true ||
    state.flags?.bastionUnlocked === true ||
    state.story?.seen?.fireLit === true ||
    (typeof data.playTime === "number" && data.playTime > 0) ||
    (typeof state.playTime === "number" && state.playTime > 0);
  return {
    version: 1,
    gameStarted: hasProgress,
    cruelMode: state.cruelMode === true,
    musicMuted: state.musicMuted === true,
    sfxMuted: state.sfxMuted === true,
    musicVolume: clampVolume(state.musicVolume),
    sfxVolume: clampVolume(state.sfxVolume),
    devGameMode: DEV_GAME_MODES.has(state.devGameMode ?? "normal")
      ? (state.devGameMode ?? "normal")
      : "normal",
  };
}

export function writeStartupSaveHeader(data: SaveData): void {
  const json = JSON.stringify(createStartupSaveHeader(data));
  try {
    localStorage.setItem(getStartupSaveHeaderKey(), json);
  } catch {
    // IndexedDB / CrazyGames Data remain the fallbacks.
  }
  writeCrazyGamesHeaderJson(json);
}

export function clearStartupSaveHeader(): void {
  try {
    localStorage.removeItem(getStartupSaveHeaderKey());
  } catch {
    // Ignore private-mode or quota failures.
  }
}

/**
 * Read the small startup record without importing the Zustand store, game
 * rules, auth, or Supabase. Existing saves are decoded once and backfilled.
 */
function headerFromJson(raw: string | null): StartupSaveHeader | null {
  if (!raw) return null;
  try {
    const storedHeader = JSON.parse(raw);
    return isStartupSaveHeader(storedHeader) ? storedHeader : null;
  } catch {
    return null;
  }
}

async function readCrazyGamesStartupHeader(): Promise<StartupSaveHeader | null> {
  if (!shouldUseCrazyGamesPersist()) return null;
  const save = await readCrazyGamesSave();
  if (save) {
    const header = createStartupSaveHeader(save);
    writeStartupSaveHeader(save);
    return header;
  }
  const header = headerFromJson(readCrazyGamesHeaderJson());
  if (header) {
    try {
      localStorage.setItem(
        getStartupSaveHeaderKey(),
        JSON.stringify(header),
      );
    } catch {
      // Peek can still work later from Data on the next boot prepare.
    }
  }
  return header;
}

export async function readStartupSaveHeader(): Promise<StartupSaveHeader | null> {
  try {
    let rawSave: unknown;
    try {
      const db = await getGameSaveDatabase();
      rawSave = await db.get("saves", getSaveKey());
    } catch (error) {
      if (!shouldUseCrazyGamesPersist()) throw error;
      logger.warn(
        "[startup] IndexedDB unavailable, checking CrazyGames persist:",
        error,
      );
    }

    if (rawSave !== undefined && rawSave !== null) {
      try {
        const storedHeader = headerFromJson(
          localStorage.getItem(getStartupSaveHeaderKey()),
        );
        if (storedHeader) return storedHeader;
      } catch {
        // Fall through to the backward-compatible IndexedDB read.
      }

      const save = decodeLocalSave(rawSave);
      if (!save) throw new InvalidStartupSaveError();

      const header = createStartupSaveHeader(save);
      writeStartupSaveHeader(save);
      return header;
    }

    const crazyGamesHeader = await readCrazyGamesStartupHeader();
    if (crazyGamesHeader) return crazyGamesHeader;

    clearStartupSaveHeader();
    return null;
  } catch (error) {
    logger.warn("[startup] Failed to read save header:", error);
    throw error;
  }
}

export async function readStartupSaveHeaderResult(): Promise<StartupSaveHeaderResult> {
  try {
    const header = await readStartupSaveHeader();
    return header
      ? { status: "loaded", header }
      : { status: "not-found" };
  } catch (error) {
    return {
      status: "error",
      error,
      retryable: !(error instanceof InvalidStartupSaveError),
    };
  }
}
