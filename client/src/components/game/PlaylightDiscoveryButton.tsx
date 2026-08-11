import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { HoverCalloutTooltip } from "@/components/game/HoverCalloutTooltip";
import { useGameStore } from "@/game/state";
import { cn } from "@/lib/utils";
import { GameUiIcon } from "@/components/game/GameUiIcon";
import { useUiTranslation } from "@/i18n/useUiTranslation";
import { GAME_CHROME_NO_BG_HOVER } from "./gameChrome";

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
  tooltipSide = "top",
  className,
}: PlaylightDiscoveryButtonProps) {
  const { t } = useUiTranslation();
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

  const label = t("playlight.moreGames");
  const tooltipLabel = t("playlight.tryMoreGames");

  return (
    <HoverCalloutTooltip
      label={tooltipLabel}
      side={tooltipSide}
      forceVisible={forceShowTooltip || showDiscoveryTooltip}
      onCalloutClick={onClick}
    >
      <Button
        variant="ghost"
        size="xs"
        type="button"
        onClick={onClick}
        data-testid="button-footer-playlight"
        aria-label={tooltipLabel}
        className={cn(
          "playlight-discovery-btn group relative shrink-0 overflow-visible px-1 py-1 text-xs text-neutral-300 hover hover:!text-blue-400 flex items-center gap-1",
          GAME_CHROME_NO_BG_HOVER,
          className,
        )}
      >
        <span
          className="relative flex h-[calc(1.125rem*0.9)] w-[calc(1.125rem*0.9)] shrink-0 items-center justify-center"
          aria-hidden
        >
          <GameUiIcon
            name="discover"
            sizeClassName="h-full w-full"
            className="playlight-discover-icon text-blue-400 opacity-80 transition-[opacity,color] duration-300 group-hover:opacity-100 group-hover:!text-blue-400"
          />
          {showNotificationDot && (
            <span
              className="notification-pulse absolute -right-[4px] -top-[4px] z-[2] h-2 w-2 rounded-full bg-red-600"
              aria-hidden
            />
          )}
        </span>
        <span className="hidden sm:inline opacity-80 transition-[opacity,color] group-hover:opacity-100 group-hover:!text-blue-400">
          {label}
        </span>
      </Button>
    </HoverCalloutTooltip>
  );
}
