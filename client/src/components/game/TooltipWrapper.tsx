import React, { useRef } from "react";
import { cn } from "@/lib/utils";
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
  /** Classes for the Radix trigger span (default full-width block for panel rows). */
  tooltipTriggerClassName?: string;
  /**
   * When true, the Radix trigger merges onto `children` instead of wrapping them in a span.
   * Use with a single ref-forwarding element (e.g. `RadioGroup.Item`’s label) so hover on the
   * full control—including the radio disc—opens the tooltip.
   */
  tooltipTriggerAsChild?: boolean;
  tooltipContentClassName?: string;
  onMouseEnter?: (e?: React.MouseEvent<HTMLDivElement>) => void;
  onMouseLeave?: (e?: React.MouseEvent<HTMLDivElement>) => void;
  onClick?: (e?: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => void;
}

/**
 * Wrapper component that adds consistent tooltip behavior to any element
 * - Desktop: tooltips shown on hover AND long press (300ms)
 * - Mobile/Tablets: tooltips shown on long press (250ms) or click if disabled
 * - Long-press tooltips stay open until user clicks/taps elsewhere
 * - Only one tooltip open at a time globally
 */
export function TooltipWrapper({
  children,
  tooltip,
  tooltipId,
  disabled = false,
  className = "relative inline-block",
  tooltipTriggerClassName,
  tooltipTriggerAsChild = false,
  tooltipContentClassName,
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
      data-tooltip-trigger-id={finalTooltipId}
      style={{ touchAction: "manipulation" }}
      onClickCapture={(e) => {
        // Prevent double execution: if we already ran the action via mouseup/touchend, block the click from reaching the child
        if (actionExecutedRef.current) {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
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

        const wrappedOnClick = onClick
          ? () => {
            actionExecutedRef.current = true;
            onClick(e);
            setTimeout(() => {
              actionExecutedRef.current = false;
            }, 100);
          }
          : () => { };
        globalTooltip.handleMouseUp(finalTooltipId, disabled, wrappedOnClick, e);
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

        const wrappedOnClick = onClick
          ? () => {
            actionExecutedRef.current = true;
            onClick(e);
            setTimeout(() => {
              actionExecutedRef.current = false;
            }, 100);
          }
          : () => { };
        globalTooltip.handleTouchEnd(finalTooltipId, disabled, wrappedOnClick, e);
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
            {tooltipTriggerAsChild && React.isValidElement(children) ? (
              tooltipTriggerClassName ? (
                React.cloneElement(
                  children as React.ReactElement<{ className?: string }>,
                  {
                    className: cn(
                      (children as React.ReactElement<{ className?: string }>).props
                        .className,
                      tooltipTriggerClassName,
                    ),
                  },
                )
              ) : (
                children
              )
            ) : (
              <span className={tooltipTriggerClassName ?? "block w-full"}>
                {children}
              </span>
            )}
          </TooltipTrigger>
          <TooltipContent className={tooltipContentClassName}>{tooltip}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
