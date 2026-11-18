export type DeferredStartMenuMount = {
  /** False when a newer click or Make Fire invalidated this import. */
  apply: boolean;
  open: boolean;
};

export type DeferredStartMenuLoadKind = "prefetch" | "open";

/**
 * After a click-to-load mounts the real menu already open, iOS/WKWebView still
 * delivers focus-outside / leftover pointer events from that same tap. Ignore
 * closes for this long so the menu does not flash shut.
 */
export const DEFERRED_MENU_OPEN_DISMISS_GUARD_MS = 450;

/**
 * Hover/click-to-load menus only apply the winning request. A stale callback
 * must not mount (defaultOpen is first-mount only).
 *
 * Skipping mount does not leave the load in flight. Callers must clear the
 * per-menu in-flight flag when the import settles so a later click can retry.
 *
 * Hover prefetches with openOnMount false. Click (or a click during prefetch)
 * opens unless Make Fire already started.
 */
export function resolveDeferredStartMenuMount(
  makeFireStarted: boolean,
  requestGen: number,
  currentGen: number,
  openOnMount: boolean,
): DeferredStartMenuMount {
  if (requestGen !== currentGen) {
    return { apply: false, open: false };
  }
  return { apply: true, open: openOnMount && !makeFireStarted };
}

/** True when Radix tries to close during the deferred open-on-mount guard. */
export function shouldIgnoreDeferredMenuClose(
  nextOpen: boolean,
  guardUntilMs: number,
  nowMs: number = performance.now(),
): boolean {
  return !nextOpen && nowMs < guardUntilMs;
}

/** Click during a hover prefetch should open when that import settles. */
export function shouldRequestOpenOnInFlightLoad(
  alreadyLoaded: boolean,
  loadInFlight: boolean,
): boolean {
  return !alreadyLoaded && loadInFlight;
}

/** Placeholder stays until the real menu mounts; in-flight must not latch. */
export function shouldBlockDeferredStartMenuLoad(
  alreadyLoaded: boolean,
  loadInFlight: boolean,
): boolean {
  return alreadyLoaded || loadInFlight;
}
