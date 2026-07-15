/**
 * Paths and names that must stay in sync with the Steamworks Auto-Cloud config.
 *
 * Partner backend → Technical Settings → Steam Cloud → Auto-Cloud:
 *   Root: WinAppDataRoaming | Subdirectory: APP_USER_DATA_NAME | Pattern: STEAM_CLOUD_SAVE_FILE
 *
 * Variant builds set `ADC_STEAM_DEMO_BUILD` or `ADC_STEAM_PLAYTEST_BUILD` at Electron bundle
 * time (`scripts/package-steam-demo.mjs` / `scripts/package-steam-playtest.mjs`).
 */
const isDemoBuild =
  typeof process !== "undefined" &&
  process.env.ADC_STEAM_DEMO_BUILD === "1";

const isPlaytestBuild =
  typeof process !== "undefined" &&
  process.env.ADC_STEAM_PLAYTEST_BUILD === "1";

export const APP_USER_DATA_NAME = isPlaytestBuild
  ? "A Dark Cave Playtest"
  : isDemoBuild
    ? "A Dark Cave Demo"
    : "A Dark Cave";

export const APP_WINDOW_TITLE = isPlaytestBuild
  ? "A Dark Cave Playtest"
  : isDemoBuild
    ? "A Dark Cave Demo"
    : "A Dark Cave";

/** Flat save blob mirrored from IndexedDB for Steam Cloud sync. */
export const STEAM_CLOUD_SAVE_FILE = isPlaytestBuild
  ? "adc-steam-playtest-save.dat"
  : isDemoBuild
    ? "adc-steam-demo-save.dat"
    : "adc-steam-save.dat";
