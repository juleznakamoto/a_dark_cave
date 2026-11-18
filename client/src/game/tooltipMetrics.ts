import type { CSSProperties } from "react";

/**
 * Shared tip sizing. Flavour text may be wider than the lines above it, down
 * to this floor, and no tip grows past the maximum. The screen edge uses the
 * same inset for Radix tips and hover callouts.
 */
export const TOOLTIP_MIN_WIDTH = "16rem";
export const TOOLTIP_MAX_WIDTH = "22rem";
export const TOOLTIP_VIEWPORT_PAD_PX = 10;

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
