import { useId } from "react";
import { INSIGHT_TEXT_CLASS } from "@/game/villagerCapUpgrades";
import { cn } from "@/lib/utils";

type BuildingActionBadgeProps = {
  /** Force the hover animation (e.g. during Insight reveal cooldown). */
  playing?: boolean;
  /** When true, badge fills its parent instead of self-anchoring with absolute CSS. */
  embedded?: boolean;
  /** `sm` = side-panel building row; `lg` = action overlays and header badges. */
  size?: "sm" | "lg";
};

export function BuildingActionBadge({
  playing = false,
  embedded = false,
  size = "lg",
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
        <svg
          className={cn("building-action-badge__idle-triangle", INSIGHT_TEXT_CLASS)}
          viewBox="0 0 100 100"
          focusable="false"
          aria-hidden="true"
        >
          <polygon points="50,14 86,70 14,70" fill="currentColor" />
        </svg>
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
