/** Last stretch where tab + on-panel timers pulse as urgency. */
export const TIMER_URGENCY_PULSE_MS = 30_000;

/** Matches Timed Event tab red urgency pulse. */
export const TIMER_URGENCY_PULSE_CLASS = "timer-tab-pulse-red";

export function shouldPulseTimerUrgency(remainingMs: number): boolean {
  return remainingMs > 0 && remainingMs <= TIMER_URGENCY_PULSE_MS;
}
