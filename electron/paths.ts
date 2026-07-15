/**
 * Paths and names that must stay in sync with the Steamworks Auto-Cloud config.
 *
 * Partner backend → Technical Settings → Steam Cloud → Auto-Cloud:
 *   Root: WinAppDataRoaming | Subdirectory: APP_USER_DATA_NAME | Pattern: STEAM_CLOUD_SAVE_FILE
 *
 * Demo vs full game is selected at Electron bundle time via `ADC_STEAM_DEMO=1`
 * (`scripts/package-steam-demo.mjs`), which sets `ADC_STEAM_DEMO_BUILD` below.
 */
const isDemoBuild =
  typeof process !== "undefined" &&
  process.env.ADC_STEAM_DEMO_BUILD === "1";

export const APP_USER_DATA_NAME = isDemoBuild
  ? "A Dark Cave Demo"
  : "A Dark Cave";

export const APP_WINDOW_TITLE = isDemoBuild
  ? "A Dark Cave Demo"
  : "A Dark Cave";

/** Flat save blob mirrored from IndexedDB for Steam Cloud sync. */
export const STEAM_CLOUD_SAVE_FILE = isDemoBuild
  ? "adc-steam-demo-save.dat"
  : "adc-steam-save.dat";
