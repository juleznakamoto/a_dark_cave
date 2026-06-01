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
import { getUiTooltip } from "@/i18n/tooltipLabels";
import type { GameState } from "@shared/schema";

type ActionInsightBadgeProps = {
  actionId: string;
  state: GameState;
};

export function ActionInsightBadge({ actionId, state }: ActionInsightBadgeProps) {
  const insightRevealing = useGameStore((s) => s.insightRevealing);
  const revealActionEffects = useGameStore((s) => s.revealActionEffects);

  if (!canRevealEffects(actionId, state)) return null;

  const cost = getInsightRevealCost(actionId) ?? 0;
  const insight = getInsightAmount(state);
  const canAfford = insight >= cost;
  const playing = isInsightRevealInProgress(actionId, insightRevealing);

  const costTooltip = getUiTooltip(
    "insightRevealCost",
    "{{cost}} Insight",
    { cost },
  );

  return (
    <div
      className={`absolute bottom-[-10px] right-[-7px] z-[30] pointer-events-auto ${!canAfford ? "opacity-40" : ""}`}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <TooltipWrapper
        tooltip={
          <span className={canAfford ? "" : "text-red-400"}>{costTooltip}</span>
        }
        tooltipId={`${actionId}-insight-badge`}
        className="inline-flex"
      >
        <button
          type="button"
          className="inline-flex border-0 bg-transparent p-0 cursor-pointer disabled:cursor-not-allowed"
          aria-label={costTooltip}
          disabled={!canAfford || playing}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            if (canAfford) revealActionEffects(actionId);
          }}
        >
          <BuildingActionBadge playing={playing} />
        </button>
      </TooltipWrapper>
    </div>
  );
}
