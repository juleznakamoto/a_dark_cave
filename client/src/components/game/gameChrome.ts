/** Pause overlay insets — keep in sync with header/footer padding + control height. */
export const GAME_HEADER_INSET = "36px";
export const GAME_FOOTER_INSET = "36px";

/** Fixed overlay between header/footer; click particles portal here. */
export const GAME_PARTICLE_LAYER_ID = "adc-game-particle-layer";

/** Shared bottom-aligned header label band (tabs + side-panel section titles). */
export const GAME_PANEL_HEADER_BAND =
  "inline-flex h-9 items-end pb-2 text-sm leading-none";

/** Anchor tall tab SVG masks (e.g. hourglass) to the icon box bottom. */
export const TAB_ICON_MASK_BOTTOM =
  "[mask-position:bottom] [-webkit-mask-position:bottom]";

/** Timed-event hourglass tab icon alignment (tweak `-translate-y-[2px]` if needed). */
export const TAB_TIMED_EVENT_ICON_CLASS = `${TAB_ICON_MASK_BOTTOM} -translate-y-[2px]`;

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
