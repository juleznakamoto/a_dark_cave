"use client";

import { useEffect, useState } from "react";
import { BuildingActionBadge } from "@/components/game/BuildingActionBadge";
import { TooltipWrapper } from "@/components/game/TooltipWrapper";
import {
  canRevealEffects,
  getInsightAmount,
  getInsightRevealCost,
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
};

export function ActionInsightBadge({ actionId }: ActionInsightBadgeProps) {
  const state = useGameStore((s) => s as unknown as GameState);
  const insightRevealEnd = useGameStore((s) => s.insightRevealing?.[actionId]);
  const revealActionEffects = useGameStore((s) => s.revealActionEffects);
  const setHighlightedResources = useGameStore((s) => s.setHighlightedResources);
  const executionStart = useGameStore((s) => s.executionStartTimes?.[actionId] ?? 0);
  const executionDuration = useGameStore((s) => s.executionDurations?.[actionId] ?? 0);
  const [, forceUpdate] = useState(0);

  const canShow = canRevealEffects(actionId, state);
  const isExecuting = executionStart > 0 && executionDuration > 0;
  const isRevealing =
    typeof insightRevealEnd === "number" && insightRevealEnd > Date.now();
  const playing = canShow && !isExecuting && isRevealing;

  // Match CooldownButton insight overlay: tick so --playing stays in sync until reveal ends.
  useEffect(() => {
    if (!isRevealing) return;
    const id = setInterval(() => forceUpdate((n) => n + 1), 100);
    return () => clearInterval(id);
  }, [isRevealing, insightRevealEnd]);

  useEffect(() => {
    if (!playing) return;
    setHighlightedResources(["insight"]);
    return () => setHighlightedResources([]);
  }, [playing, setHighlightedResources]);

  // Abort overlay (craft/build) shares this corner — hide while the action runs.
  if (!canShow || isExecuting) return null;

  const cost = getInsightRevealCost(actionId) ?? 0;
  const insight = getInsightAmount(state);
  const canAfford = insight >= cost;

  const costTooltip = getUiTooltip(
    "buildings.insightRevealSeeEffects",
    "See effects for {{cost}} {{resource}}",
    { cost, resource: formatTooltipResourceName("insight") },
  );

  return (
    <div
      className={!canAfford && !playing ? "opacity-40" : undefined}
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
          disabled={!canAfford || playing}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            if (canAfford && !playing) revealActionEffects(actionId);
          }}
        >
          <BuildingActionBadge
            key={playing ? "reveal" : "idle"}
            playing={playing}
            embedded
          />
        </button>
      </TooltipWrapper>
    </div>
  );
}
