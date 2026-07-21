/**
 * Steamworks integration for the Electron main process.
 *
 * Wraps `steamworks.js` in a defensive layer so the desktop app still launches
 * when Steam is not running or the native module fails to load (e.g. local dev
 * without the Steam client). All methods degrade gracefully to no-ops.
 *
 * Overlay timing (critical): `enableSteamOverlay()` must run at module load,
 * before `app.whenReady()`. It appends `in-process-gpu` /
 * `disable-direct-composition` — those switches are ignored after Electron is
 * ready, which is the usual cause of Shift+Tab doing nothing. Call `initSteam`
 * before `whenReady` as well so SteamAPI_Init hooks before the GPU starts.
 */

type SteamworksModule = {
  init: (appId?: number) => SteamClient;
  electronEnableSteamOverlay: (disableEachFrameInvalidation?: boolean) => void;
};

type SteamClient = {
  achievement: {
    activate: (name: string) => boolean;
    isActivated: (name: string) => boolean;
  };
  localplayer: {
    getName: () => string;
  };
};

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
 * Enable Steam Overlay hooks for Electron. Must run before `app.whenReady()`.
 * Safe to call once; failures are swallowed.
 */
export function enableSteamOverlay(): void {
  if (overlayEnabled) return;
  overlayEnabled = true;
  try {
    const steamworks = loadSteamworks();
    steamworks?.electronEnableSteamOverlay();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn("[STEAM] electronEnableSteamOverlay failed:", error);
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

/** Activate an achievement by API name. Returns true if the call succeeded. */
export function activateAchievement(apiName: string): boolean {
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
