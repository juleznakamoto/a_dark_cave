
// Game configuration constants - Single Source of Truth
export const GAME_CONSTANTS = {
  LOG_MAX_ENTRIES: 25,
  TICK_INTERVAL: 250, // 250ms between game logic ticks
  /** Gold cost to abort an in-progress player-started timed action and refund its spent costs. */
  ACTION_ABORT_GOLD_COST: 50,
} as const;
