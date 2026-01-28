
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
