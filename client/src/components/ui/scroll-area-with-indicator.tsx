"use client";

import * as React from "react";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import { ScrollBar } from "./scroll-area";
import { useGameStore } from "@/game/state";

interface ScrollAreaWithIndicatorProps
  extends React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root> {
  /** Scroll indicator only shows when true (e.g. entry count >= 8 for event log) */
  showIndicatorWhen?: boolean;
  /** If true, indicator stays visible when scrolling (for testing) */
  persistIndicator?: boolean;
  /** Unique ID for this scroll area - when provided, indicator is hidden permanently after first scroll (persisted) */
  scrollAreaId?: string;
}

const ScrollAreaWithIndicator = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.Root>,
  ScrollAreaWithIndicatorProps
>(
  (
    {
      className,
      children,
      showIndicatorWhen = true,
      persistIndicator = false,
      scrollAreaId,
      ...props
    },
    ref
  ) => {
    const viewportRef = React.useRef<HTMLDivElement>(null);
    const [showIndicator, setShowIndicator] = React.useState(true);
    const [isScrollable, setIsScrollable] = React.useState(false);

    const scrollIndicatorSeen = useGameStore(
      (s) => (s.scrollIndicatorSeen || {})[scrollAreaId ?? ""]
    );
    const setScrollIndicatorSeen = useGameStore((s) => s.setScrollIndicatorSeen);

    const checkScroll = React.useCallback(() => {
      const el = viewportRef.current;
      if (!el) return;
      const canScroll = el.scrollHeight > el.clientHeight;
      setIsScrollable(canScroll);
      if (el.scrollTop > 8) {
        if (scrollAreaId) {
          setScrollIndicatorSeen(scrollAreaId);
        } else if (!persistIndicator) {
          setShowIndicator(false);
        }
      }
    }, [persistIndicator, scrollAreaId, setScrollIndicatorSeen]);

    React.useEffect(() => {
      const el = viewportRef.current;
      if (!el) return;
      checkScroll();
      el.addEventListener("scroll", checkScroll);
      const ro = new ResizeObserver(checkScroll);
      ro.observe(el);
      return () => {
        el.removeEventListener("scroll", checkScroll);
        ro.disconnect();
      };
    }, [checkScroll]);

    const hasBeenSeen = scrollAreaId ? scrollIndicatorSeen : !showIndicator;
    const shouldShow =
      showIndicatorWhen && !hasBeenSeen && isScrollable;

    return (
      <ScrollAreaPrimitive.Root
        ref={ref}
        className={cn("relative overflow-hidden", className)}
        {...props}
      >
        <ScrollAreaPrimitive.Viewport
          ref={viewportRef}
          className="h-full w-full rounded-[inherit] overflow-x-hidden"
        >
          {children}
        </ScrollAreaPrimitive.Viewport>
        <ScrollAreaPrimitive.Corner />
        <ScrollBar orientation="vertical" />
        {shouldShow && (
          <div
            className="absolute bottom-1 left-0 right-0 pointer-events-none flex justify-center z-10"
            aria-hidden
          >
            <ChevronDown className="h-4 w-4 text-muted-foreground/70 animate-bounce" />
          </div>
        )}
      </ScrollAreaPrimitive.Root>
    );
  }
);
ScrollAreaWithIndicator.displayName = "ScrollAreaWithIndicator";

export { ScrollAreaWithIndicator };
