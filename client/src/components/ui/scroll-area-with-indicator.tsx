"use client";

import * as React from "react";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import { ScrollBar } from "./scroll-area";

interface ScrollAreaWithIndicatorProps
  extends React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root> {
  /** Scroll indicator only shows when true (e.g. entry count >= 8 for event log) */
  showIndicatorWhen?: boolean;
  /** If true, indicator stays visible when scrolling (for testing) */
  persistIndicator?: boolean;
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
      ...props
    },
    ref
  ) => {
    const viewportRef = React.useRef<HTMLDivElement>(null);
    const [showIndicator, setShowIndicator] = React.useState(true);
    const [isScrollable, setIsScrollable] = React.useState(false);

    const checkScroll = React.useCallback(() => {
      const el = viewportRef.current;
      if (!el) return;
      const canScroll = el.scrollHeight > el.clientHeight;
      setIsScrollable(canScroll);
      if (!persistIndicator && el.scrollTop > 8) {
        setShowIndicator(false);
      }
    }, [persistIndicator]);

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

    const shouldShow =
      showIndicatorWhen && showIndicator && isScrollable;

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
            className="absolute bottom-0 left-0 right-0 h-8 pointer-events-none flex items-end justify-center pb-1 transition-opacity duration-300 z-10"
            aria-hidden
          >
            <div className="bg-gradient-to-t from-background via-background/80 to-transparent w-full h-full flex items-end justify-center">
              <ChevronDown className="w-4 h-4 text-muted-foreground/70 animate-bounce" />
            </div>
          </div>
        )}
      </ScrollAreaPrimitive.Root>
    );
  }
);
ScrollAreaWithIndicator.displayName = "ScrollAreaWithIndicator";

export { ScrollAreaWithIndicator };
