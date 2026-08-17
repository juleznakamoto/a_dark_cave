export type DeferredStartMenuMount = {
  /** False when a newer click or Light Fire invalidated this import. */
  apply: boolean;
  open: boolean;
};

/**
 * Click-to-load menus only apply the winning request. A stale callback must
 * not mount (defaultOpen is first-mount only).
 *
 * Skipping mount does not leave the load in flight. Callers must clear the
 * per-menu in-flight flag when the import settles so a later click can retry.
 */
export function resolveDeferredStartMenuMount(
  lightFireStarted: boolean,
  requestGen: number,
  currentGen: number,
): DeferredStartMenuMount {
  if (requestGen !== currentGen) {
    return { apply: false, open: false };
  }
  return { apply: true, open: !lightFireStarted };
}

/** Placeholder stays until the real menu mounts; in-flight must not latch. */
export function shouldBlockDeferredStartMenuLoad(
  alreadyLoaded: boolean,
  loadInFlight: boolean,
): boolean {
  return alreadyLoaded || loadInFlight;
}
