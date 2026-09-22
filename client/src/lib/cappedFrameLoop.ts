/**
 * Paint on vsync at a fixed interval without a display-rate rAF spin.
 *
 * A loop that calls requestAnimationFrame on every refresh, then returns
 * until the cap elapses, still wakes the CPU at 60 or 120 Hz. This sleeps
 * on a timer until the next draw is due, then takes a single animation
 * frame so the paint lands on vsync.
 *
 * While the document is hidden the pending timer and frame are dropped.
 * `start()` again, or the page becoming visible, arms the next paint.
 */

export type CappedPaintLoop = {
  start: () => void;
  stop: () => void;
};

export function createCappedPaintLoop(
  intervalMs: number,
  paint: (now: number) => void,
  options?: { isActive?: () => boolean },
): CappedPaintLoop {
  const isActive = options?.isActive ?? (() => true);
  const gapMs = Math.max(0, intervalMs);
  let wanted = false;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let rafId: number | null = null;
  let listening = false;

  const pageHidden = () =>
    typeof document !== "undefined" && document.hidden === true;

  const clearPending = () => {
    if (timeoutId != null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    if (rafId != null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  };

  const armTimeout = (delayMs: number) => {
    if (!wanted || !isActive() || pageHidden()) return;
    timeoutId = setTimeout(() => {
      timeoutId = null;
      armFrame();
    }, delayMs);
  };

  const armFrame = () => {
    if (!wanted || !isActive() || pageHidden()) return;
    if (rafId != null) return;
    rafId = requestAnimationFrame((now) => {
      rafId = null;
      if (!wanted || !isActive() || pageHidden()) return;
      paint(now);
      // paint() may have called stop().
      if (!wanted || !isActive() || pageHidden()) return;
      armTimeout(gapMs);
    });
  };

  const onVisibility = () => {
    if (pageHidden()) {
      clearPending();
      return;
    }
    if (wanted && isActive()) armFrame();
  };

  return {
    start() {
      wanted = true;
      if (!listening && typeof document !== "undefined") {
        document.addEventListener("visibilitychange", onVisibility);
        listening = true;
      }
      if (timeoutId != null || rafId != null) return;
      armFrame();
    },
    stop() {
      wanted = false;
      clearPending();
      if (listening && typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVisibility);
        listening = false;
      }
    },
  };
}
