const TAB_HIDDEN_ATTR = "data-tab-hidden";

/** Test-only: `null` reads live `document.hidden`. */
let hiddenOverride: boolean | null = null;
const hiddenListeners = new Set<() => void>();

/**
 * Bumps when the page becomes visible again. Tooltip roots remount on this so
 * Radix hover is not left dead after a forced `open={false}` while hidden.
 */
let tabVisibleEpoch = 0;
let lastHidden =
  typeof document !== "undefined" && document.hidden === true;

function notifyTabHiddenListeners() {
  hiddenListeners.forEach((listener) => listener());
}

function noteHiddenTransition(hidden: boolean) {
  if (lastHidden && !hidden) {
    tabVisibleEpoch += 1;
  }
  lastHidden = hidden;
}

function readDocumentHidden(): boolean {
  return typeof document !== "undefined" && document.hidden === true;
}

/** iOS shell sets this when the app is backgrounded but `document.hidden` stays false. */
let nativeAppBackgrounded = false;

/** True when the game page is backgrounded (browser tab, Steam overlay window, iOS app, etc.). */
export function isGameTabHidden(): boolean {
  if (hiddenOverride !== null) return hiddenOverride;
  return readDocumentHidden() || nativeAppBackgrounded;
}

/**
 * Monotonic counter. Increments when the tab goes from hidden to visible.
 * Used as a React `key` so tooltip roots remount with a fresh hover state.
 */
export function getTabVisibleEpoch(): number {
  return tabVisibleEpoch;
}

/** Subscribe to browser-tab / window hide-show. Listener is also called from tests. */
export function subscribeGameTabHidden(listener: () => void): () => void {
  hiddenListeners.add(listener);
  return () => {
    hiddenListeners.delete(listener);
  };
}

/** Test-only: force hidden/visible. Pass `null` to restore live `document.hidden`. */
export function setGameTabHiddenForTests(hidden: boolean | null): void {
  hiddenOverride = hidden;
  noteHiddenTransition(isGameTabHidden());
  notifyTabHiddenListeners();
}

let stopTabVisibilitySync: (() => void) | null = null;

function syncTabVisibilityFromDocument() {
  const hidden = isGameTabHidden();
  document.documentElement.toggleAttribute(TAB_HIDDEN_ATTR, hidden);
  noteHiddenTransition(hidden);
  notifyTabHiddenListeners();
}

/**
 * iOS reports background via the native app listener. `document.hidden` often
 * stays false there, so the game loop would keep running. Dispatch
 * `visibilitychange` so the existing pause and save listeners run.
 */
export function setNativeAppBackgrounded(backgrounded: boolean): void {
  if (nativeAppBackgrounded === backgrounded) return;
  nativeAppBackgrounded = backgrounded;
  if (typeof document === "undefined") return;
  document.dispatchEvent(new Event("visibilitychange"));
}

/** Sync a document-level flag so CSS can pause decorative animations while the tab is hidden. */
export function initTabVisibilityClass(): void {
  if (stopTabVisibilitySync) return;

  syncTabVisibilityFromDocument();
  document.addEventListener("visibilitychange", syncTabVisibilityFromDocument);
  // `visibilitychange` is sometimes skipped on Windows/Chrome (alt-tab, overlay,
  // bfcache). Focus/pageshow still fire, and resyncing unsticks force-closed tooltips.
  window.addEventListener("pageshow", syncTabVisibilityFromDocument);
  window.addEventListener("focus", syncTabVisibilityFromDocument);

  stopTabVisibilitySync = () => {
    document.removeEventListener(
      "visibilitychange",
      syncTabVisibilityFromDocument,
    );
    window.removeEventListener("pageshow", syncTabVisibilityFromDocument);
    window.removeEventListener("focus", syncTabVisibilityFromDocument);
    stopTabVisibilitySync = null;
  };
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    stopTabVisibilitySync?.();
  });
}

if (typeof window !== "undefined" && import.meta.env.MODE !== "test") {
  initTabVisibilityClass();
}
