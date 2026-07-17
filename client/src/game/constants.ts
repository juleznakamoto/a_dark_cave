
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
  /** Wall-clock seconds to call the travelling merchant after clicking the button. */
  CALL_MERCHANT_EXECUTION_SECONDS: 5,
  /** Play-time ms before the merchant can be called again after a visit ends. */
  CALL_MERCHANT_COOLDOWN_MS: 5 * 60 * 1000,
  /** Wall-clock ms the merchant timed tab stays open after arrival. */
  CALL_MERCHANT_VISIT_DURATION_MS: 4 * 60 * 1000,
  /** First call costs this much gold; each subsequent call adds `CALL_MERCHANT_GOLD_PER_CALL`. */
  CALL_MERCHANT_BASE_GOLD: 50,
  CALL_MERCHANT_GOLD_PER_CALL: 25,
  CALL_MERCHANT_MAX_GOLD: 250,
} as const;

/** Gold cost to call the merchant for the given number of prior completed calls. */
export function getCallMerchantGoldCost(usageCount: number): number {
  const c = GAME_CONSTANTS;
  return Math.min(
    c.CALL_MERCHANT_BASE_GOLD + c.CALL_MERCHANT_GOLD_PER_CALL * usageCount,
    c.CALL_MERCHANT_MAX_GOLD,
  );
}
