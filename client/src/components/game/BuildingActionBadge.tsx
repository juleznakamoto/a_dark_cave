import { useId, type CSSProperties } from "react";
import { INSIGHT_GLYPH, INSIGHT_TEXT_CLASS } from "@/game/villagerCapUpgrades";
import { cn } from "@/lib/utils";

/**
 * Tailwind classes to nudge the idle glyph vertically next to adjacent text.
 * Tune here (e.g. `translate-y-[0.1em]`, `pb-[0.05em]`, `mt-[1px]`).
 * Applied on inline badge buttons (stats, timed event, side-panel buildings).
 */
export const INSIGHT_BADGE_ALIGN_CLASS = "translate-y-[0.14em]";

/**
 * Nudge the hover/playing blob animation within the badge (glyph vs SVG center
 * differ). Negative translate-y pulls the blob up. Tune per size if needed.
 */
export const INSIGHT_BADGE_BLOB_ALIGN_CLASS_SM = "-translate-y-[0.14em]";
/** Stats header, timed-event tab, and action-button overlays (`size="lg"`). */
export const INSIGHT_BADGE_BLOB_ALIGN_CLASS_LG = "-translate-y-[0.14em]";

/** Shared insight badge button: single-layer opacity (no nested badge opacity). */
export function getInsightBadgeTriggerClassName({
  canAfford,
  playing,
  className,
}: {
  canAfford: boolean;
  playing: boolean;
  className?: string;
}) {
  return cn(
    "insight-action-badge-trigger relative items-center justify-center border-0 bg-transparent p-0 transition-opacity duration-200",
    className,
    playing && "opacity-100",
    !playing && canAfford && "opacity-80 hover:opacity-100",
    !playing &&
    !canAfford &&
    "opacity-60 hover:opacity-70 insight-action-badge-trigger--unaffordable",
  );
}

type BuildingActionBadgeProps = {
  /** Force the hover animation (e.g. during Insight reveal cooldown). */
  playing?: boolean;
  /** When true, badge fills its parent instead of self-anchoring with absolute CSS. */
  embedded?: boolean;
  /** `sm` = side-panel building row; `lg` = action overlays and header badges. */
  size?: "sm" | "lg";
  /** Idle glyph in font-noto-symbols-2 (defaults to Insight triangle). */
  glyph?: string;
};

export function BuildingActionBadge({
  playing = false,
  embedded = false,
  size = "lg",
  glyph = INSIGHT_GLYPH,
}: BuildingActionBadgeProps) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const maskId = `building-action-badge-mask-${id}`;
  const gradientId = `building-action-badge-gradient-${id}`;
  const gooFilterId = `building-action-badge-goo-${id}`;

  return (
    <span
      className={cn(
        "building-action-badge",
        size === "sm"
          ? "building-action-badge--sm"
          : "building-action-badge--lg",
        embedded && "building-action-badge--embedded",
        playing && "building-action-badge--playing",
      )}
      style={
        {
          "--building-action-badge-goo-filter": `url(#${gooFilterId})`,
        } as CSSProperties
      }
      aria-hidden="true"
    >
      <span className="building-action-badge__idle">
        <span
          className={cn(
            "building-action-badge__glyph font-noto-symbols-2 inline-flex items-center justify-center",
            INSIGHT_TEXT_CLASS,
          )}
        >
          {glyph}
        </span>
      </span>
      <svg
        className={cn(
          "building-action-badge__svg",
          size === "sm"
            ? INSIGHT_BADGE_BLOB_ALIGN_CLASS_SM
            : INSIGHT_BADGE_BLOB_ALIGN_CLASS_LG,
        )}
        width="16"
        height="16"
        viewBox="0 0 100 100"
        focusable="false"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="55%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#1e40af" />
          </linearGradient>
          {/* Native SVG goo filter — mobile WebKit ignores CSS contrast/blur inside masks. */}
          <filter
            id={gooFilterId}
            x="-50%"
            y="-50%"
            width="200%"
            height="200%"
            colorInterpolationFilters="sRGB"
          >
            <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="blur" />
            <feColorMatrix
              in="blur"
              type="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7"
            >
              <animate
                attributeName="values"
                dur="1s"
                repeatCount="indefinite"
                calcMode="linear"
                keyTimes="0;0.2;0.4;0.6;1"
                values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7;1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 5 -2;1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 5 -2;1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7;1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7"
              />
            </feColorMatrix>
          </filter>
          <mask id={maskId}>
            <g
              className="building-action-badge__clip"
              filter={`url(#${gooFilterId})`}
            >
              <polygon points="0,0 100,0 100,100 0,100" fill="black" />
              <polygon
                className="building-action-badge__triangle building-action-badge__triangle--one"
                points="25,25 75,25 50,75"
                fill="white"
              />
              <polygon
                className="building-action-badge__triangle building-action-badge__triangle--two"
                points="50,25 75,75 25,75"
                fill="white"
              />
              <polygon
                className="building-action-badge__triangle building-action-badge__triangle--three"
                points="35,35 65,35 50,65"
                fill="white"
              />
              <polygon
                className="building-action-badge__triangle building-action-badge__triangle--four"
                points="35,35 65,35 50,65"
                fill="white"
              />
              <polygon
                className="building-action-badge__triangle building-action-badge__triangle--five"
                points="35,35 65,35 50,65"
                fill="white"
              />
              <polygon
                className="building-action-badge__triangle building-action-badge__triangle--six"
                points="35,35 65,35 50,65"
                fill="white"
              />
            </g>
          </mask>
        </defs>
        <circle
          cx="50"
          cy="50"
          r="50"
          fill={`url(#${gradientId})`}
          mask={`url(#${maskId})`}
        />
      </svg>
    </span>
  );
}
