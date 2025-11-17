import React, { useRef, useEffect } from "react";
import { Button, ButtonProps } from "@/components/ui/button";
import { useGameStore } from "@/game/state";
import { useMobileButtonTooltip } from "@/hooks/useMobileTooltip";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CircularProgress } from "@/components/ui/circular-progress"; // Assuming this is the correct import path

// Mock useCooldown hook if it's not provided or defined elsewhere in the snippet
const useCooldown = (onClick: () => void, cooldownMs: number) => {
  const { cooldowns, cooldownDurations, setCooldown } = useGameStore();
  const actionId = useRef(`cooldown-${Math.random()}`).current; // Generate a unique ID for this cooldown instance

  const currentCooldown = cooldowns[actionId] || 0;
  const initialCooldown = cooldownDurations[actionId] || cooldownMs; // Use provided cooldownMs if not in store

  const isOnCooldown = currentCooldown > 0;
  const progress = initialCooldown > 0 ? (currentCooldown / initialCooldown) * 100 : 0;

  const handleClick = () => {
    if (!isOnCooldown) {
      onClick();
      setCooldown(actionId, cooldownMs); // Set cooldown in game state
    }
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isOnCooldown) {
      timer = setInterval(() => {
        setCooldown(actionId, currentCooldown - 100); // Decrement cooldown by 100ms
      }, 100);
    } else {
      clearInterval(timer);
    }
    return () => clearInterval(timer);
  }, [isOnCooldown, currentCooldown, actionId, setCooldown]);

  return { isOnCooldown, progress, handleClick };
};


interface CooldownButtonProps extends ButtonProps {
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  cooldownMs: number;
  tooltip?: React.ReactNode;
  customButton?: (props: ButtonProps) => React.ReactNode;
}

export default function CooldownButton({
  onClick,
  cooldownMs,
  children,
  disabled,
  tooltip,
  customButton,
  ...props
}: CooldownButtonProps) {
  const { isOnCooldown, progress, handleClick } = useCooldown(
    onClick,
    cooldownMs,
  );
  const mobileTooltip = useMobileButtonTooltip();
  const tooltipId = useRef(`cooldown-${Math.random()}`).current; // Generate unique ID for tooltip

  const buttonProps = {
    onClick: handleClick,
    disabled: disabled || isOnCooldown,
    className: "relative overflow-hidden",
    ...props,
  };

  const buttonContent = customButton ? (
    <div className="relative">
      {customButton(buttonProps)}
      {isOnCooldown && (
        <CircularProgress
          value={progress}
          size="sm"
          className="absolute inset-0 pointer-events-none"
        />
      )}
    </div>
  ) : (
    <Button {...buttonProps}>
      {isOnCooldown && (
        <CircularProgress
          value={progress}
          size="sm"
          className="absolute inset-0 pointer-events-none"
        />
      )}
      <span className={isOnCooldown ? "opacity-50" : ""}>{children}</span>
    </Button>
  );

  // If no tooltip, return button without tooltip
  if (!tooltip) {
    return <div className="relative inline-block">{buttonContent}</div>;
  }

  return (
    <div
      className="relative inline-block"
      onClick={mobileTooltip.isMobile && tooltip ? (e) => {
        // Don't show tooltip if action was just executed
        if (mobileTooltip.isActionExecuted(tooltipId)) return;

        // Only show tooltip if button is disabled or cooling down
        if (isButtonDisabled || isOnCooldown) {
          e.stopPropagation();
          mobileTooltip.handleWrapperClick(tooltipId, true, false, e);
        }
      } : undefined}
      onMouseDown={mobileTooltip.isMobile && tooltip ? (e) => {
        // Start hold timer for tooltip (will show for both active and inactive buttons if held)
        mobileTooltip.handleMouseDown(tooltipId, isButtonDisabled, isOnCooldown, e);
      } : undefined}
      onMouseUp={mobileTooltip.isMobile && tooltip ? (e) => {
        // Don't show tooltip if action was just executed
        if (mobileTooltip.isActionExecuted(tooltipId)) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }

        mobileTooltip.handleMouseUp(tooltipId, isButtonDisabled, onClick, e);
      } : undefined}
      onTouchStart={mobileTooltip.isMobile && tooltip ? (e) => {
        // Start hold timer for tooltip (will show for both active and inactive buttons if held)
        mobileTooltip.handleTouchStart(tooltipId, isButtonDisabled, isOnCooldown, e);
      } : undefined}
      onTouchEnd={mobileTooltip.isMobile && tooltip ? (e) => {
        // Don't show tooltip if action was just executed
        if (mobileTooltip.isActionExecuted(tooltipId)) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }

        mobileTooltip.handleTouchEnd(tooltipId, isButtonDisabled, onClick, e);
      } : undefined}
    >
      <TooltipProvider>
        <Tooltip open={mobileTooltip.isMobile ? mobileTooltip.isTooltipOpen(tooltipId) : undefined} delayDuration={0}>
          <TooltipTrigger asChild>
            <span className="inline-block">
              {buttonContent}
            </span>
          </TooltipTrigger>
          <TooltipContent>{tooltip}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}