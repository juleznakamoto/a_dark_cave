import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

const CYCLE_MS = 5 * 60 * 1000;
const SHOW_MS = 30 * 1000;

type PlaylightDiscoveryButtonProps = {
  onClick: () => void;
  showNotificationDot?: boolean;
  forceShowTooltip?: boolean;
};

export default function PlaylightDiscoveryButton({
  onClick,
  showNotificationDot = false,
  forceShowTooltip = false,
}: PlaylightDiscoveryButtonProps) {
  const { t } = useTranslation("ui");
  const [showDiscoveryTooltip, setShowDiscoveryTooltip] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    let hideTimeout: number | undefined;

    const showTooltip = () => {
      if (hideTimeout !== undefined) {
        window.clearTimeout(hideTimeout);
      }
      setShowDiscoveryTooltip(true);
      hideTimeout = window.setTimeout(() => {
        setShowDiscoveryTooltip(false);
        hideTimeout = undefined;
      }, SHOW_MS);
    };

    showTooltip();
    const intervalId = window.setInterval(showTooltip, CYCLE_MS);

    return () => {
      window.clearInterval(intervalId);
      if (hideTimeout !== undefined) {
        window.clearTimeout(hideTimeout);
      }
    };
  }, []);

  const tooltipVisible = forceShowTooltip || showDiscoveryTooltip || isHovered;

  return (
    <div
      className="relative inline-flex shrink-0 overflow-visible"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <button
        type="button"
        onClick={onClick}
        tabIndex={tooltipVisible ? 0 : -1}
        aria-hidden={!tooltipVisible}
        className={cn(
          "absolute top-1/2 z-[1] flex -translate-y-1/2 -left-2 -translate-x-full rounded-md bg-primary px-2 py-1.5 text-[10px] font-semibold leading-none tracking-wide text-primary-foreground shadow-md transition-opacity duration-300 hover:bg-primary/90",
          tooltipVisible
            ? "cursor-pointer opacity-100"
            : "pointer-events-none opacity-0",
        )}
      >
        <span className="whitespace-nowrap">{t("playlight.moreGames")}</span>
        <div
          className="absolute top-1/2 right-0 translate-x-1/2 -translate-y-1/2 rotate-45 bg-inherit p-1"
          aria-hidden
        />
      </button>

      <Button
        variant="ghost"
        size="xs"
        type="button"
        onClick={onClick}
        aria-label={t("playlight.discoveryAria")}
        className="playlight-discovery-btn group relative h-7 w-7 shrink-0 overflow-visible border border-border bg-background/70 p-0 backdrop-blur-sm"
      >
        <span
          className="flex h-full w-full items-center justify-center opacity-60 transition-opacity duration-300 group-hover:opacity-100"
          aria-hidden
        >
          <img
            src="/flashlight.png"
            alt=""
            className="h-full w-full rounded-md object-contain invert transition-[filter] duration-300 group-hover:invert-0"
          />
        </span>
        {showNotificationDot && (
          <span
            className="notification-pulse absolute -right-[4px] -top-[4px] z-[2] h-2 w-2 rounded-full bg-red-600"
            aria-hidden
          />
        )}
      </Button>
    </div>
  );
}
