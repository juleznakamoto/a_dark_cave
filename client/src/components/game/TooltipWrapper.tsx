import React, { useEffect, useId, useRef } from "react";
import { cn } from "@/lib/utils";
import {
  useGlobalTooltip,
  useGlobalTooltipOpen,
  useInsideGameTooltipProvider,
} from "@/hooks/useGlobalTooltip";
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
  /**
   * When true (default), enabled controls use the browser's native click on short
   * tap/press. Set false only for non-button triggers that rely on wrapper onClick.
   */
  preferNativeClick?: boolean;
  onMouseEnter?: (e?: React.MouseEvent<HTMLDivElement>) => void;
  onMouseLeave?: (e?: React.MouseEvent<HTMLDivElement>) => void;
  onClick?: (e?: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => void;
}

/**
 * Wrapper component that adds consistent tooltip behavior to any element
 * - Desktop: tooltips shown on hover AND long press (300ms)
 * - Enabled buttons: native click (standard touch → click); long-press still opens tooltip
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
  preferNativeClick = true,
  onMouseEnter,
  onMouseLeave,
  onClick,
}: TooltipWrapperProps) {
  const globalTooltip = useGlobalTooltip();
  const actionExecutedRef = useRef<boolean>(false);
  const wasLongPressTooltipOpenRef = useRef(false);
  const onMouseEnterRef = useRef(onMouseEnter);
  const onMouseLeaveRef = useRef(onMouseLeave);
  onMouseEnterRef.current = onMouseEnter;
  onMouseLeaveRef.current = onMouseLeave;

  const generatedTooltipId = useId();
  const finalTooltipId = tooltipId || generatedTooltipId;
  const tooltipOpen = useGlobalTooltipOpen(finalTooltipId);
  const isLongPressTooltipOpen = tooltipOpen === true;
  const insideGameProvider = useInsideGameTooltipProvider();

  // Long-press / tap-to-open tooltips do not fire mouseenter on touch devices.
  // Mirror hover callbacks so side-panel resource highlighting works on mobile too.
  useEffect(() => {
    if (isLongPressTooltipOpen) {
      wasLongPressTooltipOpenRef.current = true;
      onMouseEnterRef.current?.();
      return;
    }

    if (wasLongPressTooltipOpenRef.current) {
      wasLongPressTooltipOpenRef.current = false;
      onMouseLeaveRef.current?.();
    }
  }, [isLongPressTooltipOpen]);

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

  const tooltipTriggerCursorClass = disabled ? "cursor-default" : undefined;
  const tooltipTree = (
    <Tooltip
      open={tooltipOpen}
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
                  tooltipTriggerCursorClass,
                ),
              },
            )
          ) : (
            children
          )
        ) : (
          <span
            className={cn(
              tooltipTriggerClassName ?? "block w-full",
              tooltipTriggerCursorClass,
            )}
          >
            {children}
          </span>
        )}
      </TooltipTrigger>
      <TooltipContent className={tooltipContentClassName}>{tooltip}</TooltipContent>
    </Tooltip>
  );

  return (
    <div
      className={cn(className, tooltipTriggerCursorClass)}
      data-tooltip-trigger-id={finalTooltipId}
      style={{ touchAction: "manipulation" }}
      onClickCapture={(e) => {
        // Long-press tooltip: swallow the synthesized click so release does not run the action.
        if (globalTooltip.handleClickCapture(finalTooltipId, e)) return;
        // Prevent double execution: if we already ran the action via mouseup/touchend, block the click from reaching the child
        if (actionExecutedRef.current) {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
      onClick={(e) => {
        // Don't show tooltip if action was just executed
        if (actionExecutedRef.current) return;

        // Only show tooltip if element is disabled
        if (disabled) {
          e.stopPropagation();
          globalTooltip.handleWrapperClick(finalTooltipId, disabled, false, e);
        }
      }}
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
        globalTooltip.handleMouseUp(
          finalTooltipId,
          disabled,
          wrappedOnClick,
          e,
          preferNativeClick,
        );
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
        globalTooltip.handleTouchEnd(
          finalTooltipId,
          disabled,
          wrappedOnClick,
          e,
          preferNativeClick,
        );
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {insideGameProvider ? tooltipTree : (
        <TooltipProvider>{tooltipTree}</TooltipProvider>
      )}
    </div>
  );
}
