import type { CSSProperties } from "react";
import { ADC_PROGRESS_WIPE_PAUSED_CLASS } from "@/lib/uiClock";

/** Last stretch of a timed dialog where the time bar pulses. */
export const TIMED_EVENT_TIME_BAR_PULSE_MS = 5_000;

export const TIMED_EVENT_TIME_BAR_PULSE_CLASS = "timer-progress-pulse";

/** Linear fill wipe for EventDialog timed choices (CSS, not 10 Hz React ticks). */
export const TIMED_DIALOG_TIME_BAR_FILL_CLASS = "timed-dialog-time-bar-fill";

export const TIMED_DIALOG_TIME_BAR_PAUSED_CLASS = ADC_PROGRESS_WIPE_PAUSED_CLASS;

export function shouldPulseTimedEventTimeBar(remainingMs: number): boolean {
  return remainingMs > 0 && remainingMs <= TIMED_EVENT_TIME_BAR_PULSE_MS;
}

/**
 * Seek a continuous translateX fill for the timed-dialog time bar.
 * Remount (new key) when unpausing or returning from a hidden tab so Chromium
 * does not restart from rewriting animation-delay mid-flight.
 */
export function getTimedDialogTimeBarFillStyle(opts: {
  startMs: number;
  durationMs: number;
  nowMs?: number;
}): { className: string; style: CSSProperties } {
  const nowMs = opts.nowMs ?? Date.now();
  const durationMs = Math.max(0, opts.durationMs);
  const elapsedMs = Math.max(0, nowMs - opts.startMs);

  if (durationMs <= 0 || elapsedMs >= durationMs) {
    return {
      className: "",
      style: { transform: "translateX(0%)" },
    };
  }

  const remainingFraction = 1 - elapsedMs / durationMs;
  return {
    className: TIMED_DIALOG_TIME_BAR_FILL_CLASS,
    style: {
      transform: `translateX(-${remainingFraction * 100}%)`,
      animationDuration: `${durationMs}ms`,
      animationDelay: `-${elapsedMs}ms`,
    },
  };
}
