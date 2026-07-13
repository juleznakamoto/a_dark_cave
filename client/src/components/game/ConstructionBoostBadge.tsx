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
import { formatTooltipResourceName } from "@/i18n/tooltipLabels";
import { cn, formatMinutesSeconds } from "@/lib/utils";
import type { GameState } from "@shared/schema";

const BADGE_SIZE_PX = 20;
const BOOST_GLYPH = "\u23E9";

interface ConstructionBoostBadgeProps {
  actionId: string;
}

export function ConstructionBoostBadge({ actionId }: ConstructionBoostBadgeProps) {
  const { t } = useTranslation("ui");
  const state = useGameStore((s) => s as unknown as GameState);
  const setHighlightedResources = useGameStore((s) => s.setHighlightedResources);
  const boostConstruction = useGameStore((s) => s.boostConstruction);
  const executionStart = useGameStore((s) =>
    s.executionStartTimes?.[actionId] ?? 0,
  );
  const executionDuration = useGameStore((s) =>
    s.executionDurations?.[actionId] ?? 0,
  );
  const constructionBoostsUsed = useGameStore(
    (s) => s.constructionBoostsUsed?.[actionId] === true,
  );
  const insight = useGameStore((s) => s.resources?.insight ?? 0);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!executionStart || !executionDuration) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [executionStart, executionDuration, actionId]);

  const liveState = useMemo(
    () =>
      ({
        ...state,
        executionStartTimes: {
          ...(state.executionStartTimes ?? {}),
          ...(executionStart ? { [actionId]: executionStart } : {}),
        },
        executionDurations: {
          ...(state.executionDurations ?? {}),
          ...(executionDuration ? { [actionId]: executionDuration } : {}),
        },
        constructionBoostsUsed: {
          ...(state.constructionBoostsUsed ?? {}),
          ...(constructionBoostsUsed ? { [actionId]: true } : {}),
        },
        resources: { ...state.resources, insight },
      }) as GameState,
    [
      state,
      actionId,
      executionStart,
      executionDuration,
      constructionBoostsUsed,
      insight,
    ],
  );

  const canShow = isConstructionBoostAvailable(liveState, actionId);
  const cost = getConstructionBoostCost(liveState, actionId);
  const reductionSeconds = getConstructionBoostReductionSeconds(
    liveState,
    actionId,
  );
  const savedTime = formatMinutesSeconds(reductionSeconds);
  const insightResource = formatTooltipResourceName("insight");
  const finishesBuild = constructionBoostWillFinishBuild(
    liveState,
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

  const canAfford = canBoostConstruction(liveState, actionId);

  return (
    <div
      style={{
        position: "absolute",
        top: "-9px",
        right: "-9px",
        width: BADGE_SIZE_PX,
        height: BADGE_SIZE_PX,
        zIndex: 30,
        pointerEvents: "auto",
      }}
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
