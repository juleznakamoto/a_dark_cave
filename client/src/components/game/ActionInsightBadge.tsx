"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { BuildingActionBadge } from "@/components/game/BuildingActionBadge";
import { TooltipWrapper } from "@/components/game/TooltipWrapper";
import {
  canRevealEffects,
  canRevealStatEffects,
  getInsightAmount,
  getInsightRevealCost,
  isStatEffectsRevealed,
  STAT_EFFECTS_INSIGHT_COST,
} from "@/game/rules/insightReveal";
import { useGameStore } from "@/game/state";
import { formatTooltipResourceName } from "@/i18n/tooltipLabels";
import { cn } from "@/lib/utils";
import type { GameState } from "@shared/schema";

const BADGE_SIZE_PX = 16;
const STAT_EFFECT_PULSE_IDS = ["luck", "strength", "knowledge", "madness"] as const;

type ActionInsightBadgeProps =
  | { target: "stats"; layout?: "inline" }
  | { target?: "action"; actionId: string; layout?: "overlay" };

export function ActionInsightBadge(props: ActionInsightBadgeProps) {
  const target = props.target ?? "action";
  const layout = props.layout ?? (target === "stats" ? "inline" : "overlay");
  const actionId = target === "action" ? props.actionId : undefined;

  const { t } = useTranslation("ui");
  const state = useGameStore((s) => s as unknown as GameState);
  const insightRevealEnd = useGameStore((s) =>
    actionId ? s.insightRevealing?.[actionId] : undefined,
  );
  const revealActionEffects = useGameStore((s) => s.revealActionEffects);
  const revealStatEffects = useGameStore((s) => s.revealStatEffects);
  const setHighlightedResources = useGameStore((s) => s.setHighlightedResources);
  const setHoveredTooltip = useGameStore((s) => s.setHoveredTooltip);
  const executionStart = useGameStore((s) =>
    actionId ? (s.executionStartTimes?.[actionId] ?? 0) : 0,
  );
  const executionDuration = useGameStore((s) =>
    actionId ? (s.executionDurations?.[actionId] ?? 0) : 0,
  );
  const [, forceUpdate] = useState(0);

  const isStats = target === "stats";
  const canShow = isStats
    ? (state.buildings.clerksHut ?? 0) >= 1 && !isStatEffectsRevealed(state)
    : canRevealEffects(actionId!, state);
  const isExecuting = !isStats && executionStart > 0 && executionDuration > 0;
  const isRevealing =
    !isStats &&
    typeof insightRevealEnd === "number" &&
    insightRevealEnd > Date.now();
  const playing = canShow && !isExecuting && isRevealing;

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

  if (!canShow || isExecuting) return null;

  const cost = isStats
    ? STAT_EFFECTS_INSIGHT_COST
    : (getInsightRevealCost(actionId!) ?? 0);
  const canAfford = isStats
    ? canRevealStatEffects(state)
    : getInsightAmount(state) >= cost;

  const costTooltip = t("badges.insightRevealSeeEffects", {
    cost,
    resource: formatTooltipResourceName("insight"),
  });

  const isBadgeDisabled = !canAfford || playing;
  const tooltipId = isStats
    ? "stats-insight-reveal"
    : `${actionId}-insight-badge`;

  const handleReveal = () => {
    if (isBadgeDisabled) return;
    if (isStats) {
      if (!revealStatEffects()) return;
      for (const statId of STAT_EFFECT_PULSE_IDS) {
        setHoveredTooltip(statId, false);
      }
      return;
    }
    revealActionEffects(actionId!);
  };

  const hostClassName = cn(
    !canAfford && !playing && "opacity-40",
    layout === "inline" && "inline-flex shrink-0 items-center self-center",
  );
  const hostStyle =
    layout === "overlay"
      ? {
        position: "absolute" as const,
        bottom: "-7px",
        right: "-7px",
        width: BADGE_SIZE_PX,
        height: BADGE_SIZE_PX,
        zIndex: 30,
        pointerEvents: "auto" as const,
      }
      : undefined;

  return (
    <div
      className={hostClassName}
      style={hostStyle}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <TooltipWrapper
        tooltip={costTooltip}
        tooltipId={tooltipId}
        tooltipContentClassName="text-white"
        className={
          layout === "overlay"
            ? "block h-full w-full"
            : "inline-flex items-center"
        }
        tooltipTriggerAsChild
        disabled={isBadgeDisabled}
        onClick={handleReveal}
        onMouseEnter={() => setHighlightedResources(["insight"])}
        onMouseLeave={() => {
          if (!playing) setHighlightedResources([]);
        }}
      >
        <button
          type="button"
          className={cn(
            "relative items-center justify-center border-0 bg-transparent p-0 cursor-pointer disabled:cursor-not-allowed enabled:cursor-pointer",
            layout === "overlay"
              ? "flex h-full w-full"
              : "inline-flex h-4 w-4 shrink-0",
          )}
          aria-label={costTooltip}
          aria-busy={playing}
          disabled={isBadgeDisabled}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            handleReveal();
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
