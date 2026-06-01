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

const BADGE_SIZE_PX = 16;

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
        tooltip={
          <span className={canAfford ? "" : "text-red-400"}>{costTooltip}</span>
        }
        tooltipId={`${actionId}-insight-badge`}
        className="block h-full w-full"
        tooltipTriggerAsChild
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
