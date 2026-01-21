import React, { useRef, forwardRef } from "react";
import { Button, ButtonProps } from "@/components/ui/button";
import { TooltipWrapper } from "./TooltipWrapper";

export interface GameButtonProps extends ButtonProps {
  tooltip?: React.ReactNode;
  tooltipId?: string;
  onMouseEnter?: (e?: React.MouseEvent<HTMLDivElement>) => void;
  onMouseLeave?: (e?: React.MouseEvent<HTMLDivElement>) => void;
}

/**
 * Unified button component with consistent tooltip behavior
 * - Desktop: tooltips shown on hover
 * - Mobile: tooltips shown on long press (300ms) or click if disabled
 * - Only one tooltip open at a time globally
 */
const GameButton = forwardRef<HTMLButtonElement, GameButtonProps>(
  function GameButton(
    {
      children,
      onClick,
      disabled = false,
      className = "",
      tooltip,
      tooltipId,
      onMouseEnter,
      onMouseLeave,
      ...props
    },
    ref
  ) {
    const actionExecutedRef = useRef<boolean>(false);

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled) return;
      
      actionExecutedRef.current = true;
      onClick?.(e);
      
      // Reset the flag after a short delay
      setTimeout(() => {
        actionExecutedRef.current = false;
      }, 100);
    };

    const button = (
      <Button
        ref={ref}
        onClick={handleClick}
        disabled={disabled}
        className={className}
        {...props}
      >
        {children}
      </Button>
    );

    return (
      <TooltipWrapper
        tooltip={tooltip}
        tooltipId={tooltipId}
        disabled={disabled}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onClick={onClick}
      >
        {button}
      </TooltipWrapper>
    );
  }
);

export default GameButton;
