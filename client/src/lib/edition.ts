/**
 * Game edition flag — single source of truth for distinguishing the public web
 * build from Steam desktop and portal demo builds.
 *
 * The Steam build is produced with `VITE_STEAM_BUILD=1` (see `build:steam` in
 * package.json). The Steam **demo** adds `VITE_STEAM_DEMO=1` (`build:steam-demo` /
 * `electron:package:demo`). Everything Steam-specific (no online services, no real-money
 * shop, merchant-sold artifacts, local + Steam Cloud saves)
 * keys off `isSteamBuild`; the demo cap keys off `isSteamDemoBuild` / `isDemoEdition()`.
 * Steam partner achievements are full/playtest only ({@link shouldSyncSteamAchievements}).
 * Playtest uses `VITE_STEAM_PLAYTEST=1` for an isolated save namespace (full game, no cap).
 * CrazyGames uses `VITE_CRAZYGAMES=1` (`build:crazygames`) or the `/crazygames` path.
 *
 * In DEV (non-Steam builds), Settings → Game Mode can simulate Steam Game / Playtest /
 * Demo / Demo End / CrazyGames Demo via {@link setDevGameModeOverride}.
 */
import { tryGetBoundGameStore } from "@/game/gameStoreHolder";

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

/**
 * Steam partner achievements live on the full and playtest apps, not the demo.
 * Demo progress is stored in the shared save; the full game backfills unlocks
 * on load (and during play) from that save.
 */
export function shouldSyncSteamAchievements(): boolean {
  return isSteamBuild && !isSteamDemoRuntime();
}

/** Convenience inverse for readability at web-only call sites. */
export const isWebBuild = !isSteamBuild;

/** CrazyGames HTML5 demo folder (`build:crazygames`). */
export const isCrazyGamesBuild = import.meta.env.VITE_CRAZYGAMES === "1";

const GALAXY_PATH_PREFIX = "/galaxy";
const CRAZYGAMES_PATH_PREFIX = "/crazygames";

/** Dev Settings → Game Mode values (web DEV only; ignored in Steam / prod builds). */
export type DevGameMode =
  | "normal"
  | "steamGame"
  | "steamPlaytest"
  | "steamDemo"
  | "demoEnd"
  | "crazyGamesDemo";

export const DEV_GAME_MODE_OPTIONS: readonly DevGameMode[] = [
  "normal",
  "steamGame",
  "steamPlaytest",
  "steamDemo",
  "demoEnd",
  "crazyGamesDemo",
] as const;

function isPathPrefix(prefix: string): boolean {
  if (typeof window === "undefined") return false;
  const path = window.location?.pathname ?? "";
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
 * CrazyGames demo: dedicated folder (`VITE_CRAZYGAMES=1`) or `/crazygames` on the
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
    isDevGameMode("demoEnd") ||
    isDevGameMode("crazyGamesDemo")
  );
}

/**
 * Steam-demo chrome (footer progress bar, no donate). CrazyGames uses the same
 * chrome but keeps the Steam store footer link. Galaxy keeps Steam + donate.
 */
export function isSteamDemoActive(): boolean {
  return (
    isSteamDemoRuntime() ||
    isCrazyGamesEdition() ||
    isDevGameMode("steamDemo") ||
    isDevGameMode("demoEnd") ||
    isDevGameMode("crazyGamesDemo")
  );
}

/** DEV Settings → Demo End, or a capped demo that has reached the hut limit. */
export function isDemoEndDevMode(): boolean {
  return isDevGameMode("demoEnd");
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
 * Hide the Steam store / wishlist footer link. Steam desktop (and DEV Steam
 * Game / Playtest / Demo) already are on Steam. Web, Galaxy, and CrazyGames
 * keep the link. Store-free so the lightweight start screen can use it.
 */
export function shouldHideSteamStoreLink(
  devGameMode: DevGameMode = "normal",
): boolean {
  if (isSteamBuild) return true;
  if (import.meta.env.DEV && !isSteamBuild) {
    return (
      devGameMode === "steamGame" ||
      devGameMode === "steamPlaytest" ||
      devGameMode === "steamDemo" ||
      devGameMode === "demoEnd"
    );
  }
  return false;
}

function isKnownDevGameMode(value: unknown): value is DevGameMode {
  return (
    typeof value === "string" &&
    (DEV_GAME_MODE_OPTIONS as readonly string[]).includes(value)
  );
}

/** Live Settings → Game Mode when the store is bound; else the module override. */
function resolveDevGameMode(explicit?: DevGameMode): DevGameMode {
  if (explicit) return explicit;
  if (import.meta.env.DEV && !isSteamBuild) {
    const mode = tryGetBoundGameStore()?.getState()?.devGameMode;
    if (isKnownDevGameMode(mode)) return mode;
  }
  return import.meta.env.DEV ? devGameModeOverride : "normal";
}

/**
 * Runtime Steam-like edition check — compile-time Steam / CrazyGames / Galaxy,
 * or DEV Game Mode (Steam Game / Playtest / Demo / CrazyGames Demo). Use for UI
 * and shop-slot behavior; keep `isSteamBuild` for build-time stubs, save
 * backends, and Steam API bridges.
 *
 * Pass store `devGameMode` when you have it so Settings → Game Mode stays the
 * source of truth (the module override can reset on HMR).
 */
export function isSteamEditionActive(devGameMode?: DevGameMode): boolean {
  return (
    isSteamBuild ||
    isGalaxyEdition() ||
    isCrazyGamesEdition() ||
    (import.meta.env.DEV &&
      !isSteamBuild &&
      resolveDevGameMode(devGameMode) !== "normal")
  );
}
