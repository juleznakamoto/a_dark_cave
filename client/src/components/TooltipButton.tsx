
import React, { useRef, forwardRef } from "react";
import { Button } from "@/components/ui/button";
import { useMobileButtonTooltip } from "@/hooks/useMobileTooltip";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TooltipButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link";
  size?: "default" | "sm" | "xs" | "lg" | "icon";
  "data-testid"?: string;
  tooltip?: React.ReactNode;
}

const TooltipButton = forwardRef<HTMLButtonElement, TooltipButtonProps>(
  function TooltipButton(
    {
      children,
      onClick,
      disabled = false,
      className = "",
      variant = "default",
      size = "default",
      "data-testid": testId,
      tooltip,
      ...props
    },
    ref
  ) {
  const mobileTooltip = useMobileButtonTooltip();
  const actionExecutedRef = useRef<boolean>(false);

  const handleClick = (e: React.MouseEvent) => {
    if (disabled) return;
    actionExecutedRef.current = true;
    onClick();
    // Reset the flag after a short delay
    setTimeout(() => {
      actionExecutedRef.current = false;
    }, 100);
  };

  const buttonId = testId || `button-${Math.random()}`;

  const button = (
    <Button
      ref={ref}
      onClick={handleClick}
      disabled={disabled}
      variant={variant}
      size={size}
      className={`relative overflow-hidden transition-all duration-200 select-none ${className}`}
      data-testid={testId}
      {...props}
    >
      <span className="relative">{children}</span>
    </Button>
  );

  // If no tooltip, return button without tooltip
  if (!tooltip) {
    return <div className="relative inline-block">{button}</div>;
  }

  return (
    <div
      className="relative inline-block"
      onClick={mobileTooltip.isMobile && tooltip ? (e) => {
        // Don't show tooltip if action was just executed
        if (actionExecutedRef.current) return;

        // Only show tooltip if button is disabled
        if (disabled) {
          e.stopPropagation();
          mobileTooltip.handleWrapperClick(buttonId, disabled, false, e);
        }
      } : undefined}
      onMouseDown={mobileTooltip.isMobile && tooltip ? (e) => {
        // Start hold timer for tooltip
        mobileTooltip.handleMouseDown(buttonId, disabled, false, e);
      } : undefined}
      onMouseUp={mobileTooltip.isMobile && tooltip ? (e) => {
        // Don't show tooltip if action was just executed
        if (actionExecutedRef.current) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }

        mobileTooltip.handleMouseUp(buttonId, disabled, onClick, e);
      } : undefined}
      onTouchStart={mobileTooltip.isMobile && tooltip ? (e) => {
        // Start hold timer for tooltip
        mobileTooltip.handleTouchStart(buttonId, disabled, false, e);
      } : undefined}
      onTouchEnd={mobileTooltip.isMobile && tooltip ? (e) => {
        // Don't show tooltip if action was just executed
        if (actionExecutedRef.current) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }

        mobileTooltip.handleTouchEnd(buttonId, disabled, onClick, e);
      } : undefined}
    >
      <TooltipProvider>
        <Tooltip open={mobileTooltip.isMobile ? mobileTooltip.isTooltipOpen(buttonId) : undefined} delayDuration={0}>
          <TooltipTrigger asChild>
            <span className="inline-block">
              {button}
            </span>
          </TooltipTrigger>
          <TooltipContent>{tooltip}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
});

export default TooltipButton;
