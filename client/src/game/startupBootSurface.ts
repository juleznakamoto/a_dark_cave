import {
  isCrazyGamesEdition,
  isGalaxyEdition,
  isSteamBuild,
  type DevGameMode,
} from "@/lib/edition";
import { getStartupSaveHeaderKey } from "./saveKeys";
import { parseStartupIntent, type StartupLocation } from "./startupIntent";

/** Session-only: title click asked to show the start screen despite a save. */
const PREFER_START_SCREEN_KEY = "adc-prefer-start-screen";
/** Session-only: in-game update / inactivity reload should resume Game. */
const RESUME_GAME_KEY = "adc-resume-game";

const DEV_GAME_MODES = new Set<DevGameMode>([
  "normal",
  "steamGame",
  "steamPlaytest",
  "steamDemo",
  "demoEnd",
  "crazyGamesDemo",
]);

export interface StartupBootHeader {
  gameStarted: boolean;
  cruelMode: boolean;
  musicMuted: boolean;
  sfxMuted: boolean;
  musicVolume: number;
  sfxVolume: number;
  devGameMode: DevGameMode;
}

function clampVolume(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.min(1, value))
    : 1;
}

function asDevGameMode(value: unknown): DevGameMode {
  return typeof value === "string" && DEV_GAME_MODES.has(value as DevGameMode)
    ? (value as DevGameMode)
    : "normal";
}

/**
 * Sync localStorage peek only. Does not open IndexedDB or import the store.
 * Used so `/` can paint the start screen (or skip to Game) without waiting.
 */
export function peekStartupSaveHeader(): StartupBootHeader | null {
  try {
    const raw = localStorage.getItem(getStartupSaveHeaderKey());
    if (!raw) return null;
    const header = JSON.parse(raw) as {
      version?: unknown;
      gameStarted?: unknown;
      cruelMode?: unknown;
      musicMuted?: unknown;
      sfxMuted?: unknown;
      musicVolume?: unknown;
      sfxVolume?: unknown;
      devGameMode?: unknown;
    };
    if (header.version !== 1) return null;
    return {
      gameStarted: header.gameStarted === true,
      cruelMode: header.cruelMode === true,
      musicMuted: header.musicMuted === true,
      sfxMuted: header.sfxMuted === true,
      musicVolume: clampVolume(header.musicVolume),
      sfxVolume: clampVolume(header.sfxVolume),
      devGameMode: asDevGameMode(header.devGameMode),
    };
  } catch {
    return null;
  }
}

export function peekStartupGameStarted(): boolean {
  return peekStartupSaveHeader()?.gameStarted === true;
}

/** Steam / Galaxy / CrazyGames keep the old skip-to-Game resume. */
export function isOfflinePortalBootEdition(): boolean {
  return isSteamBuild || isGalaxyEdition() || isCrazyGamesEdition();
}

export function peekPreferStartScreen(): boolean {
  try {
    return sessionStorage.getItem(PREFER_START_SCREEN_KEY) === "1";
  } catch {
    return false;
  }
}

export function setPreferStartScreen(): void {
  try {
    sessionStorage.setItem(PREFER_START_SCREEN_KEY, "1");
  } catch {
    // Private mode: `/` may still skip to Game after reload.
  }
}

export function clearPreferStartScreen(): void {
  try {
    sessionStorage.removeItem(PREFER_START_SCREEN_KEY);
  } catch {
    // ignore
  }
}

export function peekResumeGame(): boolean {
  try {
    return sessionStorage.getItem(RESUME_GAME_KEY) === "1";
  } catch {
    return false;
  }
}

/** Call immediately before a reload that should skip Make Fire. */
export function setResumeGame(): void {
  try {
    sessionStorage.setItem(RESUME_GAME_KEY, "1");
  } catch {
    // Private mode: reload may land on the start screen.
  }
}

export function clearResumeGame(): void {
  try {
    sessionStorage.removeItem(RESUME_GAME_KEY);
  } catch {
    // ignore
  }
}

/**
 * True when this visit should load the Game chunk instead of the start screen.
 * Web revisits stay on Make Fire. Steam / Galaxy / CrazyGames still resume a
 * started save. forceGame and an explicit in-game resume skip the title.
 */
export function shouldBootGameSurface(
  location: StartupLocation = typeof window !== "undefined"
    ? window.location
    : { pathname: "/", search: "", hash: "" },
): boolean {
  if (parseStartupIntent(location).forceGame) return true;
  if (peekPreferStartScreen()) return false;
  if (!peekStartupGameStarted()) return false;
  if (peekResumeGame()) return true;
  return isOfflinePortalBootEdition();
}
