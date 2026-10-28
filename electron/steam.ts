/**
 * Steamworks integration for the Electron main process.
 *
 * Wraps `steamworks.js` in a defensive layer so the desktop app still launches
 * when Steam is not running or the native module fails to load (e.g. local dev
 * without the Steam client). All methods degrade gracefully to no-ops.
 *
 * Overlay timing (critical): `enableSteamOverlay()` must run at module load,
 * before `app.whenReady()`. It appends `in-process-gpu`, which Electron ignores
 * after ready. That is the usual cause of Shift+Tab doing nothing. Call
 * `initSteam` before `whenReady` as well so SteamAPI_Init hooks before the GPU
 * starts.
 *
 * Do not append `disable-direct-composition`. steamworks.js adds it from
 * `electronEnableSteamOverlay()`, and on Windows 11 it leaves phantom Alt+Tab
 * entries after the player tabs away. This file applies the rest of that
 * helper itself and never calls it.
 */
import { steamReviewPageUrl } from "../shared/steamReview";
import { isSteamDemoBuild } from "./paths";

type SteamworksModule = {
  init: (appId?: number) => SteamClient;
};

type SteamClient = {
  achievement: {
    activate: (name: string) => boolean;
    isActivated: (name: string) => boolean;
  };
  localplayer: {
    getName: () => string;
  };
  overlay?: {
    /** ISteamFriends::ActivateGameOverlayToStore — StoreFlag.None = 0. */
    activateToStore: (appId: number, flag: number) => void;
    /** ISteamFriends::ActivateGameOverlayToWebPage. */
    activateToWebPage: (url: string) => void;
  };
};

/** Full game App ID. Demo packages use a different steam_appid.txt. */
export const FULL_GAME_STEAM_APP_ID = 4882240;

let client: SteamClient | null = null;
let initialized = false;
let overlayEnabled = false;

function loadSteamworks(): SteamworksModule | null {
  try {
    // Lazy require: native module, only present in the Steam build.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require("steamworks.js") as SteamworksModule;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn("[STEAM] steamworks.js not available:", error);
    return null;
  }
}

/**
 * Chromium switches the overlay needs before `app.whenReady()`.
 * `disable-direct-composition` is intentionally absent.
 */
export const STEAM_OVERLAY_CHROMIUM_SWITCHES = ["in-process-gpu"] as const;

/** Same cadence steamworks.js uses so the overlay can composite. */
export const STEAM_OVERLAY_REPAINT_MS = 1000 / 60;

type OverlayBrowserWindow = {
  isDestroyed: () => boolean;
  webContents: {
    isPainting: () => boolean;
    invalidate: () => void;
  };
};

type SteamOverlayElectron = {
  app: {
    commandLine: { appendSwitch: (switchName: string) => void };
    on: (
      event: "browser-window-created",
      listener: (event: unknown, window: OverlayBrowserWindow) => void,
    ) => void;
  };
  BrowserWindow: {
    getAllWindows: () => OverlayBrowserWindow[];
  };
};

const overlayRepaintTimers = new WeakMap<
  OverlayBrowserWindow,
  ReturnType<typeof setInterval>
>();

/**
 * One overlay repaint tick. Returns true when the interval should stop
 * (the window is gone).
 */
export function tickSteamOverlayRepaint(window: OverlayBrowserWindow): boolean {
  if (window.isDestroyed()) return true;
  // Same check steamworks.js uses, so overlay drawing stays on the path
  // that already ships. Only the Chromium ghost flag was removed.
  if (!window.webContents.isPainting()) {
    window.webContents.invalidate();
  }
  return false;
}

function attachSteamOverlayRepaint(browserWindow: OverlayBrowserWindow): void {
  if (overlayRepaintTimers.has(browserWindow)) return;

  let warned = false;
  const timer = setInterval(() => {
    let stop = false;
    try {
      stop = tickSteamOverlayRepaint(browserWindow);
    } catch (error) {
      try {
        stop = browserWindow.isDestroyed();
      } catch {
        stop = true;
      }
      if (!stop && !warned) {
        warned = true;
        // eslint-disable-next-line no-console
        console.warn("[STEAM] overlay repaint failed:", error);
      }
    }
    if (!stop) return;
    clearInterval(timer);
    overlayRepaintTimers.delete(browserWindow);
  }, STEAM_OVERLAY_REPAINT_MS);

  overlayRepaintTimers.set(browserWindow, timer);
}

/** Append overlay switches and the repaint hook. Does not touch Steamworks. */
export function applySteamOverlayHooks(electron: SteamOverlayElectron): void {
  for (const switchName of STEAM_OVERLAY_CHROMIUM_SWITCHES) {
    electron.app.commandLine.appendSwitch(switchName);
  }

  electron.BrowserWindow.getAllWindows().forEach(attachSteamOverlayRepaint);
  electron.app.on("browser-window-created", (_event, browserWindow) => {
    attachSteamOverlayRepaint(browserWindow);
  });
}

/**
 * Enable Steam Overlay hooks for Electron. Must run before `app.whenReady()`.
 * Safe to call once; failures are swallowed.
 *
 * Does not call `steamworks.electronEnableSteamOverlay()`. That helper always
 * appends `disable-direct-composition`.
 */
export function enableSteamOverlay(): void {
  if (overlayEnabled) return;
  overlayEnabled = true;
  try {
    const steamworks = loadSteamworks();
    if (!steamworks) return;
    // Lazy require: only the Electron main process has this module.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const electron = require("electron") as SteamOverlayElectron;
    applySteamOverlayHooks(electron);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn("[STEAM] Steam overlay hooks failed:", error);
  }
}

/**
 * Initialize Steamworks with the given App ID. Returns true on success. Call
 * before `app.whenReady()` so the overlay can hook the graphics device.
 * Failures are swallowed so the game still runs.
 */
export function initSteam(appId: number): boolean {
  if (initialized) return client !== null;
  initialized = true;
  try {
    const steamworks = loadSteamworks();
    if (!steamworks) {
      client = null;
      return false;
    }
    client = steamworks.init(appId);
    return true;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn("[STEAM] Steamworks init failed (continuing without Steam):", error);
    client = null;
    return false;
  }
}

export function isSteamReady(): boolean {
  return client !== null;
}

export function getPlayerName(): string | null {
  try {
    return client?.localplayer.getName() ?? null;
  } catch {
    return null;
  }
}

/**
 * Open the full game's Steam store page in the overlay
 * (`ISteamFriends::ActivateGameOverlayToStore`). Always targets the parent
 * app, never the demo App ID. Returns true if Steam accepted the call.
 */
export function activateOverlayToStore(
  appId: number = FULL_GAME_STEAM_APP_ID,
): boolean {
  try {
    if (!client?.overlay?.activateToStore) return false;
    client.overlay.activateToStore(appId, 0);
    return true;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn("[STEAM] activateOverlayToStore failed:", error);
    return false;
  }
}

/**
 * Open the Steam "Write a review" form in the overlay. Only known app ids
 * (full game and demo) are accepted. Returns true if Steam accepted the call.
 */
export function activateOverlayToReview(appId: number): boolean {
  const url = steamReviewPageUrl(appId);
  if (!url) return false;
  try {
    if (!client?.overlay?.activateToWebPage) return false;
    client.overlay.activateToWebPage(url);
    return true;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn("[STEAM] activateOverlayToReview failed:", error);
    return false;
  }
}

/** Demo Steamworks only defines basic ACH_* names (see steamAchievements.ts). */
const STEAM_DEMO_ACHIEVEMENT_PREFIX = "ACH_BASIC_";

/** Activate an achievement by API name. Returns true if the call succeeded. */
export function activateAchievement(apiName: string): boolean {
  if (isSteamDemoBuild && !apiName.startsWith(STEAM_DEMO_ACHIEVEMENT_PREFIX)) {
    return false;
  }
  try {
    if (!client) return false;
    if (client.achievement.isActivated(apiName)) return true;
    return client.achievement.activate(apiName);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn("[STEAM] activateAchievement failed:", apiName, error);
    return false;
  }
}
