import { useCallback, useEffect, useRef, useState } from "react";
import {
  BuildingActionBadge,
  getInsightBadgeTriggerClassName,
  INSIGHT_BADGE_TOOLTIP_TRIGGER_CLASS,
} from "@/components/game/BuildingActionBadge";
import { TooltipWrapper } from "@/components/game/TooltipWrapper";
import { useGameStore } from "@/game/state";
import { useNewItemPulseTooltips } from "@/hooks/useNewItemPulseTooltip";
import { cn } from "@/lib/utils";
import {
  getInsightAmount,
  INSIGHT_REVEAL_DURATION_MS,
} from "@/game/rules/insightReveal";
import type { GameState } from "@shared/schema";
import {
  getNextCapUpgradeCost,
  getVillagerCapLevel,
  type VillagerCapGroupId,
} from "@/game/villagerCapUpgrades";
import { getUiTooltip } from "@/i18n/tooltipLabels";

/** New-item pulse + insight highlight for villager-cap upgrade badges. */
function useInsightBadgeTooltipPulse(tooltipId: string) {
  const setHighlightedResources = useGameStore(
    (s) => s.setHighlightedResources,
  );
  const setHoveredTooltip = useGameStore((s) => s.setHoveredTooltip);
  const { pulseClassName, onMouseEnter, onMouseLeave } =
    useNewItemPulseTooltips([tooltipId]);

  const dismissPulse = useCallback(() => {
    setHoveredTooltip(tooltipId, true);
  }, [setHoveredTooltip, tooltipId]);

  const handleTooltipEnter = useCallback(() => {
    setHighlightedResources(["insight"]);
    onMouseEnter(tooltipId);
  }, [onMouseEnter, setHighlightedResources, tooltipId]);

  const handleTooltipLeave = useCallback(
    (playing: boolean) => {
      onMouseLeave(tooltipId);
      if (!playing) setHighlightedResources([]);
    },
    [onMouseLeave, setHighlightedResources, tooltipId],
  );

  return {
    pulseClassName: pulseClassName(tooltipId),
    dismissPulse,
    handleTooltipEnter,
    handleTooltipLeave,
  };
}

type VillagerCapUpgradeBadgeProps = {
  groupId: VillagerCapGroupId;
};

/**
 * Villager-cap upgrade badge (timed-tab Insight size: h-5 w-5 + lg blob).
 * Clicking plays the blob animation for INSIGHT_REVEAL_DURATION_MS (3s);
 * the upgrade applies when the animation resolves.
 */
export function VillagerCapUpgradeBadge({
  groupId,
}: VillagerCapUpgradeBadgeProps) {
  const tooltipId = `villager-cap-upgrade-${groupId}`;
  const {
    pulseClassName,
    dismissPulse,
    handleTooltipEnter,
    handleTooltipLeave,
  } = useInsightBadgeTooltipPulse(tooltipId);
  const gameState = useGameStore((s) => s as unknown as GameState);
  const setHighlightedResources = useGameStore(
    (s) => s.setHighlightedResources,
  );
  const [playingUntil, setPlayingUntil] = useState(0);
  const [suppressHover, setSuppressHover] = useState(false);
  const [, forceUpdate] = useState(0);
  const upgradeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const playing = playingUntil > 0 && playingUntil > Date.now();

  useEffect(() => {
    if (!playingUntil) return;
    const interval = setInterval(() => forceUpdate((n) => n + 1), 100);
    return () => clearInterval(interval);
  }, [playingUntil]);

  useEffect(
    () => () => {
      if (upgradeTimerRef.current) clearTimeout(upgradeTimerRef.current);
    },
    [],
  );

  const level = getVillagerCapLevel(gameState, groupId);
  const cost = getNextCapUpgradeCost(level);
  const affordable = getInsightAmount(gameState) >= cost;
  const isDisabled = !affordable || playing;
  const upgradeTooltip = getUiTooltip(
    "unlockMoreJobsForInsight",
    "Unlock more jobs for {{cost}} Insight",
    { cost },
  );

  const handleClick = () => {
    if (isDisabled) return;
    dismissPulse();
    setSuppressHover(false);
    setPlayingUntil(Date.now() + INSIGHT_REVEAL_DURATION_MS);
    setHighlightedResources(["insight"]);
    if (upgradeTimerRef.current) clearTimeout(upgradeTimerRef.current);
    upgradeTimerRef.current = setTimeout(() => {
      useGameStore.getState().upgradeVillagerCap(groupId);
      setHighlightedResources([]);
      setPlayingUntil(0);
      setSuppressHover(true);
    }, INSIGHT_REVEAL_DURATION_MS);
  };

  return (
    <TooltipWrapper
      tooltip={<div className="text-xs">{upgradeTooltip}</div>}
      tooltipId={tooltipId}
      disabled={isDisabled}
      tooltipContentClassName="max-w-xs"
      tooltipTriggerAsChild
      tooltipTriggerClassName={INSIGHT_BADGE_TOOLTIP_TRIGGER_CLASS}
      onMouseEnter={handleTooltipEnter}
      onMouseLeave={() => {
        setSuppressHover(false);
        handleTooltipLeave(playing);
      }}
      className="inline-flex h-full w-full items-center justify-center"
    >
      <button
        type="button"
        data-testid={`villager-cap-upgrade-${groupId}`}
        aria-label={upgradeTooltip}
        aria-busy={playing}
        disabled={isDisabled}
        onClick={(e) => {
          e.stopPropagation();
          handleClick();
        }}
        className={getInsightBadgeTriggerClassName({
          canAfford: affordable,
          playing,
          suppressHover,
          className: cn(pulseClassName, "h-5 w-5 leading-none"),
        })}
      >
        <BuildingActionBadge embedded size="lg" playing={playing} />
      </button>
    </TooltipWrapper>
  );
}
