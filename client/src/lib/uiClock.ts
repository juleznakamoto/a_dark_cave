import { useEffect, useState, type CSSProperties } from "react";

/**
 * Shared wall-clock for UI that only needs second-granularity updates
 * (tooltip remaining time, etc.). One interval for the whole app — idle
 * when nothing is subscribed.
 *
 * Progress wipes should use `getCssTimedWipeStyle` instead of subscribing
 * here, so N executing buttons do not mean N React re-renders per tick.
 */

export const UI_CLOCK_PERIOD_MS = 1000;

type Listener = () => void;

let nowMs = Date.now();
const listeners = new Set<Listener>();
let intervalId: ReturnType<typeof setInterval> | null = null;

function emit(): void {
  nowMs = Date.now();
  for (const listener of listeners) listener();
}

function ensureRunning(): void {
  if (intervalId != null || listeners.size === 0) return;
  intervalId = setInterval(emit, UI_CLOCK_PERIOD_MS);
}

function stopIfIdle(): void {
  if (listeners.size > 0 || intervalId == null) return;
  clearInterval(intervalId);
  intervalId = null;
}

export function getUiClockNow(): number {
  return nowMs;
}

export function subscribeUiClock(listener: Listener): () => void {
  listeners.add(listener);
  ensureRunning();
  return () => {
    listeners.delete(listener);
    stopIfIdle();
  };
}

/** Live subscriber count — used by tests and `?perf=1` docs. */
export function getUiClockSubscriberCount(): number {
  return listeners.size;
}

/** True while the shared 1 Hz interval is armed. */
export function isUiClockRunning(): boolean {
  return intervalId != null;
}

export function resetUiClockForTests(): void {
  listeners.clear();
  if (intervalId != null) {
    clearInterval(intervalId);
    intervalId = null;
  }
  nowMs = Date.now();
}

/**
 * Re-render about once a second while `active`. Prefer CSS wipes or
 * `useUntilTimestamp` when a full-component tick is not needed.
 */
export function useUiNow(active: boolean): number {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!active) return;
    return subscribeUiClock(() => setTick((n) => n + 1));
  }, [active]);
  return Date.now();
}

/**
 * True until `endMs`, then flips false once. One timeout — not a 10 Hz poll.
 * Pass `null`/`undefined` for idle.
 */
export function useUntilTimestamp(endMs: number | null | undefined): boolean {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (typeof endMs !== "number") return;
    const remaining = endMs - Date.now();
    if (remaining <= 0) return;
    const id = window.setTimeout(() => setTick((n) => n + 1), remaining);
    return () => window.clearTimeout(id);
  }, [endMs]);
  return typeof endMs === "number" && endMs > Date.now();
}

export type TimedWipeMode = "fill" | "recede";

export const ADC_PROGRESS_WIPE_CLASS = "adc-progress-wipe";
export const ADC_PROGRESS_WIPE_FILL_CLASS = "adc-progress-wipe--fill";
export const ADC_PROGRESS_WIPE_RECEDE_CLASS = "adc-progress-wipe--recede";
export const ADC_PROGRESS_WIPE_PAUSED_CLASS = "adc-progress-wipe--paused";
export const ADC_PROGRESS_WIPE_EDGE_CLASS = "adc-progress-wipe-edge";
export const ADC_PROGRESS_WIPE_EDGE_FILL_CLASS = "adc-progress-wipe-edge--fill";
export const ADC_PROGRESS_WIPE_EDGE_RECEDE_CLASS = "adc-progress-wipe-edge--recede";

/**
 * Inner corner of a `rounded-md` button (outer radius minus the 1px border).
 * The wash sits on the padding edge, so this radius meets the outline.
 * Keep in sync with `.adc-cooldown-wash` in index.css.
 */
const WIPE_CORNER_RADIUS = "max(0px, calc(var(--radius) - 3px))";

export type TimedWipeStyle = {
  className: string;
  style: CSSProperties;
  edgeClassName: string;
  edgeStyle: CSSProperties;
};

function wipeProgressStyle(
  visibleFraction: number,
  timing?: Pick<CSSProperties, "animationDuration" | "animationDelay">,
): Pick<TimedWipeStyle, "style" | "edgeStyle"> {
  const visible = Math.min(1, Math.max(0, visibleFraction));
  const hidden = (1 - visible) * 100;
  return {
    style: {
      // Full-size box + clip-path. scaleX would squash border-radius into an
      // ellipse; inset() keeps the corner radius in px.
      width: "100%",
      clipPath: `inset(0 ${hidden}% 0 0 round ${WIPE_CORNER_RADIUS})`,
      ...timing,
    },
    edgeStyle: {
      // `left` is the leading edge. translateX(-100%) parks the highlight
      // just inside that edge so its width stays 0.75rem.
      left: `${visible * 100}%`,
      transform: "translateX(-100%)",
      ...timing,
    },
  };
}

/**
 * CSS keyframe seek: full-duration clip animation + negative delay so a
 * remount (tab visible, duration boost) continues from the current elapsed
 * fraction without a 10 Hz React update.
 *
 * Memoize the result and remount via a key when you need to re-seek. Writing a
 * new `animation-delay` on an in-flight wipe restarts it in Chromium.
 */
export function getCssTimedWipeStyle(opts: {
  startMs: number;
  durationMs: number;
  mode: TimedWipeMode;
  nowMs?: number;
}): TimedWipeStyle {
  const nowMs = opts.nowMs ?? Date.now();
  const durationMs = Math.max(0, opts.durationMs);
  const elapsedMs = Math.max(0, nowMs - opts.startMs);

  if (durationMs <= 0 || elapsedMs >= durationMs) {
    const visual = wipeProgressStyle(opts.mode === "fill" ? 1 : 0);
    return {
      className: "",
      edgeClassName: "",
      ...visual,
    };
  }

  const progress = elapsedMs / durationMs;
  const visible = opts.mode === "fill" ? progress : 1 - progress;
  const timing = {
    animationDuration: `${durationMs}ms`,
    animationDelay: `-${elapsedMs}ms`,
  };
  const visual = wipeProgressStyle(visible, timing);

  return {
    className: `${ADC_PROGRESS_WIPE_CLASS} ${opts.mode === "fill"
        ? ADC_PROGRESS_WIPE_FILL_CLASS
        : ADC_PROGRESS_WIPE_RECEDE_CLASS
      }`,
    edgeClassName: `${ADC_PROGRESS_WIPE_EDGE_CLASS} ${opts.mode === "fill"
        ? ADC_PROGRESS_WIPE_EDGE_FILL_CLASS
        : ADC_PROGRESS_WIPE_EDGE_RECEDE_CLASS
      }`,
    ...visual,
  };
}
