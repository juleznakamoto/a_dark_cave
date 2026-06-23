/**
 * Paths and names that must stay in sync with the Steamworks Auto-Cloud config.
 *
 * Partner backend → Technical Settings → Steam Cloud → Auto-Cloud:
 *   Root: WinAppDataRoaming | Subdirectory: APP_USER_DATA_NAME | Pattern: STEAM_CLOUD_SAVE_FILE
 */
export const APP_USER_DATA_NAME = "A Dark Cave";

/** Flat save blob mirrored from IndexedDB for Steam Cloud sync. */
export const STEAM_CLOUD_SAVE_FILE = "adc-steam-save.dat";
