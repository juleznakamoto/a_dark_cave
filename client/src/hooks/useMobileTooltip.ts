
import { useState, useEffect, useRef } from "react";
import { useIsMobile } from "./use-mobile";

export function useMobileTooltip() {
  const isMobile = useIsMobile();
  const [openTooltipId, setOpenTooltipId] = useState<string | null>(null);

  // Effect to handle click outside of tooltip on mobile
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openTooltipId && !event.target?.closest('[role="tooltip"]')) {
        setOpenTooltipId(null);
      }
    };

    if (isMobile && openTooltipId) {
      document.addEventListener("click", handleClickOutside, true);
    }

    return () => {
      document.removeEventListener("click", handleClickOutside, true);
    };
  }, [openTooltipId, isMobile]);

  const handleTooltipClick = (id: string, e: React.MouseEvent) => {
    if (!isMobile) return;
    
    e.stopPropagation();
    setOpenTooltipId(openTooltipId === id ? null : id);
  };

  const isTooltipOpen = (id: string) => {
    return isMobile ? openTooltipId === id : undefined;
  };

  return {
    isMobile,
    handleTooltipClick,
    isTooltipOpen,
    closeTooltip: () => setOpenTooltipId(null),
  };
}

export function useMobileButtonTooltip() {
  const isMobile = useIsMobile();
  const [openTooltipId, setOpenTooltipId] = useState<string | null>(null);
  const pressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [pressingId, setPressingId] = useState<string | null>(null);

  // Effect to handle click outside of tooltip on mobile
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openTooltipId && !event.target?.closest('[role="tooltip"]')) {
        setOpenTooltipId(null);
      }
    };

    if (isMobile && openTooltipId) {
      document.addEventListener("click", handleClickOutside, true);
    }

    return () => {
      document.removeEventListener("click", handleClickOutside, true);
    };
  }, [openTooltipId, isMobile]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (pressTimerRef.current) {
        clearTimeout(pressTimerRef.current);
      }
    };
  }, []);

  const handleWrapperClick = (id: string, disabled: boolean, isCoolingDown: boolean, e: React.MouseEvent) => {
    // Not used anymore, keeping for backward compatibility
  };

  const handleMouseDown = (id: string, disabled: boolean, isCoolingDown: boolean, e: React.MouseEvent) => {
    if (!isMobile || isCoolingDown) return;
    
    setPressingId(id);
    
    // Start timer to show tooltip after 300ms for both active and inactive buttons
    pressTimerRef.current = setTimeout(() => {
      setOpenTooltipId(id);
      setPressingId(null);
    }, 300);
  };

  const handleMouseUp = (id: string, disabled: boolean, onClick: () => void, e: React.MouseEvent) => {
    if (!isMobile) return;
    
    // Clear the timer
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
    
    // If tooltip is already open, close it
    if (openTooltipId === id) {
      e.preventDefault();
      e.stopPropagation();
      setPressingId(null);
      setOpenTooltipId(null);
      return;
    }
    
    // If we were pressing and didn't show tooltip yet, execute the action (only if not disabled)
    if (pressingId === id) {
      setPressingId(null);
      if (!disabled) {
        // Don't prevent default, allow normal button click
        return;
      } else {
        // For disabled buttons, quick tap should also show tooltip
        e.preventDefault();
        e.stopPropagation();
        setOpenTooltipId(id);
      }
    }
    
    setPressingId(null);
  };

  const handleTouchStart = (id: string, disabled: boolean, isCoolingDown: boolean, e: React.TouchEvent) => {
    if (!isMobile || isCoolingDown) return;
    
    setPressingId(id);
    
    // Start timer to show tooltip after 300ms for both active and inactive buttons
    pressTimerRef.current = setTimeout(() => {
      setOpenTooltipId(id);
      setPressingId(null);
    }, 300);
  };

  const handleTouchEnd = (id: string, disabled: boolean, onClick: () => void, e: React.TouchEvent) => {
    if (!isMobile) return;
    
    // Clear the timer
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
    
    // If tooltip is already open, close it
    if (openTooltipId === id) {
      e.preventDefault();
      e.stopPropagation();
      setPressingId(null);
      setOpenTooltipId(null);
      return;
    }
    
    // If we were pressing and didn't show tooltip yet
    if (pressingId === id) {
      setPressingId(null);
      if (!disabled) {
        // Allow the click to proceed normally for active buttons
        onClick();
      } else {
        // For disabled buttons, quick tap should also show tooltip
        e.preventDefault();
        e.stopPropagation();
        setOpenTooltipId(id);
      }
    } else {
      setPressingId(null);
    }
  };

  const isTooltipOpen = (id: string) => {
    return isMobile ? openTooltipId === id : undefined;
  };

  return {
    isMobile,
    handleWrapperClick,
    handleMouseDown,
    handleMouseUp,
    handleTouchStart,
    handleTouchEnd,
    isTooltipOpen,
    closeTooltip: () => setOpenTooltipId(null),
  };
}
