import type { GameState } from "@shared/schema";

const MS_PER_HOUR = 60 * 60 * 1000;

/** Keep in sync with Epic "Speedrunner" overall achievement detail. */
export const SPEEDRUN_WIN_MAX_MS = 5 * MS_PER_HOUR;

/** Keep in sync with Epic "Cave Veteran" overall achievement maxCount. */
export const CAVE_VETERAN_WINS = 3;

/** Cube ending events that call `getGameWinAchievementUpdates` (once per run). */
const WIN_AWARD_EVENT_IDS = [
  "cube13",
  "cube15a",
  "cube15b",
  "cube16a",
  "cube16b",
] as const;

export type GameWinAchievementUpdates = {
  hasWonAnyGame: true;
  hasWonNormalGame?: true;
  hasWonCruelGame?: true;
  hasSpeedrunWin?: true;
  /** Absolute lifetime win count after this award (omit if already counted this run). */
  lifetimeGamesWon?: number;
};

function hasAlreadyCountedWinThisRun(
  state: Pick<GameState, "events">,
): boolean {
  const events = state.events;
  if (!events) return false;
  return WIN_AWARD_EVENT_IDS.some((id) => Boolean(events[id]));
}

/**
 * Best-known lifetime win count from save fields (counter, game_stats, legacy flags).
 * Used on load so older saves get partial credit toward Cave Veteran.
 */
export function getLifetimeGamesWonFromSave(state: {
  lifetimeGamesWon?: number;
  game_stats?: Array<{ finishTime?: number } | null> | null;
  hasWonAnyGame?: boolean;
  hasWonNormalGame?: boolean;
  hasWonCruelGame?: boolean;
}): number {
  const stored = Math.max(0, Math.floor(Number(state.lifetimeGamesWon) || 0));
  const fromStats = Array.isArray(state.game_stats)
    ? state.game_stats.filter(
      (e) => e && typeof e.finishTime === "number" && e.finishTime > 0,
    ).length
    : 0;
  const fromModeFlags =
    (state.hasWonNormalGame ? 1 : 0) + (state.hasWonCruelGame ? 1 : 0);
  const fromAny = state.hasWonAnyGame ? 1 : 0;
  return Math.max(stored, fromStats, fromModeFlags, fromAny);
}

/**
 * Meta win flags awarded when the player reaches a cube ending beat.
 * Used by slaughter (cube13) and communicate (cube15b) paths alike.
 * Lifetime win count increments at most once per run (later cube beats skip it).
 */
export function getGameWinAchievementUpdates(
  state: Pick<
    GameState,
    "cruelMode" | "playTime" | "events" | "lifetimeGamesWon"
  >,
): GameWinAchievementUpdates {
  const updates: GameWinAchievementUpdates = { hasWonAnyGame: true };
  if (state.cruelMode) {
    updates.hasWonCruelGame = true;
  } else {
    updates.hasWonNormalGame = true;
  }
  if ((Number(state.playTime) || 0) < SPEEDRUN_WIN_MAX_MS) {
    updates.hasSpeedrunWin = true;
  }
  if (!hasAlreadyCountedWinThisRun(state)) {
    updates.lifetimeGamesWon =
      Math.max(0, Math.floor(Number(state.lifetimeGamesWon) || 0)) + 1;
  }
  return updates;
}
