"use client";

import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  BuildingActionBadge,
  getInsightBadgeTriggerClassName,
} from "@/components/game/BuildingActionBadge";
import { TooltipWrapper } from "@/components/game/TooltipWrapper";
import {
  canBoostConstruction,
  getConstructionBoostCost,
  getConstructionBoostReductionSeconds,
} from "@/game/constructionQueueSlots";
import { useGameStore } from "@/game/state";
import { formatTooltipResourceName } from "@/i18n/tooltipLabels";
import { cn } from "@/lib/utils";
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

  const canShow = canBoostConstruction(liveState, actionId);
  const cost = getConstructionBoostCost(liveState, actionId);
  const reductionSeconds = getConstructionBoostReductionSeconds(
    liveState,
    actionId,
  );
  const savedMinutes = Math.round((reductionSeconds / 60) * 10) / 10;
  const insightResource = formatTooltipResourceName("insight");

  const costTooltip = useMemo(
    () =>
      t("village.constructionBoost", {
        defaultValue:
          "Speed up construction by {{minutes}} min for {{cost}} {{resource}}",
        minutes: savedMinutes,
        cost,
        resource: insightResource,
      }),
    [t, savedMinutes, cost, insightResource],
  );

  if (!canShow) return null;

  const canAfford = insight >= cost;

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
        disabled={!canAfford}
        onClick={() => {
          if (canAfford) boostConstruction(actionId);
        }}
        onMouseEnter={() => setHighlightedResources(["insight"])}
        onMouseLeave={() => setHighlightedResources([])}
      >
        <button
          type="button"
          className={cn(
            getInsightBadgeTriggerClassName({
              canAfford,
              playing: false,
              className:
                "flex h-full w-full cursor-pointer disabled:cursor-not-allowed enabled:cursor-pointer",
            }),
          )}
          aria-label={costTooltip}
          disabled={!canAfford}
          data-testid={`construction-boost-${actionId}`}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            if (canAfford) boostConstruction(actionId);
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
