import { useId } from "react";
import { INSIGHT_GLYPH, INSIGHT_TEXT_CLASS } from "@/game/villagerCapUpgrades";
import { cn } from "@/lib/utils";

/** Radix tooltip trigger wrapper — matches slot/header controls (not asChild). */
export const INSIGHT_BADGE_TOOLTIP_TRIGGER_CLASS =
  "inline-flex items-center leading-none";
/** Fills a fixed-size overlay host (action-button corner badges). */
export const INSIGHT_BADGE_TOOLTIP_TRIGGER_OVERLAY_CLASS =
  "flex h-full w-full items-center leading-none";

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
    "insight-action-badge-trigger relative inline-flex shrink-0 items-center justify-center overflow-hidden border-0 bg-transparent p-0 leading-none min-h-0 min-w-0 transition-opacity duration-200 enabled:cursor-pointer disabled:cursor-default",
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
          <mask id={maskId}>
            <g className="building-action-badge__clip">
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
                points="28,38 53,38 40,60"
                fill="white"
              />
              <polygon
                className="building-action-badge__triangle building-action-badge__triangle--five"
                points="47,38 72,38 60,60"
                fill="white"
              />
              <polygon
                className="building-action-badge__triangle building-action-badge__triangle--six"
                points="40,45 60,45 50,68"
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