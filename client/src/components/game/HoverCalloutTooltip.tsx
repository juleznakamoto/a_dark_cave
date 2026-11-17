import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { useGameStore, isModalDialogOpen } from "@/game/state";
import { Z_INDEX } from "@/lib/z-index";
import { isGameTabHidden, subscribeGameTabHidden } from "@/lib/tabVisibility";
import {
  calloutArrowCss,
  placeCalloutInViewport,
  type HoverCalloutArrowAlign,
  type HoverCalloutSide,
} from "./hoverCalloutPlacement";

export type { HoverCalloutArrowAlign, HoverCalloutSide };

const CALLOUT_CHROME =
  "flex appearance-none [-webkit-appearance:none] rounded-md font-semibold leading-none tracking-wide text-primary-foreground shadow-md transition-opacity duration-300 text-[length:calc(0.75rem+var(--adc-text-delta,0px))]";

const CALLOUT_SIZE = {
  sm: "px-2 py-1.5",
  /** Footer Playlight / Steam: same 12px type, slightly roomier padding. */
  md: "px-2.5 py-1.5",
} as const;

/** Touch taps synthesize mouseenter; only fine pointers should drive hover tooltips. */
function isHoverCapablePointer(pointerType: string): boolean {
  return pointerType === "mouse" || pointerType === "pen";
}

/** A finger that slides farther than this is a scroll, not a tap. */
const TOUCH_PRESS_SLOP_PX = 10;

const INTERACTIVE_PRESS_SELECTOR =
  "button, a, input, select, textarea, [role='button'], [role='menuitem']";

/** Presses on real controls keep their own action. Informational marks toggle the callout. */
function isInteractivePressTarget(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    !!target.closest(INTERACTIVE_PRESS_SELECTOR)
  );
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
   * Visible callouts are always portaled so they can stay inside the viewport.
   * While a modal is open the callout drops below the backdrop.
   */
  portal?: boolean;
  /** `sm` is header chrome. `md` matches footer label size (12px). */
  size?: keyof typeof CALLOUT_SIZE;
  /** Space between the trigger and a top or bottom callout. Defaults to the shared gap. */
  gapPx?: number;
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
  gapPx,
}: HoverCalloutTooltipProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const calloutRef = useRef<HTMLElement | null>(null);
  const touchPressRef = useRef<{
    x: number;
    y: number;
    pointerId: number;
  } | null>(null);
  /** Pointerup already toggled; the click that follows must not toggle again. */
  const toggledForGestureRef = useRef(false);
  const [isHovered, setIsHovered] = useState(false);
  const [touchPinned, setTouchPinned] = useState(false);
  const [triggerRect, setTriggerRect] = useState<DOMRect | null>(null);
  const [calloutSize, setCalloutSize] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const visible = forceVisible || (hoverEnabled && (isHovered || touchPinned));
  const usePortal = portal || visible;
  const modalCovered = useGameStore(isModalDialogOpen);
  const calloutZIndex = modalCovered
    ? Z_INDEX.hoverCalloutUnderModal
    : Z_INDEX.hoverCallout;

  useEffect(() => {
    return subscribeGameTabHidden(() => {
      if (!isGameTabHidden()) return;
      setIsHovered(false);
      setTouchPinned(false);
    });
  }, []);

  useEffect(() => {
    if (!touchPinned) return;
    const dismissOnOutsidePress = (event: globalThis.PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (wrapRef.current?.contains(target)) return;
      if (calloutRef.current?.contains(target)) return;
      setTouchPinned(false);
    };
    document.addEventListener("pointerdown", dismissOnOutsidePress, true);
    return () => {
      document.removeEventListener("pointerdown", dismissOnOutsidePress, true);
    };
  }, [touchPinned]);
  const calloutClickable = !!onCalloutClick;

  const updateTriggerRect = useCallback(() => {
    const node = wrapRef.current;
    if (!node) return;
    setTriggerRect(node.getBoundingClientRect());
  }, []);

  useLayoutEffect(() => {
    if (!usePortal) return;
    updateTriggerRect();
    window.addEventListener("resize", updateTriggerRect);
    window.addEventListener("scroll", updateTriggerRect, true);
    return () => {
      window.removeEventListener("resize", updateTriggerRect);
      window.removeEventListener("scroll", updateTriggerRect, true);
    };
  }, [usePortal, updateTriggerRect, visible]);

  useLayoutEffect(() => {
    if (!visible) {
      setCalloutSize(null);
      return;
    }
    const node = calloutRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    setCalloutSize((prev) => {
      if (
        prev &&
        Math.abs(prev.width - rect.width) < 0.5 &&
        Math.abs(prev.height - rect.height) < 0.5
      ) {
        return prev;
      }
      return { width: rect.width, height: rect.height };
    });
  }, [visible, label, size, triggerRect]);

  const fadeStyle: CSSProperties | undefined =
    fadeDurationMs === undefined
      ? undefined
      : { transitionDuration: `${fadeDurationMs}ms` };

  const placement =
    triggerRect && calloutSize
      ? placeCalloutInViewport({
        side,
        arrowAlign,
        trigger: triggerRect,
        width: calloutSize.width,
        height: calloutSize.height,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        gapPx,
      })
      : null;

  const placed = visible && placement !== null;

  const portalStyle: CSSProperties | undefined = triggerRect
    ? {
      position: "fixed",
      zIndex: calloutZIndex,
      left: placement?.left ?? triggerRect.left,
      top: placement?.top ?? triggerRect.bottom,
      maxWidth: placement?.maxWidth,
      transform: undefined,
      visibility: placed ? "visible" : "hidden",
      ...fadeStyle,
    }
    : fadeStyle;

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

  const clearTouchPress = () => {
    touchPressRef.current = null;
  };

  const armTouchPress = (e: PointerEvent<HTMLDivElement>) => {
    if (!hoverEnabled || isHoverCapablePointer(e.pointerType)) return;
    if (isInteractivePressTarget(e.target)) return;
    touchPressRef.current = {
      x: e.clientX,
      y: e.clientY,
      pointerId: e.pointerId,
    };
    toggledForGestureRef.current = false;
  };

  const toggleTouchPress = (x: number, y: number, pointerId?: number) => {
    const start = touchPressRef.current;
    if (!start) return;
    if (pointerId !== undefined && start.pointerId !== pointerId) return;
    touchPressRef.current = null;
    const dx = x - start.x;
    const dy = y - start.y;
    if (dx * dx + dy * dy > TOUCH_PRESS_SLOP_PX * TOUCH_PRESS_SLOP_PX) return;
    toggledForGestureRef.current = true;
    setTouchPinned((open) => !open);
  };

  const finishTouchPress = (e: PointerEvent<HTMLDivElement>) => {
    if (isHoverCapablePointer(e.pointerType)) return;
    toggleTouchPress(e.clientX, e.clientY, e.pointerId);
  };

  const finishTouchClick = (e: MouseEvent<HTMLDivElement>) => {
    if (toggledForGestureRef.current) {
      toggledForGestureRef.current = false;
      clearTouchPress();
      return;
    }
    // Older iOS builds deliver click without a pointerup on a non-button.
    toggleTouchPress(e.clientX, e.clientY);
  };

  const setCalloutNode = (node: HTMLElement | null) => {
    calloutRef.current = node;
  };

  const arrowCss = calloutArrowCss(side, arrowAlign, placement);
  const calloutInner = (
    <>
      <span className="whitespace-nowrap">{label}</span>
      <div
        className="absolute bg-inherit p-1"
        style={{
          left: arrowCss.left,
          top: arrowCss.top,
          transform: "translate(-50%, -50%) rotate(45deg)",
        }}
        aria-hidden
      />
    </>
  );

  const calloutClassName = cn(
    CALLOUT_CHROME,
    "bg-primary",
    CALLOUT_SIZE[size],
    usePortal ? "fixed" : "absolute z-[1]",
    placed ? "opacity-100" : "opacity-0",
    calloutClickable && placed
      ? "pointer-events-auto cursor-pointer hover:bg-primary/90"
      : "pointer-events-none",
  );

  const calloutEl = calloutClickable ? (
    <button
      type="button"
      ref={setCalloutNode}
      onClick={onCalloutClick}
      onPointerEnter={showHoverTooltip}
      tabIndex={placed ? 0 : -1}
      aria-hidden={!placed}
      className={calloutClassName}
      style={portalStyle}
    >
      {calloutInner}
    </button>
  ) : (
    <div
      ref={setCalloutNode}
      className={calloutClassName}
      style={portalStyle}
      aria-hidden={!placed}
    >
      {calloutInner}
    </div>
  );

  const portaledCallout =
    usePortal && typeof document !== "undefined"
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
      onPointerDown={armTouchPress}
      onPointerUp={finishTouchPress}
      onPointerCancel={clearTouchPress}
      onClick={finishTouchClick}
    >
      {portaledCallout}
      {children}
    </div>
  );
}
