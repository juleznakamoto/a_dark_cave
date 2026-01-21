import React, { useRef, useEffect, forwardRef } from "react";
import { Button } from "@/components/ui/button";
import { useGameStore } from "@/game/state";
import { TooltipWrapper } from "@/components/game/TooltipWrapper";

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
  containerClassName?: string;
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
      containerClassName = "",
      ...props
    },
    ref
  ) {
  const { cooldowns, compassGlowButton } = useGameStore();
  const isFirstRenderRef = useRef<boolean>(true);

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
      ? Math.min((currentCooldown / initialCooldown) * 100, 100)
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

  const buttonId = testId || `button-${Math.random()}`;

  // Create the button content with cooldown overlay
  const buttonContent = (
    <Button
      ref={ref}
      onClick={handleClick}
      disabled={isButtonDisabled}
      variant={variant}
      size={size}
      className={`relative overflow-hidden transition-all duration-200 select-none ${
        isCoolingDown ? "cursor-not-allowed" : ""
      } ${isCompassGlowing ? "compass-glow" : ""} ${className}`}
      data-testid={testId}
      button_id={props.button_id || actionId}
      {...props}
      style={{ opacity: 1, ...props.style }}
    >
      {/* Button content */}
      <span className={`relative transition-opacity duration-200 ${isCoolingDown || disabled ? "opacity-60" : ""}`}>{children}</span>

      {/* Cooldown progress overlay */}
      {isCoolingDown && (
        <div
          className="absolute inset-0 bg-white/15 transition-opacity duration-200"
          style={{
            width: `${overlayWidth}%`,
            left: 0,
            transition: isFirstRenderRef.current ? "none" : "width 0.3s ease-out",
          }}
        />
      )}

      {/* "2x" text indicator for compass glow */}
      {isCompassGlowing && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[100]">
          <div className="bg-yellow-800 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center animate-fade-out-up shadow-sm border border-yellow-600/50">
            2x
          </div>
        </div>
      )}
    </Button>
  );

  // Use TooltipWrapper for consistent tooltip behavior
  return (
    <TooltipWrapper
      tooltip={tooltip}
      tooltipId={buttonId}
      disabled={isButtonDisabled}
      className={containerClassName}
      onMouseEnter={props.onMouseEnter}
      onMouseLeave={props.onMouseLeave}
    >
      {buttonContent}
    </TooltipWrapper>
  );
});

export default CooldownButton;