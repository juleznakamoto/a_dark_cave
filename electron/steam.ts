/**
 * Steamworks integration for the Electron main process.
 *
 * Wraps `steamworks.js` in a defensive layer so the desktop app still launches
 * when Steam is not running or the native module fails to load (e.g. local dev
 * without the Steam client). All methods degrade gracefully to no-ops.
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

/**
 * Initialize Steamworks with the given App ID. Returns true on success. Safe to
 * call once at app startup; failures are swallowed so the game still runs.
 */
export function initSteam(appId: number): boolean {
  if (initialized) return client !== null;
  initialized = true;
  try {
    // Lazy require: native module, only present in the Steam build.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const steamworks = require("steamworks.js") as SteamworksModule;
    client = steamworks.init(appId);
    steamworks.electronEnableSteamOverlay();
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
