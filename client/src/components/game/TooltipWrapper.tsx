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
  onMouseEnter?: (e?: React.MouseEvent<HTMLDivElement>) => void;
  onMouseLeave?: (e?: React.MouseEvent<HTMLDivElement>) => void;
  onClick?: () => void;
}

/**
 * Wrapper component that adds consistent tooltip behavior to any element
 * - Desktop: tooltips shown on hover
 * - Mobile: tooltips shown on long press (300ms) or click if disabled
 * - Only one tooltip open at a time globally
 */
export function TooltipWrapper({
  children,
  tooltip,
  tooltipId,
  disabled = false,
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
    return <div className="relative inline-block">{children}</div>;
  }

  return (
    <div
      className="relative inline-block"
      onClick={globalTooltip.isMobile ? (e) => {
        // Don't show tooltip if action was just executed
        if (actionExecutedRef.current) return;

        // Only show tooltip if element is disabled
        if (disabled) {
          e.stopPropagation();
          globalTooltip.handleWrapperClick(finalTooltipId, disabled, false, e);
        }
      } : undefined}
      onMouseDown={globalTooltip.isMobile ? (e) => {
        // Start hold timer for tooltip (will show for both active and inactive elements if held)
        globalTooltip.handleMouseDown(finalTooltipId, disabled, false, e);
      } : undefined}
      onMouseUp={globalTooltip.isMobile ? (e) => {
        // Don't show tooltip if action was just executed
        if (actionExecutedRef.current) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }

        globalTooltip.handleMouseUp(finalTooltipId, disabled, onClick || (() => {}), e);
      } : undefined}
      onTouchStart={globalTooltip.isMobile ? (e) => {
        // Start hold timer for tooltip (will show for both active and inactive elements if held)
        globalTooltip.handleTouchStart(finalTooltipId, disabled, false, e);
      } : undefined}
      onTouchEnd={globalTooltip.isMobile ? (e) => {
        // Don't show tooltip if action was just executed
        if (actionExecutedRef.current) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }

        globalTooltip.handleTouchEnd(finalTooltipId, disabled, onClick || (() => {}), e);
      } : undefined}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <TooltipProvider>
        <Tooltip 
          open={globalTooltip.isMobile ? globalTooltip.isTooltipOpen(finalTooltipId) : undefined} 
          delayDuration={300}
        >
          <TooltipTrigger asChild>
            <span className="inline-block">
              {children}
            </span>
          </TooltipTrigger>
          <TooltipContent>{tooltip}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
