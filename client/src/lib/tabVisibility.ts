const TAB_HIDDEN_ATTR = "data-tab-hidden";

/** Sync a document-level flag so CSS can pause decorative animations while the tab is hidden. */
export function initTabVisibilityClass(): void {
  const sync = () => {
    document.documentElement.toggleAttribute(TAB_HIDDEN_ATTR, document.hidden);
  };

  sync();
  document.addEventListener("visibilitychange", sync);
}
