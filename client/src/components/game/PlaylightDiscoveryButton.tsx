import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { HoverCalloutTooltip } from "@/components/game/HoverCalloutTooltip";
import { useGameStore } from "@/game/state";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

const SHOW_MS = 20 * 1000;
const FIRST_SHOW_PLAY_MS = 75 * 60 * 1000;
/** Phase 1: 75–135 min active play — every 10 min; then every 20 min. */
const PHASE1_END_PLAY_MS = (75 + 60) * 60 * 1000;
const INTERVAL_PHASE1_MS = 10 * 60 * 1000;
const INTERVAL_PHASE2_MS = 20 * 60 * 1000;

function getLatestTooltipMilestonePlayMs(playTimeMs: number): number {
  if (playTimeMs < FIRST_SHOW_PLAY_MS) {
    return 0;
  }

  if (playTimeMs < PHASE1_END_PLAY_MS) {
    const elapsed = playTimeMs - FIRST_SHOW_PLAY_MS;
    const steps = Math.floor(elapsed / INTERVAL_PHASE1_MS);
    return FIRST_SHOW_PLAY_MS + steps * INTERVAL_PHASE1_MS;
  }

  const elapsed = playTimeMs - PHASE1_END_PLAY_MS;
  const steps = Math.floor(elapsed / INTERVAL_PHASE2_MS);
  return PHASE1_END_PLAY_MS + steps * INTERVAL_PHASE2_MS;
}

type PlaylightDiscoveryButtonProps = {
  onClick: () => void;
  showNotificationDot?: boolean;
  forceShowTooltip?: boolean;
  tooltipSide?: "top" | "left" | "right" | "bottom";
  className?: string;
};

export default function PlaylightDiscoveryButton({
  onClick,
  showNotificationDot = false,
  forceShowTooltip = false,
  tooltipSide = "left",
  className,
}: PlaylightDiscoveryButtonProps) {
  const { t } = useTranslation("ui");
  const playTime = useGameStore((state) => state.playTime ?? 0);
  const [showDiscoveryTooltip, setShowDiscoveryTooltip] = useState(false);
  const lastShownMilestoneRef = useRef(
    getLatestTooltipMilestonePlayMs(playTime),
  );
  const hideTimeoutRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const latestMilestone = getLatestTooltipMilestonePlayMs(playTime);
    if (latestMilestone <= lastShownMilestoneRef.current) {
      return;
    }

    lastShownMilestoneRef.current = latestMilestone;
    if (hideTimeoutRef.current !== undefined) {
      window.clearTimeout(hideTimeoutRef.current);
    }
    setShowDiscoveryTooltip(true);
    hideTimeoutRef.current = window.setTimeout(() => {
      setShowDiscoveryTooltip(false);
      hideTimeoutRef.current = undefined;
    }, SHOW_MS);
  }, [playTime]);

  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current !== undefined) {
        window.clearTimeout(hideTimeoutRef.current);
      }
    };
  }, []);

  return (
    <HoverCalloutTooltip
      label={t("playlight.moreGames")}
      side={tooltipSide}
      forceVisible={forceShowTooltip || showDiscoveryTooltip}
      onCalloutClick={onClick}
    >
      <Button
        variant="ghost"
        size="xs"
        type="button"
        onClick={onClick}
        aria-label={t("playlight.discoveryAria")}
        className={cn(
          "playlight-discovery-btn group relative shrink-0 overflow-visible p-0 h-7 w-7 flex items-center justify-center",
          className,
        )}
      >
        <span
          className="flex h-full w-full items-end justify-center opacity-80 transition-opacity duration-300 group-hover:opacity-100"
          aria-hidden
        >
          <img
            src="/flashlight.png"
            alt=""
            className="h-full w-full scale-90 rounded-md object-contain object-bottom transition-[filter] duration-300 [filter:invert(1)] group-hover:[filter:invert(17%)_sepia(89%)_saturate(7458%)_hue-rotate(358deg)_brightness(97%)_contrast(118%)]"
          />
        </span>
        {showNotificationDot && (
          <span
            className="notification-pulse absolute -right-[4px] -top-[4px] z-[2] h-2 w-2 rounded-full bg-red-600"
            aria-hidden
          />
        )}
      </Button>
    </HoverCalloutTooltip>
  );
}