import { type PointerEvent as ReactPointerEvent } from "react";

interface PanelResizeHandleProps {
  /**
   * Which panel this handle belongs to. Determines the desktop edge it hugs:
   * the side panel handle sits on the panel's right edge, the log handle on its
   * left edge — both lining up with the two divider lines around the center column.
   * On mobile both handles sit on the panel's bottom edge.
   */
  edge: "sidePanel" | "log";
  onPointerDown: (e: ReactPointerEvent) => void;
  /** Double-click / double-tap resets the panel to its responsive default. */
  onReset: () => void;
  label: string;
}

/**
 * A grab handle overlaying a panel divider. Horizontal (row-resize) on mobile,
 * vertical (col-resize) on desktop, with a centered knob the user can drag.
 */
export default function PanelResizeHandle({
  edge,
  onPointerDown,
  onReset,
  label,
}: PanelResizeHandleProps) {
  const positionClasses =
    edge === "sidePanel"
      ? "left-0 right-0 bottom-0 h-3 cursor-row-resize md:left-auto md:top-0 md:bottom-0 md:right-0 md:h-auto md:w-3 md:cursor-col-resize"
      : "left-0 right-0 bottom-0 h-3 cursor-row-resize md:right-auto md:top-0 md:bottom-0 md:left-0 md:h-auto md:w-3 md:cursor-col-resize";

  return (
    <div
      role="separator"
      aria-label={label}
      title={label}
      className={`group absolute z-30 flex touch-none select-none items-center justify-center ${positionClasses}`}
      onPointerDown={onPointerDown}
      onDoubleClick={onReset}
      data-testid={`panel-resize-${edge}`}
    >
      <span className="pointer-events-none h-1 w-8 rounded-full bg-border/70 transition-colors group-hover:bg-muted-foreground group-active:bg-muted-foreground md:h-10 md:w-1" />
    </div>
  );
}
