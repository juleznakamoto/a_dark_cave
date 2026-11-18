import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

/** How long the grab knob stays visible after a click or drag. */
export const PANEL_RESIZE_HANDLE_REVEAL_MS = 3000;

interface PanelResizeHandleProps {
  /**
   * Which panel this handle belongs to. Determines the desktop edge it hugs:
   * the side panel handle sits on the panel's right edge, the log handle on its
   * left edge. Both line up with the two divider lines around the center column.
   * On mobile both handles sit on the panel's bottom edge.
   */
  edge: "sidePanel" | "log";
  onPointerDown: (e: ReactPointerEvent) => void;
  /** Double-click / double-tap resets the panel to its responsive default. */
  onReset: () => void;
}

/**
 * A grab handle overlaying a panel divider. Horizontal (row-resize) on mobile,
 * vertical (col-resize) on desktop, with a centered knob the user can drag.
 *
 * The knob stays hidden until hover, or until a click or drag, which keeps it
 * visible for a few seconds (phones have no hover). It also stays up for the
 * whole press, even when that lasts longer than the reveal window. It fades
 * out over a second. Showing it stays quick.
 */
export default function PanelResizeHandle({
  edge,
  onPointerDown,
  onReset,
}: PanelResizeHandleProps) {
  const [revealed, setRevealed] = useState(false);
  const hideTimerRef = useRef<number | null>(null);
  const pressedRef = useRef(false);

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current != null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const scheduleHide = useCallback(() => {
    clearHideTimer();
    hideTimerRef.current = window.setTimeout(() => {
      hideTimerRef.current = null;
      if (!pressedRef.current) setRevealed(false);
    }, PANEL_RESIZE_HANDLE_REVEAL_MS);
  }, [clearHideTimer]);

  const revealHandle = useCallback(() => {
    setRevealed(true);
    scheduleHide();
  }, [scheduleHide]);

  useEffect(() => clearHideTimer, [clearHideTimer]);

  const handlePointerDown = (e: ReactPointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    pressedRef.current = true;
    revealHandle();
    onPointerDown(e);
  };

  const endPress = () => {
    if (!pressedRef.current) return;
    pressedRef.current = false;
    revealHandle();
  };

  const positionClasses =
    edge === "sidePanel"
      ? "left-0 right-0 bottom-0 h-4 cursor-row-resize md:left-auto md:top-0 md:bottom-0 md:right-0 md:h-auto md:w-4 md:cursor-col-resize"
      : "left-0 right-0 bottom-0 h-4 cursor-row-resize md:right-auto md:top-0 md:bottom-0 md:left-0 md:h-auto md:w-4 md:cursor-col-resize";

  return (
    <div
      role="separator"
      className={`group absolute z-30 flex touch-none select-none items-center justify-center ${positionClasses}`}
      onPointerDown={handlePointerDown}
      onPointerUp={endPress}
      onPointerCancel={endPress}
      onLostPointerCapture={endPress}
      onDoubleClick={onReset}
      data-testid={`panel-resize-${edge}`}
      data-revealed={revealed ? "true" : "false"}
    >
      <span
        className={`pointer-events-none h-1 w-8 rounded-full bg-muted-foreground transition-opacity md:h-10 md:w-1 ${
          revealed
            ? "opacity-100 duration-150"
            : "opacity-0 duration-1000 group-hover:opacity-100 group-hover:duration-150 group-active:opacity-100 group-active:duration-150"
        }`}
      />
    </div>
  );
}
