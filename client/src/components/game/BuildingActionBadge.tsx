import { useId } from "react";
import { INSIGHT_GLYPH, INSIGHT_TEXT_CLASS } from "@/game/villagerCapUpgrades";
import { cn } from "@/lib/utils";

/** Radix tooltip trigger wrapper — matches slot/header controls (not asChild). */
export const INSIGHT_BADGE_TOOLTIP_TRIGGER_CLASS =
  "inline-flex items-center leading-none";
/** Fills a fixed-size overlay host (action-button corner badges). */
export const INSIGHT_BADGE_TOOLTIP_TRIGGER_OVERLAY_CLASS =
  "flex h-full w-full items-center leading-none";
/**
 * Side-panel row badges (cap upgrade, enchant). 24px at Small; sized in CSS
 * with `--adc-control-scale` (same mild bump as buttons).
 */
export const INSIGHT_BADGE_SIDE_PANEL_SIZE_CLASS =
  "insight-action-badge-trigger--side-panel";
/** Village jobs, timed-tab, achievements. Same 24px Small base as side-panel. */
export const INSIGHT_BADGE_LG_SIZE_CLASS = "insight-action-badge-trigger--lg";

/** Shared insight badge button: single-layer opacity (no nested badge opacity). */
export function getInsightBadgeTriggerClassName({
  canAfford,
  playing,
  suppressHover = false,
  className,
}: {
  canAfford: boolean;
  playing: boolean;
  suppressHover?: boolean;
  className?: string;
}) {
  return cn(
    // overflow-visible: new-item-pulse / glyph drop-shadow / blob blur must not clip
    "insight-action-badge-trigger relative inline-flex shrink-0 items-center justify-center overflow-visible border-0 bg-transparent p-0 leading-none min-h-0 min-w-0 appearance-none [-webkit-appearance:none] outline-none transition-opacity duration-200 enabled:cursor-pointer disabled:cursor-default",
    className,
    playing && "insight-action-badge-trigger--playing opacity-100",
    !playing &&
      suppressHover &&
      "insight-action-badge-trigger--suppress-hover",
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
  /**
   * Dev/demo only: use the iOS SVG-filter goo path even on desktop
   * (same path WKWebView gets under @supports (-webkit-touch-callout: none)).
   */
  forceIosGoo?: boolean;
};

const GOOEY_TRIANGLES = [
  { mod: "one", points: "25,25 75,25 50,75" },
  { mod: "two", points: "50,25 75,75 25,75" },
  { mod: "three", points: "35,35 65,35 50,65" },
  { mod: "four", points: "28,38 53,38 40,60" },
  { mod: "five", points: "47,38 72,38 60,60" },
  { mod: "six", points: "40,45 60,45 50,68" },
] as const;

/** Triangles for the gooey mask (white) or iOS SVG-filter layer (blue). */
function GooeyTriangles({ fill }: { fill: string }) {
  return (
    <>
      {GOOEY_TRIANGLES.map(({ mod, points }) => (
        <polygon
          key={mod}
          className={`building-action-badge__triangle building-action-badge__triangle--${mod}`}
          points={points}
          fill={fill}
        />
      ))}
    </>
  );
}

/**
 * userSpaceOnUse blur in a 100×100 viewBox. Tuned against the desktop CSS
 * path on /dev/animations#insight-badge. Wide region for Safari.
 */
const IOS_GOO_STD_DEVIATION = 10;

export function BuildingActionBadge({
  playing = false,
  embedded = false,
  size = "lg",
  glyph = INSIGHT_GLYPH,
  forceIosGoo = false,
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
        forceIosGoo && "building-action-badge--ios-goo",
      )}
      aria-hidden="true"
    >
      {/* Idle: Insight glyph only. No disc, no gooey layer. */}
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
        className="building-action-badge__svg"
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
          {/*
            iOS/WKWebView: CSS blur+contrast on SVG mask children is ignored.
            Same triangles + SVG goo filter (outside a mask) + blue composite.
          */}
          <filter
            id={gooFilterId}
            x="-100%"
            y="-100%"
            width="300%"
            height="300%"
            filterUnits="userSpaceOnUse"
            colorInterpolationFilters="sRGB"
          >
            <feGaussianBlur
              in="SourceGraphic"
              stdDeviation={IOS_GOO_STD_DEVIATION}
              result="blur"
            />
            <feColorMatrix
              in="blur"
              type="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7"
            />
          </filter>
          <mask id={maskId}>
            <g className="building-action-badge__clip">
              <polygon points="0,0 100,0 100,100 0,100" fill="black" />
              <GooeyTriangles fill="white" />
            </g>
          </mask>
        </defs>
        {/* Desktop: CSS blur+contrast inside the mask. */}
        <circle
          className="building-action-badge__desktop-goo"
          cx="50"
          cy="50"
          r="50"
          fill={`url(#${gradientId})`}
          mask={`url(#${maskId})`}
        />
        {/*
          iOS: same triangles + SVG goo filter. No __clip class — CSS filter on
          that class would override the SVG filter= attribute in WebKit/Blink.
        */}
        <g
          className="building-action-badge__ios-goo"
          filter={`url(#${gooFilterId})`}
        >
          <GooeyTriangles fill="#2563eb" />
        </g>
      </svg>
    </span>
  );
}
