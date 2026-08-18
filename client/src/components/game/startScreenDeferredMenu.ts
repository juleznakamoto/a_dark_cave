export type DeferredStartMenuMount = {
  /** False when a newer click or Light Fire invalidated this import. */
  apply: boolean;
  open: boolean;
};

export type DeferredStartMenuLoadKind = "prefetch" | "open";

/**
 * Hover/click-to-load menus only apply the winning request. A stale callback
 * must not mount (defaultOpen is first-mount only).
 *
 * Skipping mount does not leave the load in flight. Callers must clear the
 * per-menu in-flight flag when the import settles so a later click can retry.
 *
 * Hover prefetches with openOnMount false. Click (or a click during prefetch)
 * opens unless Light Fire already started.
 */
export function resolveDeferredStartMenuMount(
  lightFireStarted: boolean,
  requestGen: number,
  currentGen: number,
  openOnMount: boolean,
): DeferredStartMenuMount {
  if (requestGen !== currentGen) {
    return { apply: false, open: false };
  }
  return { apply: true, open: openOnMount && !lightFireStarted };
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
