"use client";

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

  const costTooltip = getUiTooltip(
    "insightRevealSeeEffects",
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
        onMouseLeave={() => setHighlightedResources([])}
      >
        <button
          type="button"
          className="relative flex h-full w-full items-center justify-center border-0 bg-transparent p-0 cursor-pointer disabled:cursor-not-allowed"
          aria-label={costTooltip}
          disabled={!canAfford || playing}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            if (canAfford) revealActionEffects(actionId);
          }}
        >
          <BuildingActionBadge playing={playing} embedded />
        </button>
      </TooltipWrapper>
    </div>
  );
}
