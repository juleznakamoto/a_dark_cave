/**
 * Game edition flag — single source of truth for distinguishing the public web
 * build from Steam desktop and portal demo builds.
 *
 * The Steam build is produced with `VITE_STEAM_BUILD=1` (see `build:steam` in
 * package.json). The Steam **demo** adds `VITE_STEAM_DEMO=1` (`build:steam-demo` /
 * `electron:package:demo`). Everything Steam-specific (no online services, no real-money
 * shop, merchant-sold artifacts, local + Steam Cloud saves)
 * keys off `isSteamBuild`; the demo cap keys off `isSteamDemoBuild` / `isDemoEdition()`.
 * The iOS App Store build is `VITE_IOS_BUILD=1` (`build:ios`): the same buy-once,
 * local-only game as Steam full, without Steamworks.
 * Steam partner achievements sync on full and demo
 * ({@link shouldSyncSteamAchievements}); the demo only pushes basic IDs.
 * CrazyGames uses `VITE_CRAZYGAMES=1` (`build:crazygames`) or the `/crazygames`
 * path. It is the full game (no hut cap). itch.io uses `VITE_ITCH=1`
 * (`package:itch`) or the `/itch` preview path and stays a demo.
 *
 * In DEV (non-Steam builds), Settings → Game Mode can simulate Steam Game /
 * Demo / Demo End / Steam End (Cruel On/Off) / CrazyGames / iOS via
 * {@link setDevGameModeOverride}. iOS is the buy-once app without Steam
 * desktop chrome (no wishlist, no Steam review, no Quit).
 */
import { tryGetBoundGameStore } from "@/game/gameStoreHolder";

export const isSteamBuild = import.meta.env.VITE_STEAM_BUILD === "1";

/** iOS App Store build (`VITE_IOS_BUILD=1`). Buy-once, local save, no login. */
export const isIosBuild = import.meta.env.VITE_IOS_BUILD === "1";

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

/** Full Steam desktop build (release app, not the demo). */
export const isSteamFullBuild = isSteamBuild && !isSteamDemoBuild;

/**
 * Steamworks unlocks on every Steam desktop build, including the demo.
 * The demo only defines basic ACH_* names; steamAchievements.ts filters to
 * those IDs. Loading a demo save in the full game backfills the same
 * progress onto the full-game achievement set.
 */
export function shouldSyncSteamAchievements(): boolean {
  return isSteamBuild;
}

/** Convenience inverse for readability at web-only call sites. */
export const isWebBuild = !isSteamBuild && !isIosBuild;

/** CrazyGames HTML5 folder (`build:crazygames`). Full game, local save. */
export const isCrazyGamesBuild = import.meta.env.VITE_CRAZYGAMES === "1";

/** itch.io HTML5 demo folder (`package:itch`). */
export const isItchBuild = import.meta.env.VITE_ITCH === "1";

/**
 * Portal folders are hosted in a subdirectory (CrazyGames, itch.zone), so
 * in-app routes live in the URL hash and assets use a relative base.
 */
export function isHashRoutedPortalBuild(): boolean {
  return isCrazyGamesBuild || isItchBuild;
}

const GALAXY_PATH_PREFIX = "/galaxy";
const CRAZYGAMES_PATH_PREFIX = "/crazygames";
const ITCH_PATH_PREFIX = "/itch";

/** Settings → Game Mode (web DEV) or a live account Steam Game simulation. */
export type DevGameMode =
  | "normal"
  | "steamGame"
  | "steamDemo"
  | "demoEnd"
  | "steamEndCruelOn"
  | "steamEndCruelOff"
  | "crazyGamesDemo"
  | "ios";

export const DEV_GAME_MODE_OPTIONS: readonly DevGameMode[] = [
  "normal",
  "steamGame",
  "steamDemo",
  "demoEnd",
  "steamEndCruelOn",
  "steamEndCruelOff",
  "crazyGamesDemo",
  "ios",
] as const;

/** DEV Settings → Steam End (Cruel On) or Steam End (Cruel Off). */
export function isSteamEndScreenDevMode(
  mode: DevGameMode | undefined,
): boolean {
  return mode === "steamEndCruelOn" || mode === "steamEndCruelOff";
}

/**
 * Steam desktop demo (or DEV Steam Demo / Demo End): offer a Steam review.
 * Galaxy, CrazyGames, and itch keep their own endings.
 */
export function shouldOfferSteamDemoReview(
  devGameMode?: DevGameMode,
): boolean {
  if (isGalaxyEdition() || isCrazyGamesEdition() || isItchEdition()) {
    return false;
  }
  if (isSteamDemoRuntime()) return true;
  if (!import.meta.env.DEV || isSteamBuild) return false;
  const mode = resolveDevGameMode(devGameMode);
  return mode === "steamDemo" || mode === "demoEnd";
}

/**
 * Full Steam game end screen (or DEV Steam Game / Steam End):
 * offer a Steam review. Includes Cruel Mode completion.
 */
export function shouldOfferSteamGameReview(
  devGameMode?: DevGameMode,
): boolean {
  if (isGalaxyEdition() || isCrazyGamesEdition() || isItchEdition()) {
    return false;
  }
  if (isSteamBuild && !isSteamDemoRuntime()) return true;
  if (!import.meta.env.DEV || isSteamBuild) return false;
  const mode = resolveDevGameMode(devGameMode);
  return mode === "steamGame" || isSteamEndScreenDevMode(mode);
}

function isPathPrefix(prefix: string): boolean {
  if (typeof window === "undefined") return false;
  const path = window.location?.pathname ?? "";
  return path === prefix || path.startsWith(`${prefix}/`);
}

function isDevGameMode(mode: DevGameMode): boolean {
  return import.meta.env.DEV && !isSteamBuild && devGameModeOverride === mode;
}

/** Full Steam Game simulation on the web client (DEV or live account). */
export function isSimulatedSteamGameMode(
  mode: DevGameMode | undefined,
): boolean {
  return mode === "steamGame" || isSteamEndScreenDevMode(mode);
}

/** Galaxy.click demo hosted at https://a-dark-cave.com/galaxy */
export function isGalaxyEdition(): boolean {
  return isPathPrefix(GALAXY_PATH_PREFIX);
}

/**
 * CrazyGames: dedicated folder (`VITE_CRAZYGAMES=1`) or `/crazygames` on the
 * main site. Full game (no hut cap). DEV Game Mode is handled separately.
 */
export function isCrazyGamesEdition(): boolean {
  return isCrazyGamesBuild || isPathPrefix(CRAZYGAMES_PATH_PREFIX);
}

/**
 * itch.io HTML demo: uploaded folder (`VITE_ITCH=1`) or `/itch` on the main
 * site. Same hut cap and Steam wishlist ending as the other demos.
 */
export function isItchEdition(): boolean {
  return isItchBuild || isPathPrefix(ITCH_PATH_PREFIX);
}

/** Galaxy, itch, or the Steam desktop demo. Capped at the wooden hut limit. */
export function isDemoEdition(): boolean {
  return (
    isGalaxyEdition() ||
    isItchEdition() ||
    isSteamDemoRuntime() ||
    isDevGameMode("steamDemo") ||
    isDevGameMode("demoEnd")
  );
}

/**
 * Footer progress bar for the Steam demo and itch. Galaxy keeps Steam and
 * donate, without the bar. CrazyGames is the full game and leaves the bar off.
 */
export function isSteamDemoActive(): boolean {
  return (
    isSteamDemoRuntime() ||
    isItchEdition() ||
    isDevGameMode("steamDemo") ||
    isDevGameMode("demoEnd")
  );
}

/** DEV Settings → Demo End, or a capped demo that has reached the hut limit. */
export function isDemoEndDevMode(): boolean {
  return isDevGameMode("demoEnd");
}

/** Steam, iOS, Galaxy, CrazyGames, or itch — no Supabase cloud saves or online services. */
export function isLocalOnlyEdition(): boolean {
  return (
    isSteamBuild ||
    isIosBuild ||
    isGalaxyEdition() ||
    isCrazyGamesEdition() ||
    isItchEdition()
  );
}

/** Steam, iOS, Galaxy, CrazyGames, or itch — buy-once editions (BTP economy; no web MTX paywall). */
export function isFullGameUnlockedEdition(): boolean {
  return (
    isSteamBuild ||
    isIosBuild ||
    isGalaxyEdition() ||
    isCrazyGamesEdition() ||
    isItchEdition()
  );
}

const DEV_GAME_MODE_STORAGE_KEY = "adc-dev-game-mode";
/** DEV Settings → Game Mode. Survives refresh next to `?devSave=`. */
const DEV_GAME_MODE_QUERY_KEY = "gameMode";

/** Dev-only Game Mode override synced from the game store Settings dropdown. */
let devGameModeOverride: DevGameMode = "normal";
let didHydrateDevGameMode = false;

function isDevGameModeValue(value: string | null): value is DevGameMode {
  return (
    typeof value === "string" &&
    (DEV_GAME_MODE_OPTIONS as readonly string[]).includes(value)
  );
}

function readDevGameModeFromSearch(search: string): DevGameMode | null {
  try {
    const raw = new URLSearchParams(search).get(DEV_GAME_MODE_QUERY_KEY);
    return isDevGameModeValue(raw) ? raw : null;
  } catch {
    return null;
  }
}

function readDevGameModeFromUrl(): DevGameMode | null {
  if (!import.meta.env.DEV || isSteamBuild || typeof window === "undefined") {
    return null;
  }
  const search = window.location?.search;
  if (typeof search !== "string") return null;
  return readDevGameModeFromSearch(search);
}

function readDevGameModeFromSession(): DevGameMode | null {
  if (!import.meta.env.DEV || isSteamBuild || typeof sessionStorage === "undefined") {
    return null;
  }
  try {
    const raw = sessionStorage.getItem(DEV_GAME_MODE_STORAGE_KEY);
    return isDevGameModeValue(raw) ? raw : null;
  } catch {
    return null;
  }
}

function writeDevGameModeSession(mode: DevGameMode): void {
  if (!import.meta.env.DEV || typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(DEV_GAME_MODE_STORAGE_KEY, mode);
  } catch {
    // private mode / quota
  }
}

/** Keep `?gameMode=` in the address bar. Normal omits the param. */
export function syncDevGameModeQueryParam(mode: DevGameMode): void {
  if (!import.meta.env.DEV || isSteamBuild || typeof window === "undefined") return;
  const href = window.location?.href;
  if (!href || typeof window.history?.replaceState !== "function") return;
  try {
    const url = new URL(href);
    if (mode === "normal") url.searchParams.delete(DEV_GAME_MODE_QUERY_KEY);
    else url.searchParams.set(DEV_GAME_MODE_QUERY_KEY, mode);
    const next = `${url.pathname}${url.search}${url.hash}`;
    const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (next !== current) window.history.replaceState({}, "", next);
  } catch {
    // Private mode / non-browser: ignore.
  }
}

/**
 * Settings choice that must survive a refresh: the URL, then this tab's
 * session. Null when neither has been set, so a save header can still apply.
 */
export function getExplicitDevGameMode(): DevGameMode | null {
  if (!import.meta.env.DEV || isSteamBuild) return null;
  return readDevGameModeFromUrl() ?? readDevGameModeFromSession();
}

function hydrateDevGameModeOverride(): DevGameMode {
  if (!didHydrateDevGameMode) {
    didHydrateDevGameMode = true;
    const fromUrl = readDevGameModeFromUrl();
    if (fromUrl) {
      devGameModeOverride = fromUrl;
      writeDevGameModeSession(fromUrl);
    } else {
      devGameModeOverride = readDevGameModeFromSession() ?? "normal";
      if (devGameModeOverride !== "normal") {
        syncDevGameModeQueryParam(devGameModeOverride);
      }
    }
  }
  return devGameModeOverride;
}

/** Called by the store when Settings → Game Mode changes. No-op in production. */
export function setDevGameModeOverride(mode: DevGameMode): void {
  if (import.meta.env.DEV) {
    didHydrateDevGameMode = true;
    devGameModeOverride = mode;
    writeDevGameModeSession(mode);
    syncDevGameModeQueryParam(mode);
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
  return import.meta.env.DEV ? hydrateDevGameModeOverride() : "normal";
}

/**
 * Hide the Steam store / wishlist footer link. Steam desktop, the iOS app,
 * and DEV Steam Game / Demo / iOS already are a paid copy. Web, Galaxy,
 * CrazyGames, and itch keep the link. Store-free so the lightweight start
 * screen can use it.
 */
export function shouldHideSteamStoreLink(
  devGameMode: DevGameMode = "normal",
): boolean {
  if (isSteamBuild || isIosBuild) return true;
  if (devGameMode === "ios") return true;
  if (isSimulatedSteamGameMode(devGameMode)) return true;
  if (import.meta.env.DEV && !isSteamBuild) {
    return devGameMode === "steamDemo" || devGameMode === "demoEnd";
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
  if (explicit && isKnownDevGameMode(explicit)) return explicit;
  const storeMode = tryGetBoundGameStore()?.getState()?.devGameMode;
  if (isKnownDevGameMode(storeMode)) return storeMode;
  return import.meta.env.DEV ? hydrateDevGameModeOverride() : "normal";
}

/**
 * Runtime buy-once edition check — compile-time Steam / iOS / CrazyGames / Galaxy /
 * itch, DEV Game Mode, or a live account Steam Game simulation. Use for UI
 * and shop-slot behavior; keep `isSteamBuild` for build-time stubs, save
 * backends, and Steam API bridges.
 *
 * Pass store `devGameMode` when you have it so Settings → Game Mode stays the
 * source of truth (the module override can reset on HMR).
 */
export function isSteamEditionActive(devGameMode?: DevGameMode): boolean {
  if (
    isSteamBuild ||
    isIosBuild ||
    isGalaxyEdition() ||
    isCrazyGamesEdition() ||
    isItchEdition()
  ) {
    return true;
  }
  const mode = resolveDevGameMode(devGameMode);
  if (isSimulatedSteamGameMode(mode)) return true;
  return import.meta.env.DEV && !isSteamBuild && mode !== "normal";
}

/** iOS App Store build, or DEV Settings → iOS. */
export function isIosEditionActive(devGameMode?: DevGameMode): boolean {
  if (isIosBuild) return true;
  if (!import.meta.env.DEV || isSteamBuild) return false;
  return resolveDevGameMode(devGameMode) === "ios";
}

/**
 * Steam desktop client (or DEV Steam Game / Demo / End simulation).
 * False for public web, iOS, CrazyGames, itch, and Galaxy. Use for content
 * that should not appear outside the Steam desktop client even when those
 * editions share other buy-once flags.
 */
export function isSteamDesktopEditionActive(
  devGameMode?: DevGameMode,
): boolean {
  if (isSteamBuild) return true;
  if (!import.meta.env.DEV) return false;
  const mode = resolveDevGameMode(devGameMode);
  return (
    isSimulatedSteamGameMode(mode) ||
    mode === "steamDemo" ||
    mode === "demoEnd"
  );
}

/**
 * Steam desktop demo, or DEV Settings → Steam Demo / Demo End.
 * False for the full Steam game and for web / portal builds.
 */
export function isSteamDemoEditionActive(
  devGameMode?: DevGameMode,
): boolean {
  if (isSteamDemoRuntime()) return true;
  if (isSteamBuild || !import.meta.env.DEV) return false;
  const mode = resolveDevGameMode(devGameMode);
  return mode === "steamDemo" || mode === "demoEnd";
}
