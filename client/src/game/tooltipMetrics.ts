/**
 * Shared tip sizing. No tip grows past the maximum. Phones use the smaller
 * maximum (see `--adc-tooltip-max` in index.css, same 768px break as the
 * rest of the layout). The screen edge uses the same inset for Radix tips
 * and hover callouts.
 */
export const TOOLTIP_MAX_WIDTH = "22rem";
export const TOOLTIP_MAX_WIDTH_MOBILE = "18rem";
export const TOOLTIP_VIEWPORT_PAD_PX = 10;
/** Space between a tip and its trigger. Hover callouts use the same gap. */
export const TOOLTIP_GAP_PX = 6;

/** Fill and body type for every tip. The frame applies this last, so a caller cannot swap the background or the text color. */
export const TOOLTIP_SURFACE_CLASS = "bg-neutral-950 text-xs text-neutral-200";
/** Small shadow in the cave background, even on every side. */
export const TOOLTIP_SHADOW_CLASS = "shadow-[0_0_8px_1px_var(--background)]";
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

/**
 * Cap for every tip. Popper's available width already includes the pad, so a
 * tip beside the screen edge is narrower than the maximum and its text wraps.
 */
export function tooltipFrameMaxWidth(): string {
  const pad = TOOLTIP_VIEWPORT_PAD_PX * 2;
  const max = `var(--adc-tooltip-max, ${TOOLTIP_MAX_WIDTH})`;
  return `min(${max}, calc(100vw - ${pad}px), var(--radix-popper-available-width, ${max}))`;
}
