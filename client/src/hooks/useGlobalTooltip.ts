import { useState, useEffect, useRef, useCallback } from "react";
import { useIsMobile } from "./use-mobile";

/**
 * Global tooltip state manager
 * Ensures only one tooltip is open at a time across the entire application
 */
class GlobalTooltipManager {
  private openTooltipId: string | null = null;
  private suppressed = false;
  private listeners: Set<(id: string | null) => void> = new Set();
  private pressTimers: Map<string, NodeJS.Timeout> = new Map();
  private pressingIds: Set<string> = new Set();
  private tooltipsOpenedByTimer: Set<string> = new Set();

  subscribe(listener: (id: string | null) => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((listener) => listener(this.openTooltipId));
  }

  setOpenTooltip(id: string | null, openedByTimer: boolean = false) {
    if (this.suppressed && id !== null) {
      return;
    }

    // Clear any existing press timers when opening a new tooltip
    if (id !== this.openTooltipId) {
      this.clearAllPressTimers();
      this.tooltipsOpenedByTimer.clear();
    }

    this.openTooltipId = id;
    if (openedByTimer && id) {
      this.tooltipsOpenedByTimer.add(id);
    }
    this.notify();
  }

  setSuppressed(suppressed: boolean) {
    if (this.suppressed === suppressed) return;
    this.suppressed = suppressed;
    if (suppressed) {
      this.clearAllPressTimers();
      this.openTooltipId = null;
      this.tooltipsOpenedByTimer.clear();
    }
    this.notify();
  }

  isSuppressed() {
    return this.suppressed;
  }

  getOpenTooltip() {
    return this.openTooltipId;
  }

  isTooltipOpen(id: string) {
    if (this.suppressed) return false;
    return this.openTooltipId === id;
  }

  clearAllPressTimers() {
    this.pressTimers.forEach((timer) => clearTimeout(timer));
    this.pressTimers.clear();
    this.pressingIds.clear();
  }

  wasOpenedByTimer(id: string) {
    return this.tooltipsOpenedByTimer.has(id);
  }

  clearOpenedByTimer(id: string) {
    this.tooltipsOpenedByTimer.delete(id);
  }

  setPressTimer(id: string, timer: NodeJS.Timeout) {
    // Clear any existing timer for this id
    const existingTimer = this.pressTimers.get(id);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }
    this.pressTimers.set(id, timer);
    this.pressingIds.add(id);
  }

  clearPressTimer(id: string) {
    const timer = this.pressTimers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.pressTimers.delete(id);
    }
    this.pressingIds.delete(id);
  }

  isPressing(id: string) {
    return this.pressingIds.has(id);
  }
}

const globalTooltipManager = new GlobalTooltipManager();

/** Close any open tooltip and cancel in-progress long-press timers. */
export function closeAllGlobalTooltips() {
  globalTooltipManager.clearAllPressTimers();
  globalTooltipManager.setOpenTooltip(null);
}

/**
 * While true, all global tooltips stay forced closed (blocks hover + long-press).
 * Use when a blocking modal overlay is open — tooltips are z-10000 and would
 * otherwise paint through the dimmed backdrop.
 */
export function setGlobalTooltipsSuppressed(suppressed: boolean) {
  globalTooltipManager.setSuppressed(suppressed);
}

/**
 * Hook for managing tooltip state globally
 * Ensures only one tooltip is open at a time
 */
export function useGlobalTooltip() {
  const isMobile = useIsMobile();
  const [openTooltipId, setOpenTooltipId] = useState<string | null>(null);
  const [tooltipsSuppressed, setTooltipsSuppressed] = useState(
    () => globalTooltipManager.isSuppressed(),
  );

  useEffect(() => {
    // Subscribe to global tooltip changes
    const unsubscribe = globalTooltipManager.subscribe((id) => {
      setOpenTooltipId(id);
      setTooltipsSuppressed(globalTooltipManager.isSuppressed());
    });

    // Initialize with current global state
    setOpenTooltipId(globalTooltipManager.getOpenTooltip());
    setTooltipsSuppressed(globalTooltipManager.isSuppressed());

    return unsubscribe;
  }, []);

  // Effect to handle click/tap outside of tooltip - closes when user taps elsewhere
  useEffect(() => {
    const shouldClose = (target: EventTarget | null) => {
      if (!openTooltipId || !target) return false;
      const el = target as Element;
      // Don't close if clicking inside the tooltip content
      if (el.closest?.('[role="tooltip"]')) return false;
      // Don't close if clicking on the trigger that opened this tooltip (prevents flash from synthetic click)
      if (el.closest?.(`[data-tooltip-trigger-id="${openTooltipId}"]`)) return false;
      return true;
    };

    const handleOutside = (event: MouseEvent | TouchEvent) => {
      const target = "touches" in event ? (event as TouchEvent).target : (event as MouseEvent).target;
      if (shouldClose(target)) {
        globalTooltipManager.setOpenTooltip(null);
      }
    };

    if (openTooltipId) {
      document.addEventListener("click", handleOutside, true);
      if (isMobile) {
        document.addEventListener("touchstart", handleOutside, true);
      }
    }

    return () => {
      document.removeEventListener("click", handleOutside, true);
      document.removeEventListener("touchstart", handleOutside, true);
    };
  }, [openTooltipId, isMobile]);

  const setOpenTooltip = useCallback((id: string | null) => {
    globalTooltipManager.setOpenTooltip(id);
  }, []);

  const isTooltipOpen = useCallback((id: string) => {
    // Force closed while modals suppress tooltips (hover tooltips use uncontrolled
    // mode via `undefined`, so only `false` actually hides them under overlays).
    if (globalTooltipManager.isSuppressed()) return false;
    // Return tooltip open state for long press tooltips (works on all devices)
    return globalTooltipManager.isTooltipOpen(id) ? true : undefined;
  }, [tooltipsSuppressed]);

  const handleWrapperClick = useCallback((id: string, disabled: boolean, isCoolingDown: boolean, e: React.MouseEvent) => {
    if (!isMobile || isCoolingDown) return;

    // On mobile with tooltip, handle inactive buttons specially
    if (disabled) {
      e.stopPropagation();
      const currentOpen = globalTooltipManager.getOpenTooltip();
      globalTooltipManager.setOpenTooltip(currentOpen === id ? null : id);
    }
  }, [isMobile]);

  const handleMouseDown = useCallback((id: string, disabled: boolean, isCoolingDown: boolean, e: React.MouseEvent) => {
    // Clear any existing timer before creating a new one
    globalTooltipManager.clearPressTimer(id);

    // Don't prevent default to allow button interaction
    // Start timer to show tooltip after 300ms (works on all devices including tablets)
    const timer = setTimeout(() => {
      globalTooltipManager.setOpenTooltip(id, true); // Mark as opened by timer
      globalTooltipManager.clearPressTimer(id);
    }, 300);

    globalTooltipManager.setPressTimer(id, timer);
  }, []);

  const handleMouseUp = useCallback((
    id: string,
    disabled: boolean,
    onClick: () => void,
    e: React.MouseEvent,
    preferNativeClick = true,
  ) => {
    const wasPressing = globalTooltipManager.isPressing(id);
    const tooltipWasOpen = globalTooltipManager.isTooltipOpen(id);
    globalTooltipManager.clearPressTimer(id);

    // If tooltip is already open
    if (tooltipWasOpen) {
      const wasOpenedByTimer = globalTooltipManager.wasOpenedByTimer(id);

      // If tooltip was opened by long press: keep it open, prevent action. User clicks elsewhere to close.
      if (wasOpenedByTimer) {
        e.preventDefault();
        e.stopPropagation();
        globalTooltipManager.clearOpenedByTimer(id);
        return;
      }

      // If tooltip was already open (not from timer), close on release and allow
      // the normal child click to proceed. Closing a tooltip should not itself
      // execute an action.
      globalTooltipManager.setOpenTooltip(null);
      globalTooltipManager.clearOpenedByTimer(id);
      if (!disabled) return;
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    // On mobile, short taps on disabled controls should open the tooltip directly.
    // Relying on a later click is unreliable because disabled buttons may not emit one.
    if (wasPressing && !tooltipWasOpen) {
      if (disabled && isMobile) {
        e.preventDefault();
        e.stopPropagation();
        const currentOpen = globalTooltipManager.getOpenTooltip();
        globalTooltipManager.setOpenTooltip(currentOpen === id ? null : id);
        return;
      }

      if (!disabled && preferNativeClick) {
        // Let the native button click handle the action (standard touch → click path).
        return;
      }

      if (!disabled) {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }
    }
  }, [isMobile]);

  const handleTouchStart = useCallback((id: string, disabled: boolean, isCoolingDown: boolean, e: React.TouchEvent) => {
    // Clear any existing timer before creating a new one
    globalTooltipManager.clearPressTimer(id);

    // Start timer to show tooltip (250ms on mobile for faster feedback, 300ms on desktop)
    const delay = isMobile ? 250 : 300;
    const timer = setTimeout(() => {
      globalTooltipManager.setOpenTooltip(id, true); // Mark as opened by timer
      globalTooltipManager.clearPressTimer(id);
    }, delay);

    globalTooltipManager.setPressTimer(id, timer);
  }, [isMobile]);

  const handleTouchEnd = useCallback((
    id: string,
    disabled: boolean,
    onClick: () => void,
    e: React.TouchEvent,
    preferNativeClick = true,
  ) => {
    // Capture state before clearing (clearPressTimer removes from pressingIds)
    const wasPressing = globalTooltipManager.isPressing(id);
    const tooltipWasOpen = globalTooltipManager.isTooltipOpen(id);
    globalTooltipManager.clearPressTimer(id);

    // If tooltip is already open
    if (tooltipWasOpen) {
      const wasOpenedByTimer = globalTooltipManager.wasOpenedByTimer(id);

      // If tooltip was opened by long press: keep it open, prevent action. User clicks elsewhere to close.
      if (wasOpenedByTimer) {
        if (e.cancelable) e.preventDefault();
        e.stopPropagation();
        globalTooltipManager.clearOpenedByTimer(id);
        return;
      }

      // If tooltip was already open (not from timer), close on release and allow
      // the normal child click to proceed. Closing a tooltip should not itself
      // execute an action.
      globalTooltipManager.setOpenTooltip(null);
      globalTooltipManager.clearOpenedByTimer(id);
      if (!disabled) return;
      if (e.cancelable) e.preventDefault();
      e.stopPropagation();
      return;
    }

    // On mobile, short taps on disabled controls should open the tooltip directly.
    // Relying on a later click is unreliable because disabled buttons may not emit one.
    if (wasPressing && !tooltipWasOpen) {
      if (disabled) {
        if (e.cancelable) e.preventDefault();
        e.stopPropagation();
        const currentOpen = globalTooltipManager.getOpenTooltip();
        globalTooltipManager.setOpenTooltip(currentOpen === id ? null : id);
        return;
      }

      if (preferNativeClick) {
        // Let the native button click handle the action (standard touch → click path).
        return;
      }

      if (!disabled) {
        if (e.cancelable) e.preventDefault();
        e.stopPropagation();
        onClick();
      }
    }
  }, [isMobile]);

  const closeTooltip = useCallback(() => {
    closeAllGlobalTooltips();
  }, []);

  return {
    isMobile,
    openTooltipId,
    tooltipsSuppressed,
    setOpenTooltip,
    isTooltipOpen,
    handleWrapperClick,
    handleMouseDown,
    handleMouseUp,
    handleTouchStart,
    handleTouchEnd,
    closeTooltip,
  };
}
