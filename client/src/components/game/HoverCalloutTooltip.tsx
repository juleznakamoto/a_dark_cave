import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { Z_INDEX } from "@/lib/z-index";
import { isGameTabHidden, subscribeGameTabHidden } from "@/lib/tabVisibility";

export type HoverCalloutSide = "top" | "left" | "right" | "bottom";

/** Arrow anchor along the callout edge facing the trigger (1/4, 1/2, or 3/4). */
export type HoverCalloutArrowAlign = "start" | "center" | "end";

const CALLOUT_CHROME =
  "flex appearance-none [-webkit-appearance:none] rounded-md font-semibold leading-none tracking-wide text-primary-foreground shadow-md transition-opacity duration-300";

const CALLOUT_SIZE = {
  sm: "px-2 py-1.5 text-2xs",
  /** Footer Playlight / Steam: same type size as footer labels, slightly roomier padding. */
  md: "px-2.5 py-1.5 text-xs",
} as const;

/** Matches `mb-1.5` / `mt-1.5` on in-flow callouts. */
const PORTAL_GAP_PX = 6;
/** Matches `-left-2` / `-right-2` on in-flow side callouts. */
const PORTAL_SIDE_GAP_PX = 8;

/** Touch taps synthesize mouseenter; only fine pointers should drive hover tooltips. */
function isHoverCapablePointer(pointerType: string): boolean {
  return pointerType === "mouse" || pointerType === "pen";
}

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

function alignRatio(align: HoverCalloutArrowAlign): number {
  if (align === "start") return 0.25;
  if (align === "end") return 0.75;
  return 0.5;
}

function portalCalloutStyle(
  side: HoverCalloutSide,
  arrowAlign: HoverCalloutArrowAlign,
  rect: DOMRect,
): CSSProperties {
  const ratio = alignRatio(arrowAlign);
  const zIndex = Z_INDEX.tooltip;

  switch (side) {
    case "top":
      return {
        position: "fixed",
        zIndex,
        left: rect.left + rect.width * ratio,
        top: rect.top - PORTAL_GAP_PX,
        transform: "translate(-50%, -100%)",
      };
    case "bottom":
      return {
        position: "fixed",
        zIndex,
        left: rect.left + rect.width * ratio,
        top: rect.bottom + PORTAL_GAP_PX,
        transform: "translate(-50%, 0)",
      };
    case "left":
      return {
        position: "fixed",
        zIndex,
        left: rect.left - PORTAL_SIDE_GAP_PX,
        top: rect.top + rect.height * ratio,
        transform: "translate(-100%, -50%)",
      };
    case "right":
      return {
        position: "fixed",
        zIndex,
        left: rect.right + PORTAL_SIDE_GAP_PX,
        top: rect.top + rect.height * ratio,
        transform: "translate(0, -50%)",
      };
  }
}

export interface HoverCalloutTooltipProps {
  label: ReactNode;
  side?: HoverCalloutSide;
  /** Arrow position on the callout edge facing the trigger. Use `start` (1/4) for left-edge controls. */
  arrowAlign?: HoverCalloutArrowAlign;
  children: ReactNode;
  className?: string;
  forceVisible?: boolean;
  /** Overrides the default 300ms opacity transition. */
  fadeDurationMs?: number;
  /** When false, only `forceVisible` shows the callout (no hover). Default true. */
  hoverEnabled?: boolean;
  /** When set, the callout is clickable while visible (Playlight discovery). */
  onCalloutClick?: () => void;
  /** Fires once when a fine pointer (mouse/pen) enters the trigger wrapper. */
  onHoverStart?: () => void;
  /**
   * Render the callout on `document.body` so it can paint above other layers
   * (e.g. the floating invite button over the footer Steam wishlist hint).
   */
  portal?: boolean;
  /** `sm` is header chrome. `md` matches footer label size (`text-xs`). */
  size?: keyof typeof CALLOUT_SIZE;
}

/** Playlight-style hover callout with a rotated-square arrow. */
export function HoverCalloutTooltip({
  label,
  side = "top",
  arrowAlign = "center",
  children,
  className,
  forceVisible = false,
  fadeDurationMs,
  hoverEnabled = true,
  onCalloutClick,
  onHoverStart,
  portal = false,
  size = "sm",
}: HoverCalloutTooltipProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [triggerRect, setTriggerRect] = useState<DOMRect | null>(null);
  const visible = forceVisible || (hoverEnabled && isHovered);

  useEffect(() => {
    return subscribeGameTabHidden(() => {
      if (isGameTabHidden()) setIsHovered(false);
    });
  }, []);
  const layout = SIDE_LAYOUT[side][arrowAlign];
  const calloutClickable = !!onCalloutClick;

  const updateTriggerRect = useCallback(() => {
    const node = wrapRef.current;
    if (!node) return;
    setTriggerRect(node.getBoundingClientRect());
  }, []);

  useLayoutEffect(() => {
    if (!portal) return;
    updateTriggerRect();
    window.addEventListener("resize", updateTriggerRect);
    window.addEventListener("scroll", updateTriggerRect, true);
    return () => {
      window.removeEventListener("resize", updateTriggerRect);
      window.removeEventListener("scroll", updateTriggerRect, true);
    };
  }, [portal, updateTriggerRect, visible]);

  const calloutInner = (
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

  const showHoverTooltip = (e: PointerEvent) => {
    if (!hoverEnabled) return;
    if (isHoverCapablePointer(e.pointerType)) {
      setIsHovered(true);
      onHoverStart?.();
    }
  };

  const hideHoverTooltip = (e: PointerEvent) => {
    if (!hoverEnabled) return;
    if (isHoverCapablePointer(e.pointerType)) {
      setIsHovered(false);
    }
  };

  const fadeStyle: CSSProperties | undefined =
    fadeDurationMs === undefined
      ? undefined
      : { transitionDuration: `${fadeDurationMs}ms` };

  const portalStyle: CSSProperties | undefined =
    portal && triggerRect
      ? { ...portalCalloutStyle(side, arrowAlign, triggerRect), ...fadeStyle }
      : fadeStyle;

  const calloutClassName = cn(
    CALLOUT_CHROME,
    "bg-primary",
    CALLOUT_SIZE[size],
    portal ? "fixed" : "absolute z-[1]",
    !portal && layout.callout,
    calloutClickable
      ? visible
        ? "pointer-events-auto cursor-pointer opacity-100 hover:bg-primary/90"
        : "pointer-events-none opacity-0"
      : cn("pointer-events-none", visible ? "opacity-100" : "opacity-0"),
  );

  const calloutEl = calloutClickable ? (
    <button
      type="button"
      onClick={onCalloutClick}
      onPointerEnter={showHoverTooltip}
      tabIndex={visible ? 0 : -1}
      aria-hidden={!visible}
      className={calloutClassName}
      style={portalStyle}
    >
      {calloutInner}
    </button>
  ) : (
    <div
      className={calloutClassName}
      style={portalStyle}
      aria-hidden={!visible}
    >
      {calloutInner}
    </div>
  );

  const portaledCallout =
    portal && typeof document !== "undefined"
      ? triggerRect
        ? createPortal(calloutEl, document.body)
        : null
      : calloutEl;

  return (
    <div
      ref={wrapRef}
      className={cn(
        "relative inline-flex shrink-0 overflow-visible touch-manipulation",
        className,
      )}
      onPointerEnter={showHoverTooltip}
      onPointerLeave={hideHoverTooltip}
    >
      {portaledCallout}
      {children}
    </div>
  );
}
