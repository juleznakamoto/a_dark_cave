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

  subscribe(listener: (id: string | null) => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  setOpenTooltip(id: string | null) {
    // Clear any existing press timers when opening a new tooltip
    if (id !== this.openTooltipId) {
      this.clearAllPressTimers();
    }

    this.openTooltipId = id;
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
    return isMobile ? globalTooltipManager.isTooltipOpen(id) : undefined;
  }, [isMobile]);

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
    if (!isMobile) return;

    // Clear any existing timer before creating a new one
    globalTooltipManager.clearPressTimer(id);

    // Don't prevent default to allow button interaction
    // Start timer to show tooltip after 300ms
    const timer = setTimeout(() => {
      globalTooltipManager.setOpenTooltip(id);
      globalTooltipManager.clearPressTimer(id);
    }, 300);

    globalTooltipManager.setPressTimer(id, timer);
  }, [isMobile]);

  const handleMouseUp = useCallback((id: string, disabled: boolean, onClick: () => void, e: React.MouseEvent) => {
    if (!isMobile) return;
    
    // Clear the timer
    globalTooltipManager.clearPressTimer(id);
    
    // If tooltip is already open, close it
    if (globalTooltipManager.isTooltipOpen(id)) {
      globalTooltipManager.setOpenTooltip(null);
      // If button is enabled, allow the click to proceed to the button
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
  }, [isMobile]);

  const handleTouchStart = useCallback((id: string, disabled: boolean, isCoolingDown: boolean, e: React.TouchEvent) => {
    if (!isMobile) return;

    // Clear any existing timer before creating a new one
    globalTooltipManager.clearPressTimer(id);

    // Start timer to show tooltip after 300ms
    const timer = setTimeout(() => {
      globalTooltipManager.setOpenTooltip(id);
      globalTooltipManager.clearPressTimer(id);
    }, 300);

    globalTooltipManager.setPressTimer(id, timer);
  }, [isMobile]);

  const handleTouchEnd = useCallback((id: string, disabled: boolean, onClick: () => void, e: React.TouchEvent) => {
    if (!isMobile) return;
    
    // Clear the timer
    globalTooltipManager.clearPressTimer(id);
    
    // If tooltip is already open, close it
    if (globalTooltipManager.isTooltipOpen(id)) {
      globalTooltipManager.setOpenTooltip(null);
      // If button is enabled, allow the click to proceed to the button
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
