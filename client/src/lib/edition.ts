/**
 * Game edition flag — single source of truth for distinguishing the public web
 * build from Steam desktop and portal demo builds.
 *
 * The Steam build is produced with `VITE_STEAM_BUILD=1` (see `build:steam` in
 * package.json). The Steam **demo** adds `VITE_STEAM_DEMO=1` (`build:steam-demo` /
 * `electron:package:demo`). Everything Steam-specific (no online services, no real-money
 * shop, merchant-sold artifacts, local + Steam Cloud saves, Steam achievements)
 * keys off `isSteamBuild`; the demo cap keys off `isSteamDemoBuild` / `isDemoEdition()`.
 * Playtest uses `VITE_STEAM_PLAYTEST=1` for an isolated save namespace (full game, no cap).
 * CrazyGames uses `VITE_CRAZYGAMES=1` (`build:crazygames`) or the `/crazygames` path.
 *
 * In DEV (non-Steam builds), Settings → Game Mode can simulate Steam Game / Playtest /
 * Demo / CrazyGames Demo via {@link setDevGameModeOverride}.
 */
export const isSteamBuild = import.meta.env.VITE_STEAM_BUILD === "1";

/** Steam desktop demo build (`VITE_STEAM_DEMO=1` with `VITE_STEAM_BUILD=1`). */
export const isSteamDemoBuild = import.meta.env.VITE_STEAM_DEMO === "1";

/**
 * Runtime Steam-demo check for the renderer: Vite demo flag, or the Electron
 * shell's baked `isDemoBuild` (covers a client bundle that missed VITE_STEAM_DEMO).
 * Prefer this over {@link isSteamDemoBuild} in UI that must show in packaged demos.
 */
export function isSteamDemoRuntime(): boolean {
  if (isSteamDemoBuild) return true;
  if (typeof window === "undefined") return false;
  return window.steamBridge?.available === true && window.steamBridge.isDemoBuild === true;
}

/** Steam desktop playtest build (`VITE_STEAM_PLAYTEST=1` with `VITE_STEAM_BUILD=1`). */
export const isSteamPlaytestBuild = import.meta.env.VITE_STEAM_PLAYTEST === "1";

/** Full Steam desktop build (release app — not demo or playtest). */
export const isSteamFullBuild =
  isSteamBuild && !isSteamDemoBuild && !isSteamPlaytestBuild;

/** Convenience inverse for readability at web-only call sites. */
export const isWebBuild = !isSteamBuild;

/** CrazyGames HTML5 demo zip (`build:crazygames`). */
export const isCrazyGamesBuild = import.meta.env.VITE_CRAZYGAMES === "1";

const GALAXY_PATH_PREFIX = "/galaxy";
const CRAZYGAMES_PATH_PREFIX = "/crazygames";

/** Dev Settings → Game Mode values (web DEV only; ignored in Steam / prod builds). */
export type DevGameMode =
  | "normal"
  | "steamGame"
  | "steamPlaytest"
  | "steamDemo"
  | "crazyGamesDemo";

export const DEV_GAME_MODE_OPTIONS: readonly DevGameMode[] = [
  "normal",
  "steamGame",
  "steamPlaytest",
  "steamDemo",
  "crazyGamesDemo",
] as const;

function isPathPrefix(prefix: string): boolean {
  if (typeof window === "undefined") return false;
  const path = window.location.pathname;
  return path === prefix || path.startsWith(`${prefix}/`);
}

function isDevGameMode(mode: DevGameMode): boolean {
  return import.meta.env.DEV && !isSteamBuild && devGameModeOverride === mode;
}

/** Galaxy.click demo hosted at https://a-dark-cave.com/galaxy */
export function isGalaxyEdition(): boolean {
  return isPathPrefix(GALAXY_PATH_PREFIX);
}

/**
 * CrazyGames demo: dedicated zip (`VITE_CRAZYGAMES=1`) or `/crazygames` on the
 * main site. DEV Game Mode is handled separately (same pattern as Steam Demo).
 */
export function isCrazyGamesEdition(): boolean {
  return isCrazyGamesBuild || isPathPrefix(CRAZYGAMES_PATH_PREFIX);
}

/** Web Galaxy / CrazyGames demo or Steam desktop demo — capped at the wooden hut limit. */
export function isDemoEdition(): boolean {
  return (
    isGalaxyEdition() ||
    isCrazyGamesEdition() ||
    isSteamDemoRuntime() ||
    isDevGameMode("steamDemo") ||
    isDevGameMode("crazyGamesDemo")
  );
}

/**
 * Steam-demo chrome (footer progress bar, no donate). CrazyGames uses the same
 * chrome. Galaxy does not (it keeps the Steam wishlist + donate).
 */
export function isSteamDemoActive(): boolean {
  return (
    isSteamDemoRuntime() ||
    isCrazyGamesEdition() ||
    isDevGameMode("steamDemo") ||
    isDevGameMode("crazyGamesDemo")
  );
}

/** Steam desktop, Galaxy, or CrazyGames — no Supabase cloud saves or online services. */
export function isLocalOnlyEdition(): boolean {
  return isSteamBuild || isGalaxyEdition() || isCrazyGamesEdition();
}

/** Steam desktop, Galaxy, or CrazyGames — buy-once editions (BTP economy; no web MTX paywall). */
export function isFullGameUnlockedEdition(): boolean {
  return isSteamBuild || isGalaxyEdition() || isCrazyGamesEdition();
}

/** Dev-only Game Mode override synced from the game store Settings dropdown. */
let devGameModeOverride: DevGameMode = "normal";

/** Called by the store when Settings → Game Mode changes. No-op in production. */
export function setDevGameModeOverride(mode: DevGameMode): void {
  if (import.meta.env.DEV) {
    devGameModeOverride = mode;
  }
}

/**
 * Legacy boolean Steam Mode toggle → maps to Steam Game / Normal.
 * Prefer {@link setDevGameModeOverride}.
 */
export function setDevSteamModeOverride(enabled: boolean): void {
  setDevGameModeOverride(enabled ? "steamGame" : "normal");
}

export function getDevGameModeOverride(): DevGameMode {
  return import.meta.env.DEV ? devGameModeOverride : "normal";
}

/**
 * Runtime Steam-like edition check — compile-time Steam / CrazyGames / Galaxy,
 * or DEV Game Mode (Steam Game / Playtest / Demo / CrazyGames Demo). Use for UI
 * and shop-slot behavior; keep `isSteamBuild` for build-time stubs, save
 * backends, and Steam API bridges.
 */
export function isSteamEditionActive(): boolean {
  return (
    isSteamBuild ||
    isGalaxyEdition() ||
    isCrazyGamesEdition() ||
    (import.meta.env.DEV &&
      !isSteamBuild &&
      devGameModeOverride !== "normal")
  );
}
