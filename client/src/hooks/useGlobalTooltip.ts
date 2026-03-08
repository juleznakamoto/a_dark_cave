import { useState, useEffect, useRef, useCallback } from "react";
import { useIsMobile } from "./use-mobile";

/**
 * Global tooltip state manager
 * Ensures only one tooltip is open at a time across the entire application
 */
class GlobalTooltipManager {
  private openTooltipId: string | null = null;
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

  setOpenTooltip(id: string | null, openedByTimer: boolean = false) {
    // Clear any existing press timers when opening a new tooltip
    if (id !== this.openTooltipId) {
      this.clearAllPressTimers();
      this.tooltipsOpenedByTimer.clear();
    }
    
    this.openTooltipId = id;
    if (openedByTimer && id) {
      this.tooltipsOpenedByTimer.add(id);
    }
    this.listeners.forEach((listener) => listener(id));
  }

  getOpenTooltip() {
    return this.openTooltipId;
  }

  isTooltipOpen(id: string) {
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

/**
 * Hook for managing tooltip state globally
 * Ensures only one tooltip is open at a time
 */
export function useGlobalTooltip() {
  const isMobile = useIsMobile();
  const [openTooltipId, setOpenTooltipId] = useState<string | null>(null);

  useEffect(() => {
    // Subscribe to global tooltip changes
    const unsubscribe = globalTooltipManager.subscribe((id) => {
      setOpenTooltipId(id);
    });

    // Initialize with current global state
    setOpenTooltipId(globalTooltipManager.getOpenTooltip());

    return unsubscribe;
  }, []);

  // Effect to handle click/tap outside of tooltip - closes when user taps elsewhere
  useEffect(() => {
    const isOutsideTooltip = (target: EventTarget | null) =>
      openTooltipId && target && !(target as Element).closest?.('[role="tooltip"]');

    const handleOutside = (event: MouseEvent | TouchEvent) => {
      const target = "touches" in event ? (event as TouchEvent).target : (event as MouseEvent).target;
      if (isOutsideTooltip(target)) {
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
    // Return tooltip open state for long press tooltips (works on all devices)
    return globalTooltipManager.isTooltipOpen(id) ? true : undefined;
  }, []);

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

  const handleMouseUp = useCallback((id: string, disabled: boolean, onClick: () => void, e: React.MouseEvent) => {
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
      
      // If tooltip was already open (not from timer), close on release and allow click to proceed
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

      if (!disabled) {
        // Execute the action and prevent the Button's onClick from firing
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

  const handleTouchEnd = useCallback((id: string, disabled: boolean, onClick: () => void, e: React.TouchEvent) => {
    // Capture state before clearing (clearPressTimer removes from pressingIds)
    const wasPressing = globalTooltipManager.isPressing(id);
    const tooltipWasOpen = globalTooltipManager.isTooltipOpen(id);
    globalTooltipManager.clearPressTimer(id);
    
    // If tooltip is already open
    if (tooltipWasOpen) {
      const wasOpenedByTimer = globalTooltipManager.wasOpenedByTimer(id);
      
      // If tooltip was opened by long press: keep it open, prevent action. User taps elsewhere to close.
      if (wasOpenedByTimer) {
        if (e.cancelable) e.preventDefault();
        e.stopPropagation();
        globalTooltipManager.clearOpenedByTimer(id);
        return;
      }
      
      // If tooltip was already open (not from timer), close on release and allow click to proceed
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

      if (!disabled) {
        // Execute the action and prevent the Button's onClick from firing
        if (e.cancelable) e.preventDefault();
        e.stopPropagation();
        onClick();
      }
    }
  }, [isMobile]);

  const closeTooltip = useCallback(() => {
    globalTooltipManager.setOpenTooltip(null);
  }, []);

  return {
    isMobile,
    openTooltipId,
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
