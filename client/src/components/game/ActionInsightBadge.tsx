"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  BuildingActionBadge,
  getInsightBadgeTriggerClassName,
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
import { formatTooltipResourceName } from "@/i18n/tooltipLabels";

const PROLONG_MINUTES = TIMED_EVENT_TAB_PROLONG_MS / 60_000;

type ActionInsightBadgeProps = {
  timeRemainingMs: number;
};

export function ActionInsightBadge({ timeRemainingMs }: ActionInsightBadgeProps) {
  const { t, i18n } = useTranslation(["ui", "common"]);
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

  const isInsightRevealAnimating =
    typeof insightRevealEnd === "number" && insightRevealEnd > Date.now();

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
    if (!isInsightRevealAnimating) return;
    const id = setInterval(() => forceUpdate((n) => n + 1), 100);
    return () => clearInterval(id);
  }, [isInsightRevealAnimating, insightRevealEnd]);

  useEffect(() => {
    if (!playing) return;
    setHighlightedResources(["insight"]);
    return () => setHighlightedResources([]);
  }, [playing, setHighlightedResources]);

  const insightResource = formatTooltipResourceName("insight");
  const costTooltip = useMemo(
    () =>
      t("ui:timedEvent.prolongForInsight", {
        defaultValue:
          "Extend time by {{minutes}} min for {{cost}} {{resource}}",
        minutes: PROLONG_MINUTES,
        cost: TIMED_EVENT_TAB_PROLONG_INSIGHT_COST,
        resource: insightResource,
      }),
    [t, i18n.language, insightResource],
  );

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
        className: "h-5 w-5",
      })}
      aria-label={costTooltip}
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
        tooltip={costTooltip}
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
