/**
 * Thin, safe wrapper around the Electron preload `window.steamBridge`.
 *
 * On the web build (or any context where the bridge is missing) every method is
 * a no-op so the same React code runs unchanged in both editions. All Steam IPC
 * calls funnel through here — UI/game code never touches `window.steamBridge`
 * directly.
 */
import { isSteamBuild } from "@/lib/edition";
import { logger } from "@/lib/logger";

function bridge(): SteamBridge | undefined {
  if (typeof window === "undefined") return undefined;
  return window.steamBridge;
}

/** True when running inside the Steam desktop shell with a live bridge. */
export function hasSteamBridge(): boolean {
  return isSteamBuild && !!bridge()?.available;
}

/** Unlock (activate) a Steam achievement by its configured API name. Safe no-op on web. */
export async function steamUnlockAchievement(apiName: string): Promise<void> {
  const b = bridge();
  if (!b?.available) return;
  try {
    await b.unlockAchievement(apiName);
  } catch (error) {
    logger.warn("[STEAM] Failed to unlock achievement", apiName, error);
  }
}

/** Read the raw encoded save blob from the Steam shell's flat save file. */
export async function steamReadSave(): Promise<string | null> {
  const b = bridge();
  if (!b?.available) return null;
  try {
    return await b.saveRead();
  } catch (error) {
    logger.warn("[STEAM] Failed to read save", error);
    return null;
  }
}

/** Write the raw encoded save blob to the Steam shell's flat save file (synced via Steam Cloud). */
export async function steamWriteSave(payload: string): Promise<void> {
  const b = bridge();
  if (!b?.available) return;
  try {
    await b.saveWrite(payload);
  } catch (error) {
    logger.warn("[STEAM] Failed to write save", error);
  }
}

/** Steam display name of the local player, or null on web / when unavailable. */
export async function steamPlayerName(): Promise<string | null> {
  const b = bridge();
  if (!b?.available) return null;
  try {
    return await b.getPlayerName();
  } catch {
    return null;
  }
}

/** Request the desktop shell to quit the app. No-op on web. */
export async function steamQuit(): Promise<void> {
  const b = bridge();
  if (!b?.available) return;
  try {
    await b.quit();
  } catch {
    /* ignore */
  }
}

/** Whether the Steam desktop window is in full-screen mode. */
export async function steamIsFullscreen(): Promise<boolean> {
  const b = bridge();
  if (!b?.available) return false;
  try {
    return await b.isFullscreen();
  } catch {
    return false;
  }
}

/** Toggle full-screen mode in the Steam desktop shell. Returns the new state. */
export async function steamToggleFullscreen(): Promise<boolean> {
  const b = bridge();
  if (!b?.available) return false;
  try {
    return await b.toggleFullscreen();
  } catch {
    return false;
  }
}

/** Subscribe to full-screen changes in the Steam desktop shell. */
export function steamOnFullscreenChanged(
  callback: (isFullscreen: boolean) => void,
): (() => void) | undefined {
  const b = bridge();
  if (!b?.available || !b.onFullscreenChanged) return undefined;
  return b.onFullscreenChanged(callback);
}

/** Subscribe to layout changes in the Steam desktop shell (full screen, maximize, etc.). */
export function steamOnLayoutChanged(
  callback: () => void,
): (() => void) | undefined {
  const b = bridge();
  if (!b?.available || !b.onLayoutChanged) return undefined;
  return b.onLayoutChanged(callback);
}
