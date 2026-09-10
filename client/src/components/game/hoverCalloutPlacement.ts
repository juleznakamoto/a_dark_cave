export type HoverCalloutSide = "top" | "left" | "right" | "bottom";

/** Arrow anchor along the callout edge facing the trigger (1/4, 1/2, or 3/4). */
export type HoverCalloutArrowAlign = "start" | "center" | "end";

/** Matches `mb-1.5` / `mt-1.5` on in-flow callouts. */
export const CALLOUT_GAP_PX = 6;
/** Matches `-left-2` / `-right-2` on in-flow side callouts. */
export const CALLOUT_SIDE_GAP_PX = 8;
export const CALLOUT_VIEWPORT_PAD_PX = 8;
const ARROW_INSET_PX = 10;

export function calloutAlignRatio(align: HoverCalloutArrowAlign): number {
  if (align === "start") return 0.25;
  if (align === "end") return 0.75;
  return 0.5;
}

/** Percentages for the arrow before the callout has been measured. */
export function fallbackCalloutArrow(
  side: HoverCalloutSide,
  arrowAlign: HoverCalloutArrowAlign,
): { left: string; top: string } {
  const alignPct = `${calloutAlignRatio(arrowAlign) * 100}%`;
  switch (side) {
    case "bottom":
      return { left: alignPct, top: "0%" };
    case "top":
      return { left: alignPct, top: "100%" };
    case "left":
      return { left: "100%", top: alignPct };
    case "right":
      return { left: "0%", top: alignPct };
  }
}

export type CalloutPlacementBox = {
  left: number;
  top: number;
  /** Arrow anchor in px from the callout's top-left. */
  arrowLeft: number;
  arrowTop: number;
  width: number;
  height: number;
  maxWidth: number;
};

/** Arrow `left`/`top` as percentages so fallback and placed paths share one unit. */
export function calloutArrowCss(
  side: HoverCalloutSide,
  arrowAlign: HoverCalloutArrowAlign,
  placement: CalloutPlacementBox | null,
): { left: string; top: string } {
  if (placement && placement.width > 0 && placement.height > 0) {
    return {
      left: `${(placement.arrowLeft / placement.width) * 100}%`,
      top: `${(placement.arrowTop / placement.height) * 100}%`,
    };
  }
  return fallbackCalloutArrow(side, arrowAlign);
}

/** Places a hover callout in the viewport and keeps the arrow on the trigger. */
export function placeCalloutInViewport({
  side,
  arrowAlign,
  trigger,
  width,
  height,
  viewportWidth,
  viewportHeight,
}: {
  side: HoverCalloutSide;
  arrowAlign: HoverCalloutArrowAlign;
  trigger: Pick<DOMRect, "left" | "top" | "width" | "height">;
  width: number;
  height: number;
  viewportWidth: number;
  viewportHeight: number;
}): CalloutPlacementBox {
  const ratio = calloutAlignRatio(arrowAlign);
  const maxWidth = Math.max(0, viewportWidth - CALLOUT_VIEWPORT_PAD_PX * 2);
  const boxWidth = Math.min(width, maxWidth);
  const boxHeight = height;

  const horizontalSide = side === "left" || side === "right";
  const anchorX = trigger.left + trigger.width * (horizontalSide ? 0.5 : ratio);
  const anchorY = trigger.top + trigger.height * (horizontalSide ? ratio : 0.5);

  let left: number;
  let top: number;
  switch (side) {
    case "bottom":
      left = anchorX - boxWidth / 2;
      top = trigger.top + trigger.height + CALLOUT_GAP_PX;
      break;
    case "top":
      left = anchorX - boxWidth / 2;
      top = trigger.top - CALLOUT_GAP_PX - boxHeight;
      break;
    case "left":
      left = trigger.left - CALLOUT_SIDE_GAP_PX - boxWidth;
      top = anchorY - boxHeight / 2;
      break;
    case "right":
      left = trigger.left + trigger.width + CALLOUT_SIDE_GAP_PX;
      top = anchorY - boxHeight / 2;
      break;
  }

  const minLeft = CALLOUT_VIEWPORT_PAD_PX;
  const maxLeft = Math.max(minLeft, viewportWidth - boxWidth - CALLOUT_VIEWPORT_PAD_PX);
  const minTop = CALLOUT_VIEWPORT_PAD_PX;
  const maxTop = Math.max(minTop, viewportHeight - boxHeight - CALLOUT_VIEWPORT_PAD_PX);
  left = Math.min(Math.max(left, minLeft), maxLeft);
  top = Math.min(Math.max(top, minTop), maxTop);

  let arrowLeft: number;
  let arrowTop: number;
  if (horizontalSide) {
    arrowLeft = side === "right" ? 0 : boxWidth;
    arrowTop = Math.min(
      Math.max(anchorY - top, ARROW_INSET_PX),
      Math.max(ARROW_INSET_PX, boxHeight - ARROW_INSET_PX),
    );
  } else {
    arrowLeft = Math.min(
      Math.max(anchorX - left, ARROW_INSET_PX),
      Math.max(ARROW_INSET_PX, boxWidth - ARROW_INSET_PX),
    );
    arrowTop = side === "bottom" ? 0 : boxHeight;
  }

  return {
    left,
    top,
    arrowLeft,
    arrowTop,
    width: boxWidth,
    height: boxHeight,
    maxWidth,
  };
}
