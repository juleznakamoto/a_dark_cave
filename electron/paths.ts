/**
 * Paths and names that must stay in sync with the Steamworks Auto-Cloud config.
 *
 * Partner backend → Technical Settings → Steam Cloud → Auto-Cloud:
 *   Root: WinAppDataRoaming | Subdirectory: STEAM_CLOUD_DIR_NAME | Pattern: STEAM_CLOUD_SAVE_FILE
 *
 * Full game + demo share one Auto-Cloud path so demo progress can continue in the
 * full game (plus Steamworks "Shared cloud APP ID" on the demo at full release).
 * Electron `userData` (IndexedDB) stays per-variant via APP_USER_DATA_NAME so a
 * live demo update does not relocate existing local DB files. Legacy demo cloud
 * files are still read as a fallback (and dual-written by the demo during cutover).
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
 * Roaming subdirectory for the Steam Auto-Cloud save (full + demo).
 * Playtest keeps an isolated cloud namespace under its own userData.
 */
export const STEAM_CLOUD_DIR_NAME = "A Dark Cave";

/** Flat save blob mirrored from IndexedDB for Steam Cloud sync. */
export const STEAM_CLOUD_SAVE_FILE = isSteamPlaytestBuild
  ? "adc-steam-playtest-save.dat"
  : "adc-steam-save.dat";

/** Pre-shared-path demo Auto-Cloud location (keep reading / dual-writing during cutover). */
export const LEGACY_STEAM_DEMO_DIR_NAME = "A Dark Cave Demo";
export const LEGACY_STEAM_DEMO_SAVE_FILE = "adc-steam-demo-save.dat";

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

/** Absolute path of the legacy demo cloud save (live demo builds before shared path). */
export function resolveLegacyDemoSavePath(appData: string): string {
  return join(
    appData,
    LEGACY_STEAM_DEMO_DIR_NAME,
    LEGACY_STEAM_DEMO_SAVE_FILE,
  );
}
