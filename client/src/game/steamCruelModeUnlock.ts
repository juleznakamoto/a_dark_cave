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
 * Gated by {@link STEAM_CRUEL_MODE_UNLOCK}. The Steam demo never offers it.
 * Settings → Steam End (Cruel Off) stays hidden. Settings → Steam End
 * (Cruel On) always offers it, and DEV Settings → Steam Game offers it
 * before a normal win so the new-game checkbox can be checked.
 */
export function isSteamCruelModeUnlockAvailable(
  input: SteamCruelModeUnlockInput = {},
): boolean {
  const mode = input.devGameMode;
  if (mode === "steamEndCruelOff") return false;
  if (mode === "steamEndCruelOn") return true;
  // DEV Settings → Steam Game only. The packaged app still requires a normal win.
  if (mode === "steamGame" && import.meta.env.DEV && !isSteamBuild) return true;
  if (!STEAM_CRUEL_MODE_UNLOCK) return false;
  if (input.hasWonNormalGame !== true) return false;
  if (isSteamDemoBuild || isSteamDemoRuntime()) return false;
  if (isGalaxyEdition() || isCrazyGamesEdition() || isItchEdition()) return false;
  if (isSteamFullBuild) return true;
  return isSimulatedSteamGameMode(mode);
}
