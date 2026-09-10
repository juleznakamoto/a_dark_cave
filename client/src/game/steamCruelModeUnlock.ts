import { STEAM_CRUEL_MODE_UNLOCK } from "@/lib/featureFlags";
import {
  isCrazyGamesEdition,
  isGalaxyEdition,
  isSimulatedSteamGameMode,
  isSteamDemoBuild,
  isSteamDemoRuntime,
  isSteamFullBuild,
  isSteamPlaytestBuild,
  type DevGameMode,
} from "@/lib/edition";

export type SteamCruelModeUnlockInput = {
  devGameMode?: DevGameMode;
  hasWonNormalGame?: boolean;
};

/**
 * Steam full / playtest (or a DEV Steam Game / Steam End simulation): the
 * player may start Cruel Mode after a normal-mode finish.
 *
 * Hidden behind {@link STEAM_CRUEL_MODE_UNLOCK} except for Settings →
 * Steam End (Cruel On), which always previews the unlocked flow.
 */
export function isSteamCruelModeUnlockAvailable(
  input: SteamCruelModeUnlockInput = {},
): boolean {
  const mode = input.devGameMode;
  if (mode === "steamEndCruelOff") return false;
  if (mode === "steamEndCruelOn") return true;
  if (!STEAM_CRUEL_MODE_UNLOCK) return false;
  if (input.hasWonNormalGame !== true) return false;
  if (isSteamDemoBuild || isSteamDemoRuntime()) return false;
  if (isGalaxyEdition() || isCrazyGamesEdition()) return false;
  if (isSteamFullBuild || isSteamPlaytestBuild) return true;
  return isSimulatedSteamGameMode(mode);
}
