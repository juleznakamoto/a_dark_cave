/**
 * Game edition flag — single source of truth for distinguishing the public web
 * build from the Steam desktop build.
 *
 * The Steam build is produced with `VITE_STEAM_BUILD=1` (see `build:steam` in
 * package.json). The Steam **demo** adds `VITE_STEAM_DEMO=1` (`build:steam-demo` /
 * `electron:package:demo`). Everything Steam-specific (no online services, no real-money
 * shop, merchant-sold artifacts, local + Steam Cloud saves, Steam achievements)
 * keys off `isSteamBuild`; the demo cap keys off `isSteamDemoBuild` / `isDemoEdition()`.
 */
export const isSteamBuild = import.meta.env.VITE_STEAM_BUILD === "1";

/** Steam desktop demo build (`VITE_STEAM_DEMO=1` with `VITE_STEAM_BUILD=1`). */
export const isSteamDemoBuild = import.meta.env.VITE_STEAM_DEMO === "1";

/** Full Steam desktop build (not the capped demo). */
export const isSteamFullBuild = isSteamBuild && !isSteamDemoBuild;

/** Convenience inverse for readability at web-only call sites. */
export const isWebBuild = !isSteamBuild;

const GALAXY_PATH_PREFIX = "/galaxy";

/** Galaxy.click demo hosted at https://a-dark-cave.com/galaxy */
export function isGalaxyEdition(): boolean {
  if (typeof window === "undefined") return false;
  const path = window.location.pathname;
  return path === GALAXY_PATH_PREFIX || path.startsWith(`${GALAXY_PATH_PREFIX}/`);
}

/** Web Galaxy demo or Steam desktop demo — capped at the stone hut limit. */
export function isDemoEdition(): boolean {
  return isGalaxyEdition() || isSteamDemoBuild;
}

/** Steam desktop or Galaxy web demo — no Supabase cloud saves or online services. */
export function isLocalOnlyEdition(): boolean {
  return isSteamBuild || isGalaxyEdition();
}

/** Editions where the full game is unlocked without the web shop paywall. */
export function isFullGameUnlockedEdition(): boolean {
  return isSteamBuild || isGalaxyEdition();
}

/** Dev-only override synced from `devSteamMode` in the game store. */
let devSteamModeOverride = false;

/** Called by the store when the dev settings toggle changes. No-op in production. */
export function setDevSteamModeOverride(enabled: boolean): void {
  if (import.meta.env.DEV) {
    devSteamModeOverride = enabled;
  }
}

/**
 * Runtime Steam edition check — compile-time Steam build or dev Steam Mode UI
 * toggle. Use for UI and shop-slot behavior; keep `isSteamBuild` for build-time
 * stubs, save backends, and Steam API bridges.
 */
export function isSteamEditionActive(): boolean {
  return (
    isSteamBuild ||
    isGalaxyEdition() ||
    (import.meta.env.DEV && devSteamModeOverride)
  );
}
