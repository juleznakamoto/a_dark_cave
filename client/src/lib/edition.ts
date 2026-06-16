/**
 * Game edition flag — single source of truth for distinguishing the public web
 * build from the Steam desktop build.
 *
 * The Steam build is produced with `VITE_STEAM_BUILD=1` (see `build:steam` in
 * package.json). Everything Steam-specific (no online services, no real-money
 * shop, merchant-sold artifacts, local + Steam Cloud saves, Steam achievements)
 * keys off this constant so the same codebase ships both editions.
 */
export const isSteamBuild = import.meta.env.VITE_STEAM_BUILD === "1";

/** Convenience inverse for readability at web-only call sites. */
export const isWebBuild = !isSteamBuild;
