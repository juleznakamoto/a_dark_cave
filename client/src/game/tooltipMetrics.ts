import type { CSSProperties } from "react";

/**
 * Shared tip sizing. Flavour text may be wider than the lines above it, down
 * to this floor, and no tip grows past the maximum. The screen edge uses the
 * same inset for Radix tips and hover callouts.
 */
export const TOOLTIP_MIN_WIDTH = "16rem";
export const TOOLTIP_MAX_WIDTH = "22rem";
export const TOOLTIP_VIEWPORT_PAD_PX = 10;
/** Space between a tip and its trigger. Hover callouts use the same gap. */
export const TOOLTIP_GAP_PX = 6;

/** Fill and body type for every tip. The frame applies this last, so a caller cannot swap the background or the text color. */
export const TOOLTIP_SURFACE_CLASS = "bg-neutral-950 text-xs text-neutral-200";
/** Breakdown lines and flavour under a heading. */
export const TOOLTIP_MUTED_CLASS = "text-muted-foreground";
/** Hairline color. Same as the frame edge when the destroyed border is off. */
export const TOOLTIP_RULE_COLOR_CLASS = "border-neutral-800";
/** Section hairline. */
export const TOOLTIP_DIVIDER_CLASS = `my-1 border-t ${TOOLTIP_RULE_COLOR_CLASS}`;
/** Gap between lines inside a tip. Matches the divider's own margin. */
export const TOOLTIP_STACK_CLASS = "space-y-1";
/** Heading and the emphasized label inside a tip. */
export const TOOLTIP_TITLE_CLASS = "font-semibold";
/** Shop tips keep an amber edge on the shared frame. */
export const TOOLTIP_ACCENT_SHOP_CLASS = "border border-amber-600";
/** Restart and delete tips keep a red edge on the shared frame. */
export const TOOLTIP_ACCENT_DANGER_CLASS =
  "border border-red-600 shadow-[0_0_10px_theme(colors.red.600/0.55)]";

/** Cap used by the tooltip frame. Popper's available width already includes the pad. */
export function tooltipFrameMaxWidth(): string {
  const pad = TOOLTIP_VIEWPORT_PAD_PX * 2;
  return `min(${TOOLTIP_MAX_WIDTH}, calc(100vw - ${pad}px), var(--radix-popper-available-width, ${TOOLTIP_MAX_WIDTH}))`;
}

/**
 * Flavour under costs or effects takes the lines above when those are wider
 * than the floor, and never passes the maximum. Flavour alone wraps at the
 * floor and stays narrower when the sentence is short.
 */
export function tooltipDescriptionLayoutStyle(
  hasContentAbove: boolean,
): CSSProperties {
  if (hasContentAbove) {
    return {
      width: 0,
      minWidth: `max(100%, ${TOOLTIP_MIN_WIDTH})`,
      maxWidth: TOOLTIP_MAX_WIDTH,
    };
  }
  return {
    width: "max-content",
    maxWidth: TOOLTIP_MIN_WIDTH,
  };
}
