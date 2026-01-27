import React, { useRef } from "react";
import { useGlobalTooltip } from "@/hooks/useGlobalTooltip";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface TooltipWrapperProps {
  children: React.ReactElement;
  tooltip?: React.ReactNode;
  tooltipId?: string;
  disabled?: boolean;
  className?: string;
  onMouseEnter?: (e?: React.MouseEvent<HTMLDivElement>) => void;
  onMouseLeave?: (e?: React.MouseEvent<HTMLDivElement>) => void;
  onClick?: () => void;
}

/**
 * Wrapper component that adds consistent tooltip behavior to any element
 * - Desktop: tooltips shown on hover AND long press (300ms)
 * - Mobile/Tablets: tooltips shown on long press (300ms) or click if disabled
 * - Only one tooltip open at a time globally
 */
export function TooltipWrapper({
  children,
  tooltip,
  tooltipId,
  disabled = false,
  className = "relative inline-block",
  onMouseEnter,
  onMouseLeave,
  onClick,
}: TooltipWrapperProps) {
  const globalTooltip = useGlobalTooltip();
  const actionExecutedRef = useRef<boolean>(false);

  // Generate a unique tooltip ID if not provided
  const finalTooltipId = tooltipId || `tooltip-${Math.random().toString(36).substr(2, 9)}`;

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    onMouseEnter?.(e);
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    onMouseLeave?.(e);
  };

  // If no tooltip, return children without wrapper
  if (!tooltip) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div
      className={className}
      onClick={globalTooltip.isMobile ? (e) => {
        // Don't show tooltip if action was just executed
        if (actionExecutedRef.current) return;

        // Only show tooltip if element is disabled
        if (disabled) {
          e.stopPropagation();
          globalTooltip.handleWrapperClick(finalTooltipId, disabled, false, e);
        }
      } : undefined}
      onMouseDown={(e) => {
        // Start hold timer for tooltip (works on all devices including tablets)
        globalTooltip.handleMouseDown(finalTooltipId, disabled, false, e);
      }}
      onMouseUp={(e) => {
        // Don't show tooltip if action was just executed
        if (actionExecutedRef.current) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }

        globalTooltip.handleMouseUp(finalTooltipId, disabled, onClick || (() => {}), e);
      }}
      onTouchStart={(e) => {
        // Start hold timer for tooltip (works on all devices including tablets)
        globalTooltip.handleTouchStart(finalTooltipId, disabled, false, e);
      }}
      onTouchEnd={(e) => {
        // Don't show tooltip if action was just executed
        if (actionExecutedRef.current) {
          if (e.cancelable) e.preventDefault();
          e.stopPropagation();
          return;
        }

        globalTooltip.handleTouchEnd(finalTooltipId, disabled, onClick || (() => {}), e);
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <TooltipProvider>
        <Tooltip 
          open={globalTooltip.isTooltipOpen(finalTooltipId)} 
          delayDuration={300}
        >
          <TooltipTrigger asChild>
            <span className="block w-full">
              {children}
            </span>
          </TooltipTrigger>
          <TooltipContent>{tooltip}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
