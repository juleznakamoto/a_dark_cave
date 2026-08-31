/** Fallback if LCP never reports (hidden tab, older browsers). */
export const START_SCREEN_GAME_PREFETCH_LCP_FALLBACK_MS = 2500;

export const START_SCREEN_GAME_PREFETCH_ACTIVITY_EVENTS = [
  "pointerdown",
  "pointermove",
  "keydown",
  "touchstart",
] as const;

/**
 * Prefetch the Game chunk only after LCP has a chance to settle *and* the
 * player has moved or pressed something. pointermove does not freeze LCP, so
 * starting the download earlier can steal the main thread from the title card.
 */
export function subscribeStartScreenGamePrefetch(
  onPrefetch: () => void,
  options?: {
    target?: EventTarget;
    lcpFallbackMs?: number;
    observeLcp?: (callback: () => void) => () => void;
  },
): () => void {
  const target = options?.target ?? (typeof window === "undefined" ? null : window);
  if (!target) return () => { };

  let lcpReady = false;
  let sawActivity = false;
  let done = false;
  const cleanups: Array<() => void> = [];

  const maybePrefetch = () => {
    if (done || !lcpReady || !sawActivity) return;
    done = true;
    for (const cleanup of cleanups) cleanup();
    cleanups.length = 0;
    onPrefetch();
  };

  const markActivity = () => {
    sawActivity = true;
    maybePrefetch();
  };

  const markLcpReady = () => {
    lcpReady = true;
    maybePrefetch();
  };

  for (const eventName of START_SCREEN_GAME_PREFETCH_ACTIVITY_EVENTS) {
    target.addEventListener(eventName, markActivity, { passive: true });
    cleanups.push(() =>
      target.removeEventListener(eventName, markActivity),
    );
  }

  const unobserveLcp = (options?.observeLcp ?? observeLargestContentfulPaint)(
    markLcpReady,
  );
  cleanups.push(unobserveLcp);

  const fallbackMs =
    options?.lcpFallbackMs ?? START_SCREEN_GAME_PREFETCH_LCP_FALLBACK_MS;
  const fallbackId = setTimeout(markLcpReady, fallbackMs);
  cleanups.push(() => clearTimeout(fallbackId));

  return () => {
    done = true;
    for (const cleanup of cleanups) cleanup();
    cleanups.length = 0;
  };
}

function observeLargestContentfulPaint(onLcp: () => void): () => void {
  if (typeof PerformanceObserver === "undefined") return () => { };
  try {
    const observer = new PerformanceObserver((list) => {
      if (list.getEntries().length > 0) onLcp();
    });
    observer.observe({ type: "largest-contentful-paint", buffered: true });
    return () => observer.disconnect();
  } catch {
    return () => { };
  }
}
