import type { CSSProperties } from "react";

/** Shared with `ButtonPriorBadge` and prior-style radio indicators. */
export const PRIOR_DISC_OUTER_TRANSITION =
  "background 700ms, box-shadow 800ms" as const;
export const PRIOR_DISC_INNER_TRANSITION = "top 600ms ease, left 600ms ease" as const;

const FILL_SCALE = 2.2;
const FILL_OFFSET_RATIO = 0.3;

export function getPriorDiscFillMetrics(diameterPx: number): {
  fillSize: number;
  fillOffsetInPx: number;
  fillOffsetOutPx: number;
} {
  const fillSize = diameterPx * FILL_SCALE;
  return {
    fillSize,
    fillOffsetInPx: -Math.round(diameterPx * FILL_OFFSET_RATIO),
    fillOffsetOutPx: -(fillSize + 2),
  };
}

/**
 * @param active — toggled “on” (assigned / selected)
 * @param surfaceLocked — dim inactive surface (badge at capacity, or disabled radio)
 * @param hovered — pointer over control
 */
export function getPriorDiscSurfaceColors(args: {
  active: boolean;
  surfaceLocked: boolean;
  hovered: boolean;
}): { background: string; boxShadow: string } {
  const { active, surfaceLocked, hovered } = args;
  const background = surfaceLocked
    ? "rgba(235,235,235,0.12)"
    : hovered && !active
      ? "rgba(235,235,235,0.9)"
      : "rgba(235,235,235,0.5)";

  const boxShadow = active
    ? `0 0 0 1.5px #252525, 0 0 0 2.5px ${hovered ? "rgba(235,235,235,1)" : "rgba(235,235,235,0.95)"}`
    : surfaceLocked
      ? "0 0 0 0.5px rgba(235,235,235,0.15)"
      : `0 0 0 0.5px ${hovered ? "rgba(235,235,235,0.8)" : "rgba(235,235,235,0.7)"}`;

  return { background, boxShadow };
}

/** Diagonal sliding fill; `mutedFill` when active but non-interactive (disabled selected radio). */
export function getPriorDiscInnerFillStyle(args: {
  active: boolean;
  fillSize: number;
  fillOffsetInPx: number;
  fillOffsetOutPx: number;
  mutedFill?: boolean;
}): CSSProperties {
  const { active, fillSize, fillOffsetInPx, fillOffsetOutPx, mutedFill } = args;
  const offset = active ? fillOffsetInPx : fillOffsetOutPx;
  const background =
    mutedFill && active
      ? "rgba(235,235,235,0.35)"
      : "rgba(235,235,235,1)";

  return {
    width: fillSize,
    height: fillSize,
    background,
    position: "absolute",
    top: offset,
    left: offset,
    transform: "rotateZ(45deg)",
    transition: PRIOR_DISC_INNER_TRANSITION,
  };
}
