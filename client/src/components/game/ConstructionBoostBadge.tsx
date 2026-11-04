"use client";

import { useUiTranslation } from "@/i18n/useUiTranslation";
import {
  BuildingActionBadge,
  getInsightBadgeTriggerClassName,
  INSIGHT_BADGE_TOOLTIP_TRIGGER_OVERLAY_CLASS,
} from "@/components/game/BuildingActionBadge";
import { TooltipWrapper } from "@/components/game/TooltipWrapper";
import {
  canBoostConstruction,
  getConstructionBoostCost,
  getConstructionBoostReductionSeconds,
  isConstructionBoostAvailable,
} from "@/game/constructionQueueSlots";
import { costBenefitTooltip } from "@/game/rules/tooltips";
import { useGameStore } from "@/game/state";
import { useDerivedGameState } from "@/game/useGameStoreWithoutTickClock";
import { cn, formatCompactDuration } from "@/lib/utils";
import { useUntilTimestamp } from "@/lib/uiClock";

/** Noto text double-triangle (U+23E9 + text VS). Do not use the ⏩ emoji form. */
export const CONSTRUCTION_BOOST_GLYPH = "\u23E9\uFE0E";

interface ConstructionBoostBadgeProps {
  actionId: string;
}

export function ConstructionBoostBadge({ actionId }: ConstructionBoostBadgeProps) {
  const { t } = useUiTranslation();
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
  const isExecuting = executionStart > 0 && executionDuration > 0;
  const finishTooltipAt =
    isExecuting && reductionSeconds > 0
      ? executionStart + (executionDuration - reductionSeconds) * 1000
      : null;
  const beforeFinishTooltip = useUntilTimestamp(finishTooltipAt);
  const finishesBuild = isExecuting && !beforeFinishTooltip;

  const insight = useGameStore((s) => s.resources.insight ?? 0);
  const savedTime = formatCompactDuration(reductionSeconds, "round");

  const isCraftAction = actionId.startsWith("craft");
  const benefit = finishesBuild
    ? t(
        isCraftAction ? "cave.craftingBoostFinish" : "village.constructionBoostFinish",
        {
          defaultValue: isCraftAction ? "Finish crafting" : "Finish construction",
        },
      )
    : t(isCraftAction ? "cave.craftingBoost" : "village.constructionBoost", {
        defaultValue: isCraftAction
          ? "Speed up crafting by {{time}}"
          : "Speed up construction by {{time}}",
        time: savedTime,
      });
  const { tooltip: costTooltip, label: costLabel } = costBenefitTooltip({
    amount: cost,
    available: insight,
    satisfied: insight >= cost,
    benefit,
  });

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
          aria-label={costLabel}
          disabled={!canAfford}
          data-testid={`construction-boost-${actionId}`}
          onClick={(e) => {
            e.stopPropagation();
            if (canAfford) boostConstruction(actionId);
            e.currentTarget.blur();
          }}
        >
          <BuildingActionBadge
            glyph={CONSTRUCTION_BOOST_GLYPH}
            embedded
            size="lg"
          />
        </button>
      </TooltipWrapper>
    </div>
  );
}
