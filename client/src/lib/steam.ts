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

/**
 * Open the full game store page in the Steam Overlay
 * (`ISteamFriends::ActivateGameOverlayToStore`). Returns false on web / failure.
 */
export async function steamActivateOverlayToStore(): Promise<boolean> {
  const b = bridge();
  if (!b?.available || !b.activateOverlayToStore) return false;
  try {
    return await b.activateOverlayToStore();
  } catch (error) {
    logger.warn("[STEAM] Failed to open store overlay", error);
    return false;
  }
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

/** Read the Demo Cloud file from the full-game shell. No-op on web / demo. */
export async function steamReadDemoSave(): Promise<string | null> {
  const b = bridge();
  if (!b?.available || !b.saveReadDemo) return null;
  try {
    return await b.saveReadDemo();
  } catch (error) {
    logger.warn("[STEAM] Failed to read demo save", error);
    return null;
  }
}

/** Delete this edition's Steam Cloud file. Used when discarding a leftover Demo blob. */
export async function steamClearSave(): Promise<void> {
  const b = bridge();
  if (!b?.available || !b.saveClear) return;
  try {
    await b.saveClear();
  } catch (error) {
    logger.warn("[STEAM] Failed to clear save", error);
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

/** Steam shell is about to quit; save then call {@link steamNotifyQuitSaveComplete}. */
export function steamOnWillQuit(callback: () => void): (() => void) | undefined {
  const b = bridge();
  if (!b?.available || !b.onWillQuit) return undefined;
  return b.onWillQuit(callback);
}

/** Tell the Steam shell the exit save finished (or was skipped). */
export function steamNotifyQuitSaveComplete(): void {
  const b = bridge();
  if (!b?.available || !b.notifyQuitSaveComplete) return;
  try {
    b.notifyQuitSaveComplete();
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
