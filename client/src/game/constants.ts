
// Game configuration constants - Single Source of Truth
export const GAME_CONSTANTS = {
  LOG_MAX_ENTRIES: 40,
  TICK_INTERVAL: 250, // 250ms between game logic ticks (cooldowns, executions, prior, buffs)
  /**
   * How often random/story/attack-wave events are rolled, in ms. Decoupled from TICK_INTERVAL
   * so event probabilities can be tuned independently of the simulation tick. Event probability
   * math in `EventManager.checkEvents` is calibrated to this interval, so changing it keeps the
   * average time between events the same.
   */
  EVENT_CHECK_INTERVAL: 1000, // Roll events once per second
  /** Gold cost to abort an in-progress player-started timed action and refund its spent costs. */
  ACTION_ABORT_GOLD_COST: 25,
} as const;
