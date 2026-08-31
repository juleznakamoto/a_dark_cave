import { getStartupSaveHeaderKey } from "./saveKeys";
import { parseStartupIntent, type StartupLocation } from "./startupIntent";

/** Session-only: title click asked to show the start screen despite a save. */
const PREFER_START_SCREEN_KEY = "adc-prefer-start-screen";

/**
 * Sync localStorage peek only. Does not open IndexedDB or import the store.
 * Used so `/` can lazy-load Game without downloading the start-screen chunk.
 */
export function peekStartupGameStarted(): boolean {
  try {
    const raw = localStorage.getItem(getStartupSaveHeaderKey());
    if (!raw) return false;
    const header = JSON.parse(raw) as {
      version?: unknown;
      gameStarted?: unknown;
    };
    return header.version === 1 && header.gameStarted === true;
  } catch {
    return false;
  }
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

/** True when this visit should load the Game chunk instead of the start screen. */
export function shouldBootGameSurface(
  location: StartupLocation = typeof window !== "undefined"
    ? window.location
    : { pathname: "/", search: "", hash: "" },
): boolean {
  if (parseStartupIntent(location).forceGame) return true;
  if (peekPreferStartScreen()) return false;
  return peekStartupGameStarted();
}
