/** Pause overlay insets — keep in sync with header/footer padding + control height. */
export const GAME_HEADER_INSET = "36px";
export const GAME_FOOTER_INSET = "36px";

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

/** Anchor tall tab SVG masks (e.g. hourglass) to the icon box bottom. */
export const TAB_ICON_MASK_BOTTOM =
  "[mask-position:bottom] [-webkit-mask-position:bottom]";

/** Optical align tab mask icons with capital labels in GAME_PANEL_HEADER_BAND. */
export const TAB_ICON_ALIGN_CLASS = "translate-y-[1px]";

/** Default size for Cave/City/… tab mask icons (scales with `--adc-text-scale`). */
export const TAB_ICON_SIZE_CLASS = "game-tab-icon";

/** Timed-event hourglass tab icon alignment (tweak translate if needed). */
export const TAB_TIMED_EVENT_ICON_CLASS = `${TAB_ICON_MASK_BOTTOM} ${TAB_ICON_ALIGN_CLASS}`;

/** Lime accent icon idle + hover (trader tab, rewards tasks shortcut). */
export const LIME_ACCENT_ICON_IDLE =
  "opacity-80 transition-[opacity,text-shadow,filter] group-hover:opacity-100 group-focus-visible:opacity-100";

/** Text glyphs (e.g. trader ◬). */
export const LIME_ACCENT_GLOW_TEXT_SHADOW_ACTIVE =
  "[text-shadow:0_0_4px_rgba(132,204,22,1),0_0_8px_rgba(132,204,22,1),0_0_16px_rgba(132,204,22,1)]";

export const LIME_ACCENT_GLOW_TEXT_SHADOW_HOVER =
  "group-hover:[text-shadow:0_0_4px_rgba(132,204,22,1),0_0_8px_rgba(132,204,22,1),0_0_16px_rgba(132,204,22,1),0_0_32px_rgba(132,204,22,1)] group-focus-visible:[text-shadow:0_0_4px_rgba(132,204,22,1),0_0_8px_rgba(132,204,22,1),0_0_16px_rgba(132,204,22,1),0_0_32px_rgba(132,204,22,1)]";

/** Mask SVG icons (e.g. rewards tasks diamond) — glow via `.lime-accent-mask-icon` in index.css. */
export const LIME_ACCENT_MASK_ICON_CLASS = "lime-accent-mask-icon";
