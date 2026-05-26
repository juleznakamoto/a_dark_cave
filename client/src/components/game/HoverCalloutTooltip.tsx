import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type HoverCalloutSide = "top" | "left" | "right" | "bottom";

/** Arrow anchor along the callout edge facing the trigger (1/4, 1/2, or 3/4). */
export type HoverCalloutArrowAlign = "start" | "center" | "end";

const CALLOUT_BASE =
  "pointer-events-none absolute z-[1] flex rounded-md bg-primary px-2 py-1.5 text-[10px] font-semibold leading-none tracking-wide text-primary-foreground shadow-md transition-opacity duration-300";

const SIDE_LAYOUT: Record<
  HoverCalloutSide,
  Record<HoverCalloutArrowAlign, { callout: string; arrow: string }>
> = {
  top: {
    center: {
      callout: "left-1/2 bottom-full mb-1.5 -translate-x-1/2",
      arrow: "bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2",
    },
    start: {
      callout: "left-1/2 bottom-full mb-1.5 -translate-x-1/4",
      arrow: "bottom-0 left-1/4 -translate-x-1/2 translate-y-1/2",
    },
    end: {
      callout: "left-1/2 bottom-full mb-1.5 -translate-x-3/4",
      arrow: "bottom-0 left-3/4 -translate-x-1/2 translate-y-1/2",
    },
  },
  bottom: {
    center: {
      callout: "left-1/2 top-full mt-1.5 -translate-x-1/2",
      arrow: "top-0 left-1/2 -translate-x-1/2 -translate-y-1/2",
    },
    start: {
      callout: "left-1/2 top-full mt-1.5 -translate-x-1/4",
      arrow: "top-0 left-1/4 -translate-x-1/2 -translate-y-1/2",
    },
    end: {
      callout: "left-1/2 top-full mt-1.5 -translate-x-3/4",
      arrow: "top-0 left-3/4 -translate-x-1/2 -translate-y-1/2",
    },
  },
  left: {
    center: {
      callout: "top-1/2 -left-2 -translate-x-full -translate-y-1/2",
      arrow: "top-1/2 right-0 translate-x-1/2 -translate-y-1/2",
    },
    start: {
      callout: "top-1/2 -left-2 -translate-x-full -translate-y-1/4",
      arrow: "top-1/4 right-0 translate-x-1/2 -translate-y-1/2",
    },
    end: {
      callout: "top-1/2 -left-2 -translate-x-full -translate-y-3/4",
      arrow: "top-3/4 right-0 translate-x-1/2 -translate-y-1/2",
    },
  },
  right: {
    center: {
      callout: "top-1/2 -right-2 translate-x-full -translate-y-1/2",
      arrow: "top-1/2 left-0 -translate-x-1/2 -translate-y-1/2",
    },
    start: {
      callout: "top-1/2 -right-2 translate-x-full -translate-y-1/4",
      arrow: "top-1/4 left-0 -translate-x-1/2 -translate-y-1/2",
    },
    end: {
      callout: "top-1/2 -right-2 translate-x-full -translate-y-3/4",
      arrow: "top-3/4 left-0 -translate-x-1/2 -translate-y-1/2",
    },
  },
};

export interface HoverCalloutTooltipProps {
  label: ReactNode;
  side?: HoverCalloutSide;
  /** Arrow position on the callout edge facing the trigger. Use `start` (1/4) for left-edge controls. */
  arrowAlign?: HoverCalloutArrowAlign;
  children: ReactNode;
  className?: string;
  forceVisible?: boolean;
  /** When set, the callout is clickable while visible (Playlight discovery). */
  onCalloutClick?: () => void;
}

/** Playlight-style hover callout with a rotated-square arrow. */
export function HoverCalloutTooltip({
  label,
  side = "top",
  arrowAlign = "center",
  children,
  className,
  forceVisible = false,
  onCalloutClick,
}: HoverCalloutTooltipProps) {
  const [isHovered, setIsHovered] = useState(false);
  const visible = forceVisible || isHovered;
  const layout = SIDE_LAYOUT[side][arrowAlign];
  const calloutClickable = !!onCalloutClick;

  const callout = (
    <>
      <span className="whitespace-nowrap">{label}</span>
      <div
        className={cn(
          "absolute rotate-45 bg-inherit p-1",
          layout.arrow,
        )}
        aria-hidden
      />
    </>
  );

  return (
    <div
      className={cn("relative inline-flex shrink-0 overflow-visible", className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {calloutClickable ? (
        <button
          type="button"
          onClick={onCalloutClick}
          tabIndex={visible ? 0 : -1}
          aria-hidden={!visible}
          className={cn(
            CALLOUT_BASE,
            layout.callout,
            visible
              ? "cursor-pointer opacity-100 hover:bg-primary/90"
              : "opacity-0",
            !visible && "pointer-events-none",
          )}
        >
          {callout}
        </button>
      ) : (
        <div
          className={cn(
            CALLOUT_BASE,
            layout.callout,
            visible ? "opacity-100" : "opacity-0",
          )}
          aria-hidden={!visible}
        >
          {callout}
        </div>
      )}
      {children}
    </div>
  );
}
