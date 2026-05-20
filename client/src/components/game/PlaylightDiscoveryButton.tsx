import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const TOGGLE_MS = 10 * 1000;

type PlaylightDiscoveryButtonProps = {
  onClick: () => void;
  showNotificationDot?: boolean;
};

export default function PlaylightDiscoveryButton({
  onClick,
  showNotificationDot = false,
}: PlaylightDiscoveryButtonProps) {
  const [showDiscoveryTooltip, setShowDiscoveryTooltip] = useState(true);

  useEffect(() => {
    const id = window.setInterval(() => {
      setShowDiscoveryTooltip((prev) => !prev);
    }, TOGGLE_MS);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="relative inline-flex shrink-0 overflow-visible">
      <button
        type="button"
        onClick={onClick}
        tabIndex={showDiscoveryTooltip ? 0 : -1}
        aria-hidden={!showDiscoveryTooltip}
        className={cn(
          "absolute top-1/2 z-[1] flex -translate-y-1/2 -left-2 -translate-x-full rounded-md bg-primary px-2 py-1.5 text-[10px] font-semibold leading-none tracking-wide text-primary-foreground shadow-md transition-opacity duration-300 hover:bg-primary/90",
          showDiscoveryTooltip
            ? "cursor-pointer opacity-100"
            : "pointer-events-none opacity-0",
        )}
      >
        <span className="whitespace-nowrap">Discover more fun games</span>
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
        aria-label="Discovery"
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
