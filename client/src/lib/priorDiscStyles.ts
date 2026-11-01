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

/** Silver is the Prior. Bronze is the Huntress on Hunt. */
export type PriorDiscTone = "silver" | "bronze";

const PRIOR_DISC_RGB: Record<PriorDiscTone, string> = {
  silver: "235,235,235",
  bronze: "205,127,50",
};

/**
 * @param active — toggled “on” (assigned / selected)
 * @param surfaceLocked — dim inactive surface (badge at capacity, or disabled radio)
 * @param hovered — pointer over control
 * @param tone — silver Prior, or bronze Huntress
 */
export function getPriorDiscSurfaceColors(args: {
  active: boolean;
  surfaceLocked: boolean;
  hovered: boolean;
  tone?: PriorDiscTone;
}): { background: string; boxShadow: string } {
  const { active, surfaceLocked, hovered, tone = "silver" } = args;
  const rgb = PRIOR_DISC_RGB[tone];
  const background = surfaceLocked
    ? `rgba(${rgb},0.12)`
    : hovered && !active
      ? `rgba(${rgb},0.9)`
      : `rgba(${rgb},0.5)`;

  const boxShadow = active
    ? `0 0 0 1.5px #252525, 0 0 0 2.5px ${hovered ? `rgba(${rgb},1)` : `rgba(${rgb},0.95)`}`
    : surfaceLocked
      ? `0 0 0 0.5px rgba(${rgb},0.15)`
      : `0 0 0 0.5px ${hovered ? `rgba(${rgb},0.8)` : `rgba(${rgb},0.7)`}`;

  return { background, boxShadow };
}

/** Diagonal sliding fill; `mutedFill` when active but non-interactive (disabled selected radio). */
export function getPriorDiscInnerFillStyle(args: {
  active: boolean;
  fillSize: number;
  fillOffsetInPx: number;
  fillOffsetOutPx: number;
  mutedFill?: boolean;
  tone?: PriorDiscTone;
}): CSSProperties {
  const {
    active,
    fillSize,
    fillOffsetInPx,
    fillOffsetOutPx,
    mutedFill,
    tone = "silver",
  } = args;
  const rgb = PRIOR_DISC_RGB[tone];
  const offset = active ? fillOffsetInPx : fillOffsetOutPx;
  const background =
    mutedFill && active ? `rgba(${rgb},0.35)` : `rgba(${rgb},1)`;

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
