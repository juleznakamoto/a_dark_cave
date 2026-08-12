/** Pause overlay insets — keep in sync with header/footer padding + control height. */
export const GAME_HEADER_INSET = "36px";
export const GAME_FOOTER_INSET = "36px";

/**
 * Header/footer chrome controls: Reddit-style hover (opacity/color only, no fill)
 * and no press squash. Overrides Button `ghost` `hover:bg-accent` and
 * `active:scale-[0.97]`.
 */
export const GAME_CHROME_NO_BG_HOVER = "hover:bg-transparent active:scale-100";

/** Fixed overlay between header/footer; click particles portal here (below action buttons). */
export const GAME_PARTICLE_LAYER_ID = "adc-game-particle-layer";

/** Shared bottom-aligned header label band (tabs + side-panel section titles). */
export const GAME_PANEL_HEADER_BAND =
  // !leading-none: scaled .text-sm line-height must not inflate this band or
  // icon tabs (quest book) sit below the text baselines.
  "inline-flex h-9 items-end pb-2 text-sm !leading-none";

/**
 * Insight unlock blobs + construction/preset slot chrome in panel headers.
 * Sized in CSS so Large text (`--adc-control-scale`) grows them slightly.
 */
export const GAME_PANEL_HEADER_INSIGHT_BADGE_CLASS =
  "game-panel-header-slot min-h-0 shrink-0";

/**
 * Circular progress indicators next to section titles (Produce effects, Focus).
 * Normal: 18px. Large text: 22px (see `.game-panel-header-indicator` in CSS).
 * Pair with `CircularProgress fill` + `GAME_PANEL_HEADER_INDICATOR_GLYPH_CLASS`.
 */
export const GAME_PANEL_HEADER_INDICATOR_SIZE_PX = 18;

export const GAME_PANEL_HEADER_INDICATOR_CLASS =
  "game-panel-header-indicator inline-flex shrink-0 items-center justify-center self-center cursor-pointer rounded-full opacity-80 transition-opacity duration-150 hover:opacity-100";
export const GAME_PANEL_HEADER_INDICATOR_TRIGGER_CLASS =
  "inline-flex items-center leading-none";
/** Centered glyph over a header indicator ring; keep per-glyph mt/translate optical nudges at call sites. */
export const GAME_PANEL_HEADER_INDICATOR_GLYPH_CLASS =
  "game-panel-header-indicator-glyph font-noto-symbols-2 absolute inset-0 flex items-center justify-center font-extrabold leading-none";
export const GAME_PANEL_HEADER_INDICATOR_INNER_CLASS =
  "relative inline-flex h-full w-full items-center justify-center";

/** Anchor tab SVG masks to the icon box bottom (wide icons are otherwise vertically centered). */
export const TAB_ICON_MASK_BOTTOM =
  "[mask-position:bottom] [-webkit-mask-position:bottom]";

/**
 * Align tab mask icons with capital labels in GAME_PANEL_HEADER_BAND.
 * Mask-bottom keeps wide art on the icon-box floor; negative translate offsets
 * the font descent space that `items-end` otherwise shares with the icons.
 */
export const TAB_ICON_ALIGN_CLASS = `${TAB_ICON_MASK_BOTTOM} -translate-y-[3px]`;

/** Default size for Cave/City/… tab mask icons (scales with `--adc-text-scale`). */
export const TAB_ICON_SIZE_CLASS = "game-tab-icon";

/** Timed-event hourglass tab icon alignment (same baseline as other tab icons). */
export const TAB_TIMED_EVENT_ICON_CLASS = TAB_ICON_ALIGN_CLASS;

/** Mask icons (rewards diamond) — glow via `.lime-accent-mask-icon` in index.css. */
export const LIME_ACCENT_MASK_ICON_CLASS = "lime-accent-mask-icon";

/** Mask icons (trader coin stack) — glow via `.gold-accent-mask-icon` in index.css. */
export const GOLD_ACCENT_MASK_ICON_CLASS = "gold-accent-mask-icon";
