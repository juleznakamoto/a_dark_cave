import type { GameState } from "@shared/schema";
import {
  isSteamBuild,
  isSteamDemoRuntime,
  type DevGameMode,
} from "@/lib/edition";
import { updateResource } from "@/game/stateHelpers";

/** Newsletter gift code entered at the bottom of Settings. */
export const WANDERERS_LANTERN_CODE = "WANDERER";

/** Capitalization does not matter. Surrounding spaces are ignored. */
export function matchesWanderersLanternCode(input: string): boolean {
  return input.trim().toUpperCase() === WANDERERS_LANTERN_CODE;
}

export const WANDERERS_LANTERN_TOOL_ID = "wanderers_lantern";

export const WANDERERS_LANTERN_EVENT_ID = "wanderersLantern";

/** story.seen flag set when the settings code is accepted. */
export const WANDERERS_LANTERN_CODE_SEEN_KEY = "wanderersLanternCode";

/** story.seen timestamp (ms). While it is in the future, the silver chance is on. */
export const WANDERERS_LANTERN_ACTIVE_UNTIL_SEEN_KEY =
  "wanderersLanternActiveUntil";

/** story.seen timestamp (ms). The lantern cannot be lit again until this passes. */
export const WANDERERS_LANTERN_COOLDOWN_UNTIL_SEEN_KEY =
  "wanderersLanternCooldownUntil";

export const WANDERERS_LANTERN_ACTIVE_MS = 5 * 60 * 1000;

export const WANDERERS_LANTERN_COOLDOWN_MS = 15 * 60 * 1000;

export const WANDERERS_LANTERN_SILVER_CHANCE = 0.1;

export const WANDERERS_LANTERN_SILVER_AMOUNT = 10;

export const WANDERERS_LANTERN_LUCK = 2;

const STEAM_DEV_MODES: readonly DevGameMode[] = [
  "steamGame",
  "steamPlaytest",
  "steamDemo",
  "demoEnd",
  "steamEndCruelOn",
  "steamEndCruelOff",
];

type LanternState = GameState & { devGameMode?: DevGameMode };

/** Steam full, demo, and playtest, plus DEV Game Mode copies of those. */
export function isWanderersLanternEdition(
  devGameMode?: DevGameMode,
): boolean {
  if (isSteamBuild || isSteamDemoRuntime()) return true;
  if (!import.meta.env.DEV || !devGameMode) return false;
  return STEAM_DEV_MODES.includes(devGameMode);
}

export function hasWanderersLanternCode(state: GameState): boolean {
  return state.story?.seen?.[WANDERERS_LANTERN_CODE_SEEN_KEY] === true;
}

export function ownsWanderersLantern(state: GameState): boolean {
  return state.tools?.wanderers_lantern === true;
}

export function wanderersLanternActiveUntil(state: GameState): number {
  const until = state.story?.seen?.[WANDERERS_LANTERN_ACTIVE_UNTIL_SEEN_KEY];
  return typeof until === "number" ? until : 0;
}

export function wanderersLanternCooldownUntil(state: GameState): number {
  const until = state.story?.seen?.[WANDERERS_LANTERN_COOLDOWN_UNTIL_SEEN_KEY];
  return typeof until === "number" ? until : 0;
}

/** The 5 minutes after lighting, when actions can find silver. */
export function isWanderersLanternLit(
  state: GameState,
  now = Date.now(),
): boolean {
  if (!ownsWanderersLantern(state)) return false;
  return wanderersLanternActiveUntil(state) > now;
}

/** After the active window, until the lantern can be lit again. */
export function isWanderersLanternCooling(
  state: GameState,
  now = Date.now(),
): boolean {
  if (!ownsWanderersLantern(state) || isWanderersLanternLit(state, now)) {
    return false;
  }
  return wanderersLanternCooldownUntil(state) > now;
}

/** Owned, and neither the active window nor the cooldown is running. */
export function isWanderersLanternReady(
  state: GameState,
  now = Date.now(),
): boolean {
  return (
    ownsWanderersLantern(state) &&
    !isWanderersLanternLit(state, now) &&
    !isWanderersLanternCooling(state, now)
  );
}

export function isWanderersLanternEventReady(state: LanternState): boolean {
  if (!isWanderersLanternEdition(state.devGameMode)) return false;
  if (!hasWanderersLanternCode(state)) return false;
  if (ownsWanderersLantern(state)) return false;
  if (state.triggeredEvents?.[WANDERERS_LANTERN_EVENT_ID]) return false;
  return true;
}

export function markWanderersLanternCodeEntered(
  state: GameState,
): Partial<GameState> {
  return {
    story: {
      ...state.story,
      seen: {
        ...state.story.seen,
        [WANDERERS_LANTERN_CODE_SEEN_KEY]: true,
      },
    },
  };
}

export function activateWanderersLantern(
  state: GameState,
  now = Date.now(),
): Partial<GameState> {
  return {
    story: {
      ...state.story,
      seen: {
        ...state.story.seen,
        [WANDERERS_LANTERN_ACTIVE_UNTIL_SEEN_KEY]:
          now + WANDERERS_LANTERN_ACTIVE_MS,
        [WANDERERS_LANTERN_COOLDOWN_UNTIL_SEEN_KEY]:
          now + WANDERERS_LANTERN_ACTIVE_MS + WANDERERS_LANTERN_COOLDOWN_MS,
      },
    },
  };
}

/**
 * While the lantern is lit, each finished action has a chance to find silver.
 * Returns null when the roll misses or the lantern is dark.
 */
export function wanderersLanternSilverPatch(
  state: GameState,
  now = Date.now(),
  roll = Math.random(),
): Partial<GameState> | null {
  if (!isWanderersLanternLit(state, now)) return null;
  if (roll >= WANDERERS_LANTERN_SILVER_CHANCE) return null;
  return updateResource(state, "silver", WANDERERS_LANTERN_SILVER_AMOUNT, {
    allowOvercap: true,
  });
}
