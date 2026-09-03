import {
  SAVE_ORIGIN_EDITIONS,
  type SaveOriginEdition,
} from "@shared/schema";
import {
  isCrazyGamesEdition,
  isGalaxyEdition,
  isSteamBuild,
  isSteamDemoBuild,
  isSteamDemoRuntime,
  isSteamPlaytestBuild,
  getDevGameModeOverride,
} from "@/lib/edition";

export { SAVE_ORIGIN_EDITIONS, type SaveOriginEdition };

/** Edition that should be stamped on the next local / Steam Cloud write. */
export function getSaveOriginEdition(): SaveOriginEdition {
  if (isSteamPlaytestBuild) return "steam-playtest";
  if (isSteamDemoBuild || isSteamDemoRuntime()) return "steam-demo";
  if (isSteamBuild) return "steam-full";
  if (isGalaxyEdition()) return "galaxy";
  if (isCrazyGamesEdition()) return "crazygames";
  if (import.meta.env.DEV && !isSteamBuild) {
    const mode = getDevGameModeOverride();
    if (mode === "steamPlaytest") return "steam-playtest";
    if (mode === "steamDemo" || mode === "demoEnd") return "steam-demo";
    if (mode === "steamGame") return "steam-full";
    if (mode === "crazyGamesDemo") return "crazygames";
  }
  return "web";
}

export function isSaveOriginEdition(
  value: unknown,
): value is SaveOriginEdition {
  return (
    typeof value === "string" &&
    (SAVE_ORIGIN_EDITIONS as readonly string[]).includes(value)
  );
}
