/** Last stretch of a timed dialog where the time bar pulses. */
export const TIMED_EVENT_TIME_BAR_PULSE_MS = 5_000;

export const TIMED_EVENT_TIME_BAR_PULSE_CLASS = "timer-progress-pulse";

export function shouldPulseTimedEventTimeBar(remainingMs: number): boolean {
  return remainingMs > 0 && remainingMs <= TIMED_EVENT_TIME_BAR_PULSE_MS;
}
