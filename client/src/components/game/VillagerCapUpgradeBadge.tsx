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
import { getInsightAmount } from "@/game/rules/insightReveal";
import type { GameState } from "@shared/schema";
import {
  getNextCapUpgradeCost,
  getVillagerCapLevel,
  getVillagerCapUpgradeInsightKey,
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
  /** Job row id — unique tooltip / test id when several jobs share a group. */
  jobId: string;
};

/**
 * Villager-cap upgrade badge (timed-tab Insight size: h-5 w-5 + lg blob).
 * Playing state is shared per group via `insightRevealing` so every job in the
 * group animates and stays locked together.
 */
export function VillagerCapUpgradeBadge({
  groupId,
  jobId,
}: VillagerCapUpgradeBadgeProps) {
  const revealKey = getVillagerCapUpgradeInsightKey(groupId);
  const tooltipId = `villager-cap-upgrade-${groupId}-${jobId}`;
  const {
    pulseClassName,
    dismissPulse,
    handleTooltipEnter,
    handleTooltipLeave,
  } = useInsightBadgeTooltipPulse(tooltipId);
  const gameState = useGameStore((s) => s as unknown as GameState);
  const insightRevealEnd = useGameStore(
    (s) => s.insightRevealing?.[revealKey],
  );
  const startVillagerCapUpgrade = useGameStore(
    (s) => s.startVillagerCapUpgrade,
  );
  const setHighlightedResources = useGameStore(
    (s) => s.setHighlightedResources,
  );
  const [suppressHover, setSuppressHover] = useState(false);
  const [, forceUpdate] = useState(0);
  const revealStartedRef = useRef(false);

  // Subscribed end time so every badge in the group re-renders together.
  const isPlaying =
    typeof insightRevealEnd === "number" && insightRevealEnd > Date.now();

  useEffect(() => {
    if (isPlaying) revealStartedRef.current = true;
  }, [isPlaying]);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => forceUpdate((n) => n + 1), 100);
    return () => clearInterval(interval);
  }, [isPlaying, insightRevealEnd]);

  useEffect(() => {
    if (!isPlaying) return;
    setHighlightedResources(["insight"]);
    return () => setHighlightedResources([]);
  }, [isPlaying, setHighlightedResources]);

  useEffect(() => {
    if (revealStartedRef.current && !isPlaying) {
      setSuppressHover(true);
    }
  }, [isPlaying]);

  const level = getVillagerCapLevel(gameState, groupId);
  const cost = getNextCapUpgradeCost(level);
  const affordable = getInsightAmount(gameState) >= cost;
  const isDisabled = !affordable || isPlaying;
  const upgradeTooltip = getUiTooltip(
    "unlockMoreJobsForInsight",
    "Increase limit for {{cost}} Insight",
    { cost },
  );

  const handleClick = () => {
    if (isDisabled) return;
    dismissPulse();
    setSuppressHover(false);
    startVillagerCapUpgrade(groupId);
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
        handleTooltipLeave(isPlaying);
      }}
      className="inline-flex h-full w-full items-center justify-center"
    >
      <button
        type="button"
        data-testid={`villager-cap-upgrade-${groupId}-${jobId}`}
        aria-label={upgradeTooltip}
        aria-busy={isPlaying}
        disabled={isDisabled}
        onClick={(e) => {
          e.stopPropagation();
          handleClick();
        }}
        className={getInsightBadgeTriggerClassName({
          canAfford: affordable,
          playing: isPlaying,
          suppressHover,
          className: cn(pulseClassName, "h-5 w-5 leading-none"),
        })}
      >
        <BuildingActionBadge embedded size="lg" playing={isPlaying} />
      </button>
    </TooltipWrapper>
  );
}
