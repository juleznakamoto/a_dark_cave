import type { GameState } from "@shared/schema";
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

/** Settings gift code. Capitalization does not matter. */
export const CRUEL_WORLD_CODE = "CRUELWORLD";

/** story.seen flag set when the settings code is accepted. Survives a new game. */
export const CRUEL_WORLD_CODE_SEEN_KEY = "cruelWorldCode";

export type SteamCruelModeUnlockInput = {
  devGameMode?: DevGameMode;
  hasWonNormalGame?: boolean;
  /** CRUELWORLD was entered in Settings. */
  cruelWorldCode?: boolean;
};

/** Capitalization does not matter. Surrounding spaces are ignored. */
export function matchesCruelWorldCode(input: string): boolean {
  return input.trim().toUpperCase() === CRUEL_WORLD_CODE;
}

export function hasCruelWorldCode(state: {
  story?: { seen?: GameState["story"]["seen"] };
}): boolean {
  return state.story?.seen?.[CRUEL_WORLD_CODE_SEEN_KEY] === true;
}

export function markCruelWorldCodeEntered(
  state: GameState,
): Partial<GameState> {
  return {
    story: {
      ...state.story,
      seen: {
        ...state.story.seen,
        [CRUEL_WORLD_CODE_SEEN_KEY]: true,
      },
    },
  };
}

/**
 * Steam full game (or a DEV Steam Game / Steam End simulation): the
 * player may start Cruel Mode after a normal-mode finish, or immediately
 * after entering the CRUELWORLD code in Settings.
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
  // DEV Settings → Steam Game only. The packaged app still requires a normal win,
  // unless CRUELWORLD was entered (checked below).
  if (mode === "steamGame" && import.meta.env.DEV && !isSteamBuild) return true;
  if (!STEAM_CRUEL_MODE_UNLOCK) return false;
  if (isSteamDemoBuild || isSteamDemoRuntime()) return false;
  if (isGalaxyEdition() || isCrazyGamesEdition() || isItchEdition()) return false;
  const onSteamFull = isSteamFullBuild || isSimulatedSteamGameMode(mode);
  if (input.cruelWorldCode === true && onSteamFull) return true;
  if (input.hasWonNormalGame !== true) return false;
  return onSteamFull;
}
