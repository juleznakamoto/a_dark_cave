"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  BuildingActionBadge,
  getInsightBadgeTriggerClassName,
  INSIGHT_BADGE_TOOLTIP_TRIGGER_OVERLAY_CLASS,
} from "@/components/game/BuildingActionBadge";
import { TooltipWrapper } from "@/components/game/TooltipWrapper";
import {
  canBoostConstruction,
  constructionBoostWillFinishBuild,
  getConstructionBoostCost,
  getConstructionBoostReductionSeconds,
  isConstructionBoostAvailable,
} from "@/game/constructionQueueSlots";
import { useGameStore } from "@/game/state";
import { useDerivedGameState } from "@/game/useGameStoreWithoutTickClock";
import { formatTooltipResourceName } from "@/i18n/tooltipLabels";
import { cn, formatCompactDuration } from "@/lib/utils";

const BOOST_GLYPH = "\u23E9";

interface ConstructionBoostBadgeProps {
  actionId: string;
}

export function ConstructionBoostBadge({ actionId }: ConstructionBoostBadgeProps) {
  const { t } = useTranslation("ui");
  const setHighlightedResources = useGameStore((s) => s.setHighlightedResources);
  const boostConstruction = useGameStore((s) => s.boostConstruction);
  const executionStart = useGameStore((s) =>
    s.executionStartTimes?.[actionId] ?? 0,
  );
  const executionDuration = useGameStore((s) =>
    s.executionDurations?.[actionId] ?? 0,
  );
  const canShow = useDerivedGameState((s) =>
    isConstructionBoostAvailable(s, actionId),
  );
  const cost = useDerivedGameState((s) =>
    getConstructionBoostCost(
      {
        executionDurations:
          (s as { executionDurations?: Record<string, number> })
            .executionDurations ?? {},
      },
      actionId,
    ),
  );
  const reductionSeconds = useDerivedGameState((s) =>
    getConstructionBoostReductionSeconds(
      {
        executionDurations:
          (s as { executionDurations?: Record<string, number> })
            .executionDurations ?? {},
      },
      actionId,
    ),
  );
  const canAfford = useDerivedGameState((s) =>
    canBoostConstruction(s, actionId),
  );
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!executionStart || !executionDuration) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [executionStart, executionDuration, actionId]);

  const savedTime = formatCompactDuration(reductionSeconds, "round");
  const insightResource = formatTooltipResourceName("insight");
  const finishesBuild = constructionBoostWillFinishBuild(
    {
      executionStartTimes: { [actionId]: executionStart },
      executionDurations: { [actionId]: executionDuration },
    },
    actionId,
    now,
  );

  const isCraftAction = actionId.startsWith("craft");
  const costTooltip = useMemo(
    () =>
      finishesBuild
        ? t(isCraftAction ? "cave.craftingBoostFinish" : "village.constructionBoostFinish", {
          defaultValue: isCraftAction
            ? "Finish crafting for {{cost}} {{resource}}"
            : "Finish construction for {{cost}} {{resource}}",
          cost,
          resource: insightResource,
        })
        : t(isCraftAction ? "cave.craftingBoost" : "village.constructionBoost", {
          defaultValue: isCraftAction
            ? "Speed up crafting by {{time}} for {{cost}} {{resource}}"
            : "Speed up construction by {{time}} for {{cost}} {{resource}}",
          time: savedTime,
          cost,
          resource: insightResource,
        }),
    [t, isCraftAction, finishesBuild, savedTime, cost, insightResource],
  );

  if (!canShow) return null;

  return (
    <div
      className="action-button-corner-badge action-button-corner-badge--boost"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <TooltipWrapper
        tooltip={costTooltip}
        tooltipId={`${actionId}-construction-boost`}
        tooltipContentClassName="text-white"
        className="block h-full w-full"
        tooltipTriggerAsChild
        tooltipTriggerClassName={INSIGHT_BADGE_TOOLTIP_TRIGGER_OVERLAY_CLASS}
        disabled={!canAfford}
        onMouseEnter={() => setHighlightedResources(["insight"])}
        onMouseLeave={() => setHighlightedResources([])}
      >
        <button
          type="button"
          className={cn(
            getInsightBadgeTriggerClassName({
              canAfford,
              playing: false,
              className: "flex h-full w-full",
            }),
          )}
          aria-label={costTooltip}
          disabled={!canAfford}
          data-testid={`construction-boost-${actionId}`}
          onClick={(e) => {
            e.stopPropagation();
            if (canAfford) boostConstruction(actionId);
            e.currentTarget.blur();
          }}
        >
          <BuildingActionBadge
            glyph={BOOST_GLYPH}
            embedded
            size="lg"
          />
        </button>
      </TooltipWrapper>
    </div>
  );
}
