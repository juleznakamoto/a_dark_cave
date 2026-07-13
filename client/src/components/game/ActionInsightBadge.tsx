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
  canProlongTimedEventTab,
  canRevealEffects,
  canRevealBuildingDescriptions,
  canRevealCraftDescriptions,
  getInsightAmount,
  getInsightRevealCost,
  isInsightUnlocked,
  isBuildingDescriptionsRevealed,
  isCraftDescriptionsRevealed,
  isBuildingDescriptionsUnlockAvailable,
  isCraftDescriptionsUnlockAvailable,
  BUILDING_DESCRIPTIONS_INSIGHT_COST,
  CRAFT_DESCRIPTIONS_INSIGHT_COST,
  BUILDING_DESCRIPTIONS_INSIGHT_KEY,
  CRAFT_DESCRIPTIONS_INSIGHT_KEY,
  TIMED_EVENT_INSIGHT_PROLONG_KEY,
  TIMED_EVENT_TAB_PROLONG_INSIGHT_COST,
  TIMED_EVENT_TAB_PROLONG_MS,
} from "@/game/rules/insightReveal";
import {
  getTimedEventTabEffectiveRemainingMs,
  useGameStore,
} from "@/game/state";
import { formatTooltipResourceName } from "@/i18n/tooltipLabels";
import { cn } from "@/lib/utils";
import { GAME_PANEL_HEADER_INSIGHT_BADGE_CLASS } from "@/components/game/gameChrome";
import type { GameState } from "@shared/schema";

const BADGE_SIZE_PX = 20;
const PROLONG_MINUTES = TIMED_EVENT_TAB_PROLONG_MS / 60_000;

type ActionInsightBadgeProps =
  | { target: "buildingDescriptions"; layout?: "inline" }
  | { target: "craftDescriptions"; layout?: "inline" }
  | { target?: "action"; actionId: string; layout?: "overlay" }
  | {
    target: "timedEvent";
    layout?: "inline";
    timeRemainingMs: number;
  };

export function ActionInsightBadge(props: ActionInsightBadgeProps) {
  const target = props.target ?? "action";
  const layout =
    props.layout ??
    (target === "buildingDescriptions" ||
      target === "craftDescriptions" ||
      target === "timedEvent"
      ? "inline"
      : "overlay");
  const actionId = target === "action" ? props.actionId : undefined;
  const timeRemainingMs =
    target === "timedEvent" ? props.timeRemainingMs : 0;

  const { t, i18n } = useTranslation(["ui", "common"]);
  const state = useGameStore((s) => s as unknown as GameState);
  const timedTabActive = useGameStore((s) => s.timedEventTab.isActive);
  const insightProlongUsed = useGameStore(
    (s) => s.timedEventTab.insightProlongUsed ?? false,
  );
  const insightRevealing = useGameStore((s) => s.insightRevealing);
  const insightRevealEnd = useGameStore((s) =>
    target === "buildingDescriptions"
      ? s.insightRevealing?.[BUILDING_DESCRIPTIONS_INSIGHT_KEY]
      : target === "craftDescriptions"
        ? s.insightRevealing?.[CRAFT_DESCRIPTIONS_INSIGHT_KEY]
        : target === "timedEvent"
          ? s.insightRevealing?.[TIMED_EVENT_INSIGHT_PROLONG_KEY]
          : actionId
            ? s.insightRevealing?.[actionId]
            : undefined,
  );
  const revealActionEffects = useGameStore((s) => s.revealActionEffects);
  const revealBuildingDescriptions = useGameStore(
    (s) => s.revealBuildingDescriptions,
  );
  const revealCraftDescriptions = useGameStore((s) => s.revealCraftDescriptions);
  const prolongTimedEventTab = useGameStore((s) => s.prolongTimedEventTab);
  const setHighlightedResources = useGameStore((s) => s.setHighlightedResources);
  const executionStart = useGameStore((s) =>
    actionId ? (s.executionStartTimes?.[actionId] ?? 0) : 0,
  );
  const executionDuration = useGameStore((s) =>
    actionId ? (s.executionDurations?.[actionId] ?? 0) : 0,
  );
  const [, forceUpdate] = useState(0);

  const isBuildingDescriptions = target === "buildingDescriptions";
  const isCraftDescriptions = target === "craftDescriptions";
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

  const canShow = isTimedEvent
    ? isInsightUnlocked(state) &&
    timedTabActive &&
    (!insightProlongUsed || isInsightRevealAnimating)
    : isBuildingDescriptions
      ? isBuildingDescriptionsUnlockAvailable(state) &&
      (!isBuildingDescriptionsRevealed(state) || isInsightRevealAnimating)
      : isCraftDescriptions
        ? isCraftDescriptionsUnlockAvailable(state) &&
        (!isCraftDescriptionsRevealed(state) || isInsightRevealAnimating)
        : canRevealEffects(actionId!, state);
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
    : isBuildingDescriptions
      ? BUILDING_DESCRIPTIONS_INSIGHT_COST
      : isCraftDescriptions
        ? CRAFT_DESCRIPTIONS_INSIGHT_COST
        : (actionId ? (getInsightRevealCost(actionId, state) ?? 0) : 0);

  const insightResource = formatTooltipResourceName("insight");
  // Resolve via the reactive `t` (same pattern as the other timed-event tooltips in
  // TimedEventPanel, e.g. `t("ui:timedEvent.buy")`) so the active locale is always used.
  // English defaultValue is only a safety net for missing keys.
  const costTooltip = useMemo(
    () =>
      isTimedEvent
        ? t("ui:timedEvent.prolongForInsight", {
          defaultValue: "Extend time by {{minutes}} min for {{cost}} {{resource}}",
          minutes: PROLONG_MINUTES,
          cost,
          resource: insightResource,
        })
        : isBuildingDescriptions
          ? t("ui:badges.insightRevealBuildingDescriptions", {
            defaultValue:
              "Reveal building descriptions for {{cost}} {{resource}}",
            cost,
            resource: insightResource,
          })
          : isCraftDescriptions
            ? t("ui:badges.insightRevealCraftDescriptions", {
              defaultValue:
                "Reveal craft item descriptions for {{cost}} {{resource}}",
              cost,
              resource: insightResource,
            })
            : t("ui:badges.insightRevealSeeEffects", {
              defaultValue: "See effects for {{cost}} {{resource}}",
              cost,
              resource: insightResource,
            }),
    [t, i18n.language, isTimedEvent, isBuildingDescriptions, isCraftDescriptions, cost, insightResource],
  );

  if (!canShow || isExecuting) return null;
  // Reveal animation finished but the store hasn't unmounted us yet — hide
  // rather than flash the idle triangle for a frame.
  if (revealStartedRef.current && !isRevealing) return null;

  const canAfford = isTimedEvent
    ? canProlongTimedEventTab(state, effectiveTimedRemaining)
    : isBuildingDescriptions
      ? canRevealBuildingDescriptions(state, insightRevealing)
      : isCraftDescriptions
        ? canRevealCraftDescriptions(state, insightRevealing)
        : getInsightAmount(state) >= cost;

  const isBadgeDisabled = isTimedEvent
    ? !timedTimerUsable || !canAfford || playing
    : !canAfford || playing;

  const canAffordForDisplay = isTimedEvent
    ? timedTimerUsable && canAfford
    : canAfford;

  const tooltipId = isTimedEvent
    ? "timed-event-insight-prolong"
    : isBuildingDescriptions
      ? "building-descriptions-insight-reveal"
      : isCraftDescriptions
        ? "craft-descriptions-insight-reveal"
        : `${actionId}-insight-badge`;

  const handleClick = () => {
    if (isBadgeDisabled) return;
    if (isTimedEvent) {
      if (!prolongTimedEventTab()) {
        forceUpdate((n) => n + 1);
      }
      return;
    }
    if (isBuildingDescriptions) {
      revealBuildingDescriptions();
      return;
    }
    if (isCraftDescriptions) {
      revealCraftDescriptions();
      return;
    }
    revealActionEffects(actionId!);
  };

  const isHeaderInline =
    layout === "inline" && (isBuildingDescriptions || isCraftDescriptions);

  const inlineHostClassName = isHeaderInline
    ? cn(
      "inline-flex shrink-0 items-center justify-center self-center",
      GAME_PANEL_HEADER_INSIGHT_BADGE_CLASS,
    )
    : "inline-flex shrink-0 items-center self-center";

  const hostClassName = cn(
    layout === "inline" && inlineHostClassName,
    isTimedEvent && layout === "inline" && "ml-0.5",
  );
  const hostStyle =
    layout === "overlay"
      ? {
        position: "absolute" as const,
        bottom: "-9px",
        right: "-9px",
        width: BADGE_SIZE_PX,
        height: BADGE_SIZE_PX,
        zIndex: 30,
        pointerEvents: "auto" as const,
      }
      : undefined;

  const inlineTooltipWrapperClassName = isHeaderInline
    ? cn(
      "inline-flex items-center justify-center",
      GAME_PANEL_HEADER_INSIGHT_BADGE_CLASS,
    )
    : "inline-flex items-center";

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
            : inlineTooltipWrapperClassName
        }
        tooltipTriggerAsChild
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
        <button
          type="button"
          className={cn(
            getInsightBadgeTriggerClassName({
              canAfford: canAffordForDisplay,
              playing,
              className: cn(
                layout === "overlay"
                  ? "flex h-full w-full"
                  : isHeaderInline
                    ? GAME_PANEL_HEADER_INSIGHT_BADGE_CLASS
                    : "h-5 w-5",
                isHeaderInline && "insight-action-badge-trigger--header",
              ),
            }),
          )}
          aria-label={costTooltip}
          aria-busy={playing}
          disabled={isBadgeDisabled}
          onClick={(e) => {
            e.stopPropagation();
            handleClick();
            e.currentTarget.blur();
          }}
        >
          <BuildingActionBadge
            key={playing ? "reveal" : "idle"}
            playing={playing}
            embedded
            size="lg"
          />
        </button>
      </TooltipWrapper>
    </div>
  );
}