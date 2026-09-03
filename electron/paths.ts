/**
 * Paths and names that must stay in sync with the Steamworks Auto-Cloud config.
 *
 * Partner backend → Technical Settings → Steam Cloud → Auto-Cloud:
 *   Root: WinAppDataRoaming | Subdirectory: STEAM_CLOUD_DIR_NAME
 *   Patterns: STEAM_FULL_CLOUD_SAVE_FILE and STEAM_DEMO_CLOUD_SAVE_FILE
 *
 * Full game and demo use **separate** Auto-Cloud filenames in the same folder so
 * launching the demo cannot overwrite a purchased full-game save. The full game
 * may *read* the demo file once (start-screen Continue). Electron `userData`
 * (IndexedDB) stays per-variant via APP_USER_DATA_NAME. Legacy demo path is still
 * read as a fallback and dual-written by the demo.
 *
 * Variant builds set `ADC_STEAM_DEMO_BUILD` or `ADC_STEAM_PLAYTEST_BUILD` at Electron
 * bundle time (`scripts/package-steam-demo.mjs` / `scripts/package-steam-playtest.mjs`).
 */
import { join } from "node:path";

export const isSteamDemoBuild =
  typeof process !== "undefined" && process.env.ADC_STEAM_DEMO_BUILD === "1";

export const isSteamPlaytestBuild =
  typeof process !== "undefined" &&
  process.env.ADC_STEAM_PLAYTEST_BUILD === "1";

/** Electron userData + window branding (IndexedDB lives here). */
export const APP_USER_DATA_NAME = isSteamPlaytestBuild
  ? "A Dark Cave Playtest"
  : isSteamDemoBuild
    ? "A Dark Cave Demo"
    : "A Dark Cave";

export const APP_WINDOW_TITLE = isSteamPlaytestBuild
  ? "A Dark Cave Playtest"
  : isSteamDemoBuild
    ? "A Dark Cave Demo"
    : "A Dark Cave";

/**
 * Roaming subdirectory for Steam Auto-Cloud (full + demo files live here).
 * Playtest keeps an isolated cloud namespace under its own userData.
 */
export const STEAM_CLOUD_DIR_NAME = "A Dark Cave";

/** Full-game Cloud filename. Demo must never write this file. */
export const STEAM_FULL_CLOUD_SAVE_FILE = "adc-steam-save.dat";

/** Demo Cloud filename (same folder as the full game so Shared cloud APP ID syncs both). */
export const STEAM_DEMO_CLOUD_SAVE_FILE = "adc-steam-demo-save.dat";

/** Flat save blob mirrored from IndexedDB for this edition's Steam Cloud sync. */
export const STEAM_CLOUD_SAVE_FILE = isSteamPlaytestBuild
  ? "adc-steam-playtest-save.dat"
  : isSteamDemoBuild
    ? STEAM_DEMO_CLOUD_SAVE_FILE
    : STEAM_FULL_CLOUD_SAVE_FILE;

/** Pre-split demo Auto-Cloud location (keep reading / dual-writing during cutover). */
export const LEGACY_STEAM_DEMO_DIR_NAME = "A Dark Cave Demo";
export const LEGACY_STEAM_DEMO_SAVE_FILE = STEAM_DEMO_CLOUD_SAVE_FILE;

/** Absolute path of the shared (or playtest) Steam Cloud save file. */
export function resolveSteamCloudSavePath(
  appData: string,
  userData: string,
): string {
  if (isSteamPlaytestBuild) {
    return join(userData, STEAM_CLOUD_SAVE_FILE);
  }
  return join(appData, STEAM_CLOUD_DIR_NAME, STEAM_CLOUD_SAVE_FILE);
}

/** Absolute path of the demo Cloud file in the shared Auto-Cloud folder. */
export function resolveSteamDemoCloudSavePath(appData: string): string {
  return join(appData, STEAM_CLOUD_DIR_NAME, STEAM_DEMO_CLOUD_SAVE_FILE);
}

/** Absolute path of the legacy demo cloud save (userdata folder from early demo builds). */
export function resolveLegacyDemoSavePath(appData: string): string {
  return join(
    appData,
    LEGACY_STEAM_DEMO_DIR_NAME,
    LEGACY_STEAM_DEMO_SAVE_FILE,
  );
}
