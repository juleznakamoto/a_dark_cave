import { getStartupSaveHeaderKey } from "./saveKeys";
import { parseStartupIntent, type StartupLocation } from "./startupIntent";

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

/** True when this visit should load the Game chunk instead of the start screen. */
export function shouldBootGameSurface(
  location: StartupLocation = typeof window !== "undefined"
    ? window.location
    : { pathname: "/", search: "", hash: "" },
): boolean {
  return parseStartupIntent(location).forceGame || peekStartupGameStarted();
}
