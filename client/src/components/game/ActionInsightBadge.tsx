"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  BuildingActionBadge,
  getInsightBadgeTriggerClassName,
  INSIGHT_BADGE_TOOLTIP_TRIGGER_CLASS,
  INSIGHT_BADGE_TOOLTIP_TRIGGER_OVERLAY_CLASS,
} from "@/components/game/BuildingActionBadge";
import { TooltipWrapper } from "@/components/game/TooltipWrapper";
import {
  canRevealEffects,
  getInsightRevealCost,
  TIMED_EVENT_INSIGHT_PROLONG_KEY,
  TIMED_EVENT_TAB_PROLONG_INSIGHT_COST,
  TIMED_EVENT_TAB_PROLONG_MS,
} from "@/game/rules/insightReveal";
import {
  getTimedEventTabEffectiveRemainingMs,
  useGameStore,
} from "@/game/state";
import { useDerivedGameState } from "@/game/useGameStoreWithoutTickClock";
import { formatTooltipResourceName } from "@/i18n/tooltipLabels";
import { cn } from "@/lib/utils";

const PROLONG_MINUTES = TIMED_EVENT_TAB_PROLONG_MS / 60_000;

type ActionInsightBadgeProps =
  | { target?: "action"; actionId: string; layout?: "overlay" }
  | {
    target: "timedEvent";
    layout?: "inline";
    timeRemainingMs: number;
  };

export function ActionInsightBadge(props: ActionInsightBadgeProps) {
  const target = props.target ?? "action";
  const layout =
    props.layout ?? (target === "timedEvent" ? "inline" : "overlay");
  const actionId = target === "action" ? props.actionId : undefined;
  const timeRemainingMs =
    target === "timedEvent" ? props.timeRemainingMs : 0;

  const { t, i18n } = useTranslation(["ui", "common"]);
  const clerksHut = useGameStore((s) => s.buildings.clerksHut ?? 0);
  const insight = useGameStore((s) => s.resources.insight ?? 0);
  const timedTabActive = useGameStore((s) => s.timedEventTab.isActive);
  const insightProlongUsed = useGameStore(
    (s) => s.timedEventTab.insightProlongUsed ?? false,
  );
  const insightRevealEnd = useGameStore((s) =>
    target === "timedEvent"
      ? s.insightRevealing?.[TIMED_EVENT_INSIGHT_PROLONG_KEY]
      : actionId
        ? s.insightRevealing?.[actionId]
        : undefined,
  );
  const revealActionEffects = useGameStore((s) => s.revealActionEffects);
  const prolongTimedEventTab = useGameStore((s) => s.prolongTimedEventTab);
  const setHighlightedResources = useGameStore((s) => s.setHighlightedResources);
  const executionStart = useGameStore((s) =>
    actionId ? (s.executionStartTimes?.[actionId] ?? 0) : 0,
  );
  const executionDuration = useGameStore((s) =>
    actionId ? (s.executionDurations?.[actionId] ?? 0) : 0,
  );
  const canShowActionReveal = useDerivedGameState((s) =>
    actionId ? canRevealEffects(actionId, s) : false,
  );
  const actionRevealCost = useDerivedGameState((s) =>
    actionId ? (getInsightRevealCost(actionId, s) ?? 0) : 0,
  );
  const [, forceUpdate] = useState(0);

  const isTimedEvent = target === "timedEvent";
  const isInsightRevealAnimating =
    typeof insightRevealEnd === "number" && insightRevealEnd > Date.now();

  const effectiveTimedRemaining = isTimedEvent
    ? getTimedEventTabEffectiveRemainingMs(useGameStore.getState())
    : null;
  const timedTimerUsable =
    isTimedEvent &&
    timeRemainingMs > 0 &&
    effectiveTimedRemaining != null &&
    effectiveTimedRemaining > 0;

  const insightUnlocked = clerksHut >= 1;
  const canShow = isTimedEvent
    ? insightUnlocked &&
    timedTabActive &&
    (!insightProlongUsed || isInsightRevealAnimating)
    : canShowActionReveal;
  const isExecuting = target === "action" && executionStart > 0 && executionDuration > 0;
  const isRevealing = isInsightRevealAnimating;
  const playing = canShow && !isExecuting && isRevealing;

  // Once the reveal animation has started, we must never fall back to the idle
  // triangle: when the animation timer ends, `playing` flips to false a moment
  // before the store marks the effect as revealed (which unmounts this badge).
  // That race briefly re-shows the idle glyph; suppress it.
  const revealStartedRef = useRef(false);
  useEffect(() => {
    if (isRevealing) revealStartedRef.current = true;
  }, [isRevealing]);

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

  const cost = isTimedEvent
    ? TIMED_EVENT_TAB_PROLONG_INSIGHT_COST
    : actionId
      ? actionRevealCost
      : 0;

  const insightResource = formatTooltipResourceName("insight");
  // Resolve via the reactive `t` (same pattern as the other timed-event tooltips in
  // TimedEventPanel, e.g. `t("ui:timedEvent.buy")`) so the active locale is always used.
  // English defaultValue is only a safety net for missing keys.
  const costTooltip = useMemo(
    () =>
      isTimedEvent
        ? t("ui:timedEvent.prolongForInsight", {
          defaultValue:
            "Extend time by {{minutes}} min for {{cost}} {{resource}}",
          minutes: PROLONG_MINUTES,
          cost,
          resource: insightResource,
        })
        : t("ui:badges.insightRevealSeeEffects", {
          defaultValue: "See effects for {{cost}} {{resource}}",
          cost,
          resource: insightResource,
        }),
    [t, i18n.language, isTimedEvent, cost, insightResource],
  );

  if (!canShow || isExecuting) return null;
  // Reveal animation finished but the store hasn't unmounted us yet - hide
  // rather than flash the idle triangle for a frame.
  if (revealStartedRef.current && !isRevealing) return null;

  const canAfford = isTimedEvent
    ? insightUnlocked &&
    timedTabActive &&
    !insightProlongUsed &&
    (effectiveTimedRemaining ?? 0) > 0 &&
    insight >= TIMED_EVENT_TAB_PROLONG_INSIGHT_COST
    : insight >= cost;

  const isBadgeDisabled = isTimedEvent
    ? !timedTimerUsable || !canAfford || playing
    : !canAfford || playing;

  const canAffordForDisplay = isTimedEvent
    ? timedTimerUsable && canAfford
    : canAfford;

  const tooltipId = isTimedEvent
    ? "timed-event-insight-prolong"
    : `${actionId}-insight-badge`;

  const handleClick = () => {
    if (isBadgeDisabled) return;
    if (isTimedEvent) {
      if (!prolongTimedEventTab()) {
        forceUpdate((n) => n + 1);
      }
      return;
    }
    revealActionEffects(actionId!);
  };

  const triggerSizeClass =
    layout === "overlay" ? "flex h-full w-full" : "h-5 w-5";

  const canAffordForTrigger = canAffordForDisplay || playing;

  const badgeButton = (
    <button
      type="button"
      className={getInsightBadgeTriggerClassName({
        canAfford: canAffordForTrigger,
        playing,
        className: triggerSizeClass,
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

  const badgeTooltip = (
    <TooltipWrapper
      tooltip={costTooltip}
      tooltipId={tooltipId}
      tooltipContentClassName="text-white"
      className={
        layout === "overlay"
          ? "block h-full w-full"
          : "inline-flex items-center"
      }
      tooltipTriggerAsChild={layout === "overlay"}
      tooltipTriggerClassName={
        layout === "overlay"
          ? INSIGHT_BADGE_TOOLTIP_TRIGGER_OVERLAY_CLASS
          : INSIGHT_BADGE_TOOLTIP_TRIGGER_CLASS
      }
      disabled={isBadgeDisabled}
      onMouseEnter={() => setHighlightedResources(["insight"])}
      onMouseLeave={() => {
        if (!playing) setHighlightedResources([]);
      }}
    >
      {badgeButton}
    </TooltipWrapper>
  );

  if (layout === "overlay") {
    return (
      <div
        className="action-button-corner-badge action-button-corner-badge--insight inline-flex shrink-0 items-center self-center"
        onPointerDown={(e) => e.stopPropagation()}
      >
        {badgeTooltip}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "inline-flex shrink-0 items-center self-center",
        isTimedEvent && "ml-0.5",
      )}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {badgeTooltip}
    </div>
  );
}
