"use client";

import { useEffect, useRef, useState } from "react";
import { useUiTranslation } from "@/i18n/useUiTranslation";
import {
  BuildingActionBadge,
  getInsightBadgeTriggerClassName,
  INSIGHT_BADGE_LG_SIZE_CLASS,
  INSIGHT_BADGE_TOOLTIP_TRIGGER_CLASS,
} from "@/components/game/BuildingActionBadge";
import { TooltipWrapper } from "@/components/game/TooltipWrapper";
import {
  TIMED_EVENT_INSIGHT_PROLONG_KEY,
  TIMED_EVENT_TAB_PROLONG_INSIGHT_COST,
  TIMED_EVENT_TAB_PROLONG_MS,
} from "@/game/rules/insightReveal";
import {
  getTimedEventTabEffectiveRemainingMs,
  useGameStore,
} from "@/game/state";
import { costBenefitTooltip } from "@/game/rules/tooltips";
import { useUntilTimestamp } from "@/lib/uiClock";

const PROLONG_MINUTES = TIMED_EVENT_TAB_PROLONG_MS / 60_000;

type ActionInsightBadgeProps = {
  timeRemainingMs: number;
};

export function ActionInsightBadge({ timeRemainingMs }: ActionInsightBadgeProps) {
  const { t } = useUiTranslation();
  const clerksHut = useGameStore((s) => s.buildings.clerksHut ?? 0);
  const insight = useGameStore((s) => s.resources.insight ?? 0);
  const timedTabActive = useGameStore((s) => s.timedEventTab.isActive);
  const insightProlongUsed = useGameStore(
    (s) => s.timedEventTab.insightProlongUsed ?? false,
  );
  const insightRevealEnd = useGameStore(
    (s) => s.insightRevealing?.[TIMED_EVENT_INSIGHT_PROLONG_KEY],
  );
  const prolongTimedEventTab = useGameStore((s) => s.prolongTimedEventTab);
  const setHighlightedResources = useGameStore((s) => s.setHighlightedResources);
  const [, forceUpdate] = useState(0);

  const isInsightRevealAnimating = useUntilTimestamp(insightRevealEnd);

  const effectiveTimedRemaining =
    getTimedEventTabEffectiveRemainingMs(useGameStore.getState());
  const timedTimerUsable =
    timeRemainingMs > 0 &&
    effectiveTimedRemaining != null &&
    effectiveTimedRemaining > 0;

  const insightUnlocked = clerksHut >= 1;
  const canShow =
    insightUnlocked &&
    timedTabActive &&
    (!insightProlongUsed || isInsightRevealAnimating);
  const playing = canShow && isInsightRevealAnimating;

  // Once the reveal animation has started, we must never fall back to the idle
  // triangle: when the animation timer ends, `playing` flips to false a moment
  // before the store marks the effect as revealed (which unmounts this badge).
  // That race briefly re-shows the idle glyph; suppress it.
  const revealStartedRef = useRef(false);
  useEffect(() => {
    if (isInsightRevealAnimating) revealStartedRef.current = true;
  }, [isInsightRevealAnimating]);

  useEffect(() => {
    if (!playing) return;
    setHighlightedResources(["insight"]);
    return () => setHighlightedResources([]);
  }, [playing, setHighlightedResources]);

  const prolong = costBenefitTooltip({
    amount: TIMED_EVENT_TAB_PROLONG_INSIGHT_COST,
    available: insight,
    satisfied: insight >= TIMED_EVENT_TAB_PROLONG_INSIGHT_COST,
    benefit: t("timedEvent.prolongForInsight", {
      defaultValue: "Extend time by {{minutes}} min",
      minutes: PROLONG_MINUTES,
    }),
  });

  if (!canShow) return null;
  if (revealStartedRef.current && !isInsightRevealAnimating) return null;

  const canAfford =
    insightUnlocked &&
    timedTabActive &&
    !insightProlongUsed &&
    (effectiveTimedRemaining ?? 0) > 0 &&
    insight >= TIMED_EVENT_TAB_PROLONG_INSIGHT_COST;

  const isBadgeDisabled = !timedTimerUsable || !canAfford || playing;
  const canAffordForDisplay = timedTimerUsable && canAfford;

  const handleClick = () => {
    if (isBadgeDisabled) return;
    if (!prolongTimedEventTab()) {
      forceUpdate((n) => n + 1);
    }
  };

  const canAffordForTrigger = canAffordForDisplay || playing;

  const badgeButton = (
    <button
      type="button"
      className={getInsightBadgeTriggerClassName({
        canAfford: canAffordForTrigger,
        playing,
        className: INSIGHT_BADGE_LG_SIZE_CLASS,
      })}
      aria-label={prolong.label}
      aria-busy={playing}
      disabled={isBadgeDisabled}
      onClick={(e) => {
        e.stopPropagation();
        handleClick();
      }}
    >
      <BuildingActionBadge embedded size="lg" />
    </button>
  );

  return (
    <div
      className="ml-0.5 inline-flex shrink-0 items-center self-center"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <TooltipWrapper
        tooltip={prolong.tooltip}
        tooltipId="timed-event-insight-prolong"
        tooltipContentClassName="text-white"
        className="inline-flex items-center"
        tooltipTriggerClassName={INSIGHT_BADGE_TOOLTIP_TRIGGER_CLASS}
        disabled={isBadgeDisabled}
        onMouseEnter={() => setHighlightedResources(["insight"])}
        onMouseLeave={() => {
          if (!playing) setHighlightedResources([]);
        }}
      >
        {badgeButton}
      </TooltipWrapper>
    </div>
  );
}
