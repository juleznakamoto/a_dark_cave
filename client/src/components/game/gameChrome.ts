/** Pause overlay insets — keep in sync with header/footer padding + control height. */
export const GAME_HEADER_INSET = "36px";
export const GAME_FOOTER_INSET = "36px";

/** Top inset shared by the side-panel header row and game tab nav — keep in sync. */
export const GAME_PANEL_HEADER_ROW_CLASS = "pt-2 md:pt-3";

/** Bottom-aligned label metrics shared by tab buttons and side-panel section titles. */
export const GAME_PANEL_HEADER_LABEL_CLASS =
  "inline-flex items-end pb-2 text-sm font-normal leading-none";

/** Fixed-height header band so tab labels and side-panel titles share the same bottom edge. */
export const GAME_PANEL_HEADER_BAND_CLASS = "h-10";

/** Side-panel section title row — keep label metrics on the inner span (same as tab buttons). */
export const SIDE_PANEL_SECTION_TITLE_CLASS =
  "font-medium tracking-wide text-gray-300";
