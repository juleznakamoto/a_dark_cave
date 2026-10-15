/** Last stretch of a timed-tab visit where the time bar pulses. */
export const TIMED_EVENT_TIME_BAR_PULSE_MS = 5_000;

export const TIMED_EVENT_TIME_BAR_PULSE_CLASS = "timer-progress-pulse";

export function shouldPulseTimedEventTimeBar(remainingMs: number): boolean {
  return remainingMs > 0 && remainingMs <= TIMED_EVENT_TIME_BAR_PULSE_MS;
}

/**
 * 0 when the visit starts, 100 when time is up.
 * Pause freezes both elapsed and remaining, so the bar does not jump on resume.
 */
export function getTimedEventTimeBarFillPercent(args: {
  startTime?: number;
  pauseAccumMs?: number;
  pauseStartedAt?: number;
  now: number;
  remainingMs: number;
}): number {
  const start = args.startTime;
  if (start == null || start <= 0) return 0;

  const pauseAccum = args.pauseAccumMs ?? 0;
  const frozenAt = args.pauseStartedAt ?? 0;
  const clock = frozenAt > 0 ? frozenAt : args.now;
  const elapsed = Math.max(0, clock - start - pauseAccum);
  const remaining = Math.max(0, args.remainingMs);
  const total = elapsed + remaining;
  if (total <= 0) return 0;

  return Math.min(100, (elapsed / total) * 100);
}
