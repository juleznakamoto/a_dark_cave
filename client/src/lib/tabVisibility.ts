const TAB_HIDDEN_ATTR = "data-tab-hidden";

/** Test-only: `null` reads live `document.hidden`. */
let hiddenOverride: boolean | null = null;

/** True when the game page is backgrounded (browser tab, Steam overlay window, etc.). */
export function isGameTabHidden(): boolean {
  if (hiddenOverride !== null) return hiddenOverride;
  return typeof document !== "undefined" && document.hidden === true;
}

/** Test-only: force hidden/visible. Pass `null` to restore live `document.hidden`. */
export function setGameTabHiddenForTests(hidden: boolean | null): void {
  hiddenOverride = hidden;
}

/** Sync a document-level flag so CSS can pause decorative animations while the tab is hidden. */
export function initTabVisibilityClass(): void {
  const sync = () => {
    document.documentElement.toggleAttribute(TAB_HIDDEN_ATTR, document.hidden);
  };

  sync();
  document.addEventListener("visibilitychange", sync);
}
