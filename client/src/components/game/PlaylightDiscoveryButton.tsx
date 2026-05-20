import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TooltipWrapper } from "@/components/game/TooltipWrapper";

const TOGGLE_MS = 5 * 60 * 1000;

type PlaylightDiscoveryButtonProps = {
  onClick: () => void;
  showNotificationDot?: boolean;
};

export default function PlaylightDiscoveryButton({
  onClick,
  showNotificationDot = false,
}: PlaylightDiscoveryButtonProps) {
  const [showMoreGames, setShowMoreGames] = useState(false);

  useEffect(() => {
    const id = window.setInterval(() => {
      setShowMoreGames((prev) => !prev);
    }, TOGGLE_MS);
    return () => window.clearInterval(id);
  }, []);

  return (
    <TooltipWrapper
      tooltip={
        <p className="text-xs">
          Discover more fun games
        </p>
      }
      tooltipId="playlight-discovery-toggle"
      className="inline-flex shrink-0"
    >
      <Button
        variant="ghost"
        size="xs"
        type="button"
        onClick={onClick}
        aria-label={showMoreGames ? "More games" : "Discovery"}
        className={cn(
          "playlight-discovery-btn group relative h-7 shrink-0 overflow-hidden border border-border bg-background/70 backdrop-blur-sm transition-[width,padding,background-color,border-color] duration-500 ease-in-out",
          showMoreGames
            ? "min-w-[5.25rem] px-2"
            : "w-7 p-0",
        )}
      >
        <span
          className={cn(
            "absolute inset-0 flex items-center justify-center transition-all duration-500 ease-in-out",
            showMoreGames
              ? "pointer-events-none scale-75 opacity-0"
              : "scale-100 opacity-60 group-hover:opacity-100",
          )}
          aria-hidden={showMoreGames}
        >
          <img
            src="/flashlight.png"
            alt=""
            className="h-full w-full object-contain rounded-md transition-[filter] duration-300 invert group-hover:invert-0"
          />
        </span>
        <span
          className={cn(
            "relative z-[1] text-[10px] font-semibold leading-none tracking-wide transition-all duration-500 ease-in-out",
            showMoreGames
              ? "translate-y-0 opacity-100 text-primary"
              : "pointer-events-none translate-y-1 opacity-0 text-neutral-400",
          )}
          aria-hidden={!showMoreGames}
        >
          More Games
        </span>
        {showNotificationDot && (
          <span
            className="absolute -top-[4px] -right-[4px] z-[2] h-2 w-2 rounded-full bg-red-600 notification-pulse"
            aria-hidden
          />
        )}
      </Button>
    </TooltipWrapper>
  );
}
