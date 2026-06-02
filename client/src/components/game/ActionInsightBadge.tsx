"use client";

import { useEffect } from "react";
import { BuildingActionBadge } from "@/components/game/BuildingActionBadge";
import { TooltipWrapper } from "@/components/game/TooltipWrapper";
import {
  canRevealEffects,
  getInsightAmount,
  getInsightRevealCost,
  isInsightRevealInProgress,
} from "@/game/rules/insightReveal";
import { useGameStore } from "@/game/state";
import {
  formatTooltipResourceName,
  getUiTooltip,
} from "@/i18n/tooltipLabels";
import type { GameState } from "@shared/schema";

const BADGE_SIZE_PX = 16;

type ActionInsightBadgeProps = {
  actionId: string;
  state: GameState;
};

export function ActionInsightBadge({ actionId, state }: ActionInsightBadgeProps) {
  const insightRevealing = useGameStore((s) => s.insightRevealing);
  const revealActionEffects = useGameStore((s) => s.revealActionEffects);
  const setHighlightedResources = useGameStore((s) => s.setHighlightedResources);

  if (!canRevealEffects(actionId, state)) return null;

  const cost = getInsightRevealCost(actionId) ?? 0;
  const insight = getInsightAmount(state);
  const canAfford = insight >= cost;
  const playing = isInsightRevealInProgress(actionId, insightRevealing);

  useEffect(() => {
    if (!playing) return;
    setHighlightedResources(["insight"]);
    return () => setHighlightedResources([]);
  }, [playing, setHighlightedResources]);

  const costTooltip = getUiTooltip(
    "buildings.insightRevealSeeEffects",
    "See effects for {{cost}} {{resource}}",
    { cost, resource: formatTooltipResourceName("insight") },
  );

  return (
    <div
      className={!canAfford ? "opacity-40" : undefined}
      style={{
        position: "absolute",
        bottom: "-7px",
        right: "-7px",
        width: BADGE_SIZE_PX,
        height: BADGE_SIZE_PX,
        zIndex: 30,
        pointerEvents: "auto",
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <TooltipWrapper
        tooltip={costTooltip}
        tooltipId={`${actionId}-insight-badge`}
        tooltipContentClassName="text-white"
        className="block h-full w-full"
        tooltipTriggerAsChild
        onMouseEnter={() => setHighlightedResources(["insight"])}
        onMouseLeave={() => {
          if (!playing) setHighlightedResources([]);
        }}
      >
        <button
          type="button"
          className="relative flex h-full w-full items-center justify-center border-0 bg-transparent p-0 cursor-pointer disabled:cursor-not-allowed enabled:cursor-pointer"
          aria-label={costTooltip}
          aria-busy={playing}
          disabled={!canAfford}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            if (canAfford && !playing) revealActionEffects(actionId);
          }}
        >
          <BuildingActionBadge playing={playing} embedded />
        </button>
      </TooltipWrapper>
    </div>
  );
}
