import { Button } from "@/components/ui/button";
import { HoverCalloutTooltip } from "@/components/game/HoverCalloutTooltip";
import { useGameStore } from "@/game/state";
import { cn } from "@/lib/utils";
import { GameUiIcon } from "@/components/game/GameUiIcon";
import { usePeriodicPlayTimeTooltip } from "@/hooks/usePeriodicPlayTimeTooltip";
import { useUiTranslation } from "@/i18n/useUiTranslation";
import { GAME_CHROME_NO_BG_HOVER } from "./gameChrome";

const PLAYLIGHT_FOOTER_BUTTON_ID = "footer-playlight";

/** First auto-show after 75 min active play, then every 30 min. */
const FIRST_SHOW_PLAY_MS = 75 * 60 * 1000;
const INTERVAL_MS = 30 * 60 * 1000;

type PlaylightDiscoveryButtonProps = {
  onClick: () => void;
  showNotificationDot?: boolean;
  forceShowTooltip?: boolean;
  forceTooltipFadeDurationMs?: number;
  tooltipSide?: "top" | "left" | "right" | "bottom";
  className?: string;
};

export default function PlaylightDiscoveryButton({
  onClick,
  showNotificationDot = false,
  forceShowTooltip = false,
  forceTooltipFadeDurationMs,
  tooltipSide = "top",
  className,
}: PlaylightDiscoveryButtonProps) {
  const { t } = useUiTranslation();
  const showDiscoveryTooltip = usePeriodicPlayTimeTooltip({
    firstShowPlayMs: FIRST_SHOW_PLAY_MS,
    intervalMs: INTERVAL_MS,
  });

  const handleCalloutClick = () => {
    useGameStore.getState().trackButtonClick(PLAYLIGHT_FOOTER_BUTTON_ID);
    onClick();
  };

  const label = t("playlight.moreGames", { defaultValue: "More Games" });
  const shortLabel = t("playlight.more", { defaultValue: "More" });
  const tooltipLabel = t("playlight.tryMoreGames", {
    defaultValue: "Try more Games",
  });

  return (
    <HoverCalloutTooltip
      label={tooltipLabel}
      side={tooltipSide}
      size="md"
      forceVisible={forceShowTooltip || showDiscoveryTooltip}
      fadeDurationMs={
        forceShowTooltip ? forceTooltipFadeDurationMs : undefined
      }
      hoverEnabled={false}
      onCalloutClick={handleCalloutClick}
    >
      <Button
        variant="ghost"
        size="xs"
        type="button"
        onClick={onClick}
        button_id={PLAYLIGHT_FOOTER_BUTTON_ID}
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
        <span className="inline opacity-80 transition-[opacity,color] group-hover:opacity-100 group-hover:!text-blue-400 sm:hidden">
          {shortLabel}
        </span>
        <span className="hidden opacity-80 transition-[opacity,color] group-hover:opacity-100 group-hover:!text-blue-400 sm:inline">
          {label}
        </span>
      </Button>
    </HoverCalloutTooltip>
  );
}
