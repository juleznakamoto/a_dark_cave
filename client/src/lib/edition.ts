/**
 * Game edition flag — single source of truth for distinguishing the public web
 * build from the Steam desktop build.
 *
 * The Steam build is produced with `VITE_STEAM_BUILD=1` (see `build:steam` in
 * package.json). The Steam **demo** adds `VITE_STEAM_DEMO=1` (`build:steam-demo` /
 * `electron:package:demo`). Everything Steam-specific (no online services, no real-money
 * shop, merchant-sold artifacts, local + Steam Cloud saves, Steam achievements)
 * keys off `isSteamBuild`; the demo cap keys off `isSteamDemoBuild` / `isDemoEdition()`.
 * Playtest uses `VITE_STEAM_PLAYTEST=1` for an isolated save namespace (full game, no cap).
 *
 * In DEV (non-Steam builds), Settings → Game Mode can simulate Steam Game / Playtest /
 * Demo via {@link setDevGameModeOverride}.
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

const GALAXY_PATH_PREFIX = "/galaxy";

/** Dev Settings → Game Mode values (web DEV only; ignored in Steam / prod builds). */
export type DevGameMode =
  | "normal"
  | "steamGame"
  | "steamPlaytest"
  | "steamDemo";

export const DEV_GAME_MODE_OPTIONS: readonly DevGameMode[] = [
  "normal",
  "steamGame",
  "steamPlaytest",
  "steamDemo",
] as const;

/** Galaxy.click demo hosted at https://a-dark-cave.com/galaxy */
export function isGalaxyEdition(): boolean {
  if (typeof window === "undefined") return false;
  const path = window.location.pathname;
  return path === GALAXY_PATH_PREFIX || path.startsWith(`${GALAXY_PATH_PREFIX}/`);
}

/** Web Galaxy demo or Steam desktop demo — capped at the wooden hut limit. */
export function isDemoEdition(): boolean {
  return (
    isGalaxyEdition() ||
    isSteamDemoRuntime() ||
    (import.meta.env.DEV &&
      !isSteamBuild &&
      devGameModeOverride === "steamDemo")
  );
}

/**
 * Steam demo build or DEV Game Mode = Steam Demo.
 * Used for Steam-demo-only UI (e.g. footer demo progress bar).
 */
export function isSteamDemoActive(): boolean {
  return (
    isSteamDemoRuntime() ||
    (import.meta.env.DEV &&
      !isSteamBuild &&
      devGameModeOverride === "steamDemo")
  );
}

/** Steam desktop or Galaxy web demo — no Supabase cloud saves or online services. */
export function isLocalOnlyEdition(): boolean {
  return isSteamBuild || isGalaxyEdition();
}

/** Editions where the full game is unlocked without the web shop paywall. */
export function isFullGameUnlockedEdition(): boolean {
  return isSteamBuild || isGalaxyEdition();
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
 * Runtime Steam edition check — compile-time Steam build or DEV Game Mode
 * (Steam Game / Playtest / Demo). Use for UI and shop-slot behavior; keep
 * `isSteamBuild` for build-time stubs, save backends, and Steam API bridges.
 */
export function isSteamEditionActive(): boolean {
  return (
    isSteamBuild ||
    isGalaxyEdition() ||
    (import.meta.env.DEV &&
      !isSteamBuild &&
      devGameModeOverride !== "normal")
  );
}
