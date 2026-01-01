import React, { useRef, useEffect, forwardRef } from "react";
import { Button } from "@/components/ui/button";
import { useGameStore } from "@/game/state";
import { useMobileButtonTooltip } from "@/hooks/useMobileTooltip";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils"; // Assuming cn is imported from a utils file

interface CooldownButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  cooldownMs: number;
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
  button_id?: string;
  tooltip?: React.ReactNode;
  onMouseEnter?: (e?: React.MouseEvent<HTMLDivElement>) => void;
  onMouseLeave?: (e?: React.MouseEvent<HTMLDivElement>) => void;
}

const CooldownButton = forwardRef<HTMLButtonElement, CooldownButtonProps>(
  function CooldownButton(
    {
      children,
      onClick,
      cooldownMs,
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
  const { cooldowns, compassGlowButton } = useGameStore();
  const isFirstRenderRef = useRef<boolean>(true);
  const mobileTooltip = useMobileButtonTooltip();

  // Track the visibility of the "2x" text
  const [show2xText, setShow2xText] = React.useState(false);

  // Get the action ID from the test ID or generate one
  const actionId =
    testId
      ?.replace("button-", "")
      .replace(/-([a-z])/g, (_, letter) => letter.toUpperCase()) || "unknown";

  // Get current cooldown from game state
  const currentCooldown = cooldowns[actionId] || 0;
  const isCoolingDown = currentCooldown > 0;

  // Derive initial cooldown from cooldownMs prop (which comes from action.cooldown * 1000)
  const initialCooldown = cooldownMs / 1000;


  // Track first render for transition
  useEffect(() => {
    if (isCoolingDown) {
      isFirstRenderRef.current = true;
      // Allow transition after initial render (next frame)
      requestAnimationFrame(() => {
        isFirstRenderRef.current = false;
      });
    } else {
      isFirstRenderRef.current = true;
    }
  }, [isCoolingDown]);

  // Calculate width percentage directly from remaining cooldown
  const overlayWidth =
    isCoolingDown && initialCooldown > 0
      ? (currentCooldown / initialCooldown) * 100
      : 0;

  const actionExecutedRef = useRef<boolean>(false);

  const handleClick = (e: React.MouseEvent) => {
    if (disabled && !isCoolingDown) return;
    if (!isCoolingDown) {
      actionExecutedRef.current = true;

      // Note: Button component now handles tracking via button_id

      onClick();
      // Reset the flag after a short delay
      setTimeout(() => {
        actionExecutedRef.current = false;
      }, 100);
    }
  };

  const isButtonDisabled = disabled || isCoolingDown;
  const isCompassGlowing = compassGlowButton === actionId;

  // Log compass glow state changes
  useEffect(() => {
    if (isCompassGlowing) {
      console.log('[COMPASS GLOW] Button is glowing for action:', actionId);
      setShow2xText(true); // Show "2x" text
      const timer = setTimeout(() => {
        setShow2xText(false); // Hide "2x" text after 1 second
      }, 1000);
      return () => clearTimeout(timer); // Cleanup timer on unmount or re-render
    }
  }, [isCompassGlowing, actionId]);

  const buttonId = testId || `button-${Math.random()}`;

  const button = (
    <Button
      ref={ref}
      onClick={handleClick}
      disabled={isButtonDisabled}
      variant={variant}
      size={size}
      className={`relative overflow-hidden transition-all duration-200 select-none ${
        isCoolingDown ? "opacity-60 cursor-not-allowed" : ""
      } ${isCompassGlowing ? "compass-glow" : ""} ${className}`}
      data-testid={testId}
      button_id={props.button_id || actionId}
      {...props}
    >
      {/* Button content */}
      <span className="relative">{children}</span>

      {/* Cooldown progress overlay */}
      {isCoolingDown && (
        <div
          className="absolute inset-0 bg-white/15"
          style={{
            width: `${overlayWidth}%`,
            left: 0,
            transition: isFirstRenderRef.current ? "none" : "width 0.3s ease-out",
          }}
        />
      )}

      {/* "2x" text indicator for compass glow */}
      {show2xText && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full text-white text-xs font-bold">
          2x
        </div>
      )}
    </Button>
  );

  // If no tooltip, return button without tooltip
  if (!tooltip) {
    return <div className="relative inline-block">{button}</div>;
  }

  const tooltipId = buttonId; // Use buttonId for tooltip identification

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    // Stop propagation to prevent duplicate triggers from nested elements
    e.stopPropagation();
    props.onMouseEnter?.(e);
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    // Stop propagation to prevent duplicate triggers from nested elements
    e.stopPropagation();
    props.onMouseLeave?.(e);
  };

  return (
    <div
      className="relative inline-block"
      onClick={mobileTooltip.isMobile ? (e) => {
        // Don't show tooltip if action was just executed
        if (actionExecutedRef.current) return;

        // Only show tooltip if button is disabled
        if (isButtonDisabled) {
          e.stopPropagation();
          mobileTooltip.handleWrapperClick(tooltipId, isButtonDisabled, isCoolingDown, e);
        }
      } : undefined}
      onMouseDown={mobileTooltip.isMobile ? (e) => {
        // Start hold timer for tooltip (will show for both active and inactive buttons if held)
        mobileTooltip.handleMouseDown(tooltipId, isButtonDisabled, isCoolingDown, e);
      } : undefined}
      onMouseUp={mobileTooltip.isMobile ? (e) => {
        // Don't show tooltip if action was just executed
        if (actionExecutedRef.current) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }

        mobileTooltip.handleMouseUp(tooltipId, isButtonDisabled, onClick, e);
      } : undefined}
      onTouchStart={mobileTooltip.isMobile ? (e) => {
        // Start hold timer for tooltip (will show for both active and inactive buttons if held)
        mobileTooltip.handleTouchStart(tooltipId, isButtonDisabled, isCoolingDown, e);
      } : undefined}
      onTouchEnd={mobileTooltip.isMobile ? (e) => {
        // Don't show tooltip if action was just executed
        if (actionExecutedRef.current) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }

        mobileTooltip.handleTouchEnd(tooltipId, isButtonDisabled, onClick, e);
      } : undefined}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <TooltipProvider>
        <Tooltip open={mobileTooltip.isMobile ? mobileTooltip.isTooltipOpen(tooltipId) : undefined} delayDuration={300}>
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

export default CooldownButton;