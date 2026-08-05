"use client";

import * as React from "react";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import { ScrollBar } from "./scroll-area";
import { useGameStore } from "@/game/state";

/** Ignore sub-pixel / scrollbar rounding so we only show when scrolling is real. */
const OVERFLOW_THRESHOLD_PX = 2;

interface ScrollAreaWithIndicatorProps
  extends React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root> {
  /** If true, indicator stays visible when scrolling (for testing) */
  persistIndicator?: boolean;
  /** Unique ID for this scroll area - when provided, indicator is hidden permanently after first scroll (persisted) */
  scrollAreaId?: string;
  /** Viewport padding/classes; defaults include `pl-2` to match game panel chrome. */
  viewportClassName?: string;
}

const ScrollAreaWithIndicator = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.Root>,
  ScrollAreaWithIndicatorProps
>(
  (
    {
      className,
      children,
      persistIndicator = false,
      scrollAreaId,
      viewportClassName,
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

      // Radix wraps children in a display:table node; prefer that for content height.
      const content = el.firstElementChild as HTMLElement | null;
      const contentHeight = content?.scrollHeight ?? el.scrollHeight;
      const canScroll = contentHeight > el.clientHeight + OVERFLOW_THRESHOLD_PX;
      // Avoid re-renders when nothing changed (ResizeObserver can fire often).
      setIsScrollable((prev) => (prev === canScroll ? prev : canScroll));

      if (el.scrollTop > 8) {
        if (scrollAreaId) {
          setScrollIndicatorSeen(scrollAreaId);
        } else if (!persistIndicator) {
          setShowIndicator((prev) => (prev ? false : prev));
        }
      }
    }, [persistIndicator, scrollAreaId, setScrollIndicatorSeen]);

    React.useLayoutEffect(() => {
      const el = viewportRef.current;
      if (!el) return;

      checkScroll();
      el.addEventListener("scroll", checkScroll);

      const ro = new ResizeObserver(checkScroll);
      ro.observe(el);
      const content = el.firstElementChild;
      if (content) {
        ro.observe(content);
      }

      // Content swaps (new log lines, tab changes) without a viewport resize.
      // Do NOT put `children` in effect deps: parent re-renders pass a new element
      // every time and would tear down/recreate observers continuously.
      const mo = new MutationObserver(checkScroll);
      mo.observe(el, { childList: true, subtree: true, characterData: true });

      return () => {
        el.removeEventListener("scroll", checkScroll);
        ro.disconnect();
        mo.disconnect();
      };
    }, [checkScroll]);

    const hasBeenSeen = scrollAreaId ? scrollIndicatorSeen : !showIndicator;
    const shouldShow = !hasBeenSeen && isScrollable;

    return (
      <ScrollAreaPrimitive.Root
        ref={ref}
        className={cn("relative overflow-hidden", className)}
        {...props}
        // Default Radix type is "hover", which mounts/unmounts the scrollbar on
        // pointer enter and toggles viewport overflow. Inside achievement/log
        // panels that re-render often, that ref + setState churn hits
        // "Maximum update depth exceeded". Our ScrollBar is opacity-0 anyway.
        // Force after `{...props}` so callers cannot opt back into hover.
        type="always"
      >
        <ScrollAreaPrimitive.Viewport
          ref={viewportRef}
          className={cn(
            "h-full w-full rounded-[inherit] overflow-x-hidden pl-2",
            viewportClassName,
          )}
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
