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

  // Effect to handle click outside of tooltip on mobile
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openTooltipId && !event.target?.closest('[role="tooltip"]')) {
        globalTooltipManager.setOpenTooltip(null);
      }
    };

    if (isMobile && openTooltipId) {
      document.addEventListener("click", handleClickOutside, true);
    }

    return () => {
      document.removeEventListener("click", handleClickOutside, true);
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
    // Clear the timer
    globalTooltipManager.clearPressTimer(id);
    
    // If tooltip is already open, close it
    if (globalTooltipManager.isTooltipOpen(id)) {
      const wasOpenedByTimer = globalTooltipManager.wasOpenedByTimer(id);
      globalTooltipManager.setOpenTooltip(null);
      globalTooltipManager.clearOpenedByTimer(id);
      
      // If tooltip was opened by long press timer, prevent click (user was just viewing tooltip)
      if (wasOpenedByTimer) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      
      // If tooltip was already open (not from timer), allow click to proceed
      if (!disabled) {
        // Don't prevent default - let the button's onClick handle it
        return;
      }
      // If disabled, prevent the click
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    
    // If we were pressing and didn't show tooltip yet, execute the action (only if not disabled)
    if (globalTooltipManager.isPressing(id)) {
      if (!disabled) {
        // Execute the action and prevent the Button's onClick from firing
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }
    }
  }, []);

  const handleTouchStart = useCallback((id: string, disabled: boolean, isCoolingDown: boolean, e: React.TouchEvent) => {
    // Clear any existing timer before creating a new one
    globalTooltipManager.clearPressTimer(id);

    // Start timer to show tooltip after 300ms (works on all devices including tablets)
    const timer = setTimeout(() => {
      globalTooltipManager.setOpenTooltip(id, true); // Mark as opened by timer
      globalTooltipManager.clearPressTimer(id);
    }, 300);

    globalTooltipManager.setPressTimer(id, timer);
  }, []);

  const handleTouchEnd = useCallback((id: string, disabled: boolean, onClick: () => void, e: React.TouchEvent) => {
    // Clear the timer
    globalTooltipManager.clearPressTimer(id);
    
    // If tooltip is already open, close it
    if (globalTooltipManager.isTooltipOpen(id)) {
      const wasOpenedByTimer = globalTooltipManager.wasOpenedByTimer(id);
      globalTooltipManager.setOpenTooltip(null);
      globalTooltipManager.clearOpenedByTimer(id);
      
      // If tooltip was opened by long press timer, prevent click (user was just viewing tooltip)
      if (wasOpenedByTimer) {
        if (e.cancelable) e.preventDefault();
        e.stopPropagation();
        return;
      }
      
      // If tooltip was already open (not from timer), allow click to proceed
      if (!disabled) {
        // Don't prevent default - let the button's onClick handle it
        return;
      }
      // If disabled, prevent the click
      if (e.cancelable) e.preventDefault();
      e.stopPropagation();
      return;
    }
    
    // If we were pressing and didn't show tooltip yet, execute the action (only if not disabled)
    if (globalTooltipManager.isPressing(id)) {
      if (!disabled) {
        // Execute the action and prevent the Button's onClick from firing
        if (e.cancelable) e.preventDefault();
        e.stopPropagation();
        onClick();
      }
    }
  }, []);

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
