import { STEAM_CRUEL_MODE_UNLOCK } from "@/lib/featureFlags";
import {
  isCrazyGamesEdition,
  isGalaxyEdition,
  isItchEdition,
  isSimulatedSteamGameMode,
  isSteamBuild,
  isSteamDemoBuild,
  isSteamDemoRuntime,
  isSteamFullBuild,
  type DevGameMode,
} from "@/lib/edition";

export type SteamCruelModeUnlockInput = {
  devGameMode?: DevGameMode;
  hasWonNormalGame?: boolean;
};

/**
 * Steam full game (or a DEV Steam Game / Steam End simulation): the
 * player may start Cruel Mode after a normal-mode finish.
 *
 * Hidden behind {@link STEAM_CRUEL_MODE_UNLOCK} except for Settings →
 * Steam End (Cruel On), and Settings → Steam Game, which pretends a
 * normal win so New Game can offer Cruel Mode while the shipped flag
 * is still off.
 */
export function isSteamCruelModeUnlockAvailable(
  input: SteamCruelModeUnlockInput = {},
): boolean {
  const mode = input.devGameMode;
  if (mode === "steamEndCruelOff") return false;
  if (mode === "steamEndCruelOn") return true;
  // DEV Settings → Steam Game only. The packaged Steam app keeps the flag.
  if (mode === "steamGame" && import.meta.env.DEV && !isSteamBuild) return true;
  if (!STEAM_CRUEL_MODE_UNLOCK) return false;
  if (input.hasWonNormalGame !== true) return false;
  if (isSteamDemoBuild || isSteamDemoRuntime()) return false;
  if (isGalaxyEdition() || isCrazyGamesEdition() || isItchEdition()) return false;
  if (isSteamFullBuild) return true;
  return isSimulatedSteamGameMode(mode);
}
