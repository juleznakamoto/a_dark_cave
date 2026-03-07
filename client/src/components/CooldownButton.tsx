import React, { useRef, useEffect, useState, forwardRef } from "react";
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
  actionId?: string;
  tooltip?: React.ReactNode;
  onMouseEnter?: (e?: React.MouseEvent<HTMLDivElement>) => void;
  onMouseLeave?: (e?: React.MouseEvent<HTMLDivElement>) => void;
  onAnimationTrigger?: (x: number, y: number) => void;
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
      onAnimationTrigger,
      ...props
    },
    ref
  ) {
    const { cooldowns, initialCooldowns, executionStartTimes, executionDurations, compassGlowButton } = useGameStore();
    const isFirstRenderRef = useRef<boolean>(true);
    const [, forceUpdate] = useState(0);

    // Get the action ID from the test ID or generate one
    const actionIdFromProps = props.actionId || props.button_id || testId
      ?.replace("button-", "")
      .replace(/-([a-z])/g, (_, letter) => letter.toUpperCase()) || "unknown";

    // Force re-renders during execution so progress bar updates
    const isExecutingCheck = !!(executionStartTimes && executionStartTimes[actionIdFromProps]);
    useEffect(() => {
      if (!isExecutingCheck) return;
      const id = setInterval(() => forceUpdate((n) => n + 1), 100);
      return () => clearInterval(id);
    }, [isExecutingCheck, actionIdFromProps]);

    // Get current and initial cooldown from game state
    const currentCooldown = cooldowns[actionIdFromProps] || 0;
    const storedInitialCooldown = initialCooldowns[actionIdFromProps] || 0;
    const isCoolingDown = currentCooldown > 0;

    // Execution state (reverse cooldown - fills as time passes)
    const executionStart = executionStartTimes?.[actionIdFromProps] || 0;
    const executionDurationSec = executionDurations?.[actionIdFromProps] || 0;
    const isExecuting = executionStart > 0 && executionDurationSec > 0;
    const executionElapsed = isExecuting ? (Date.now() - executionStart) / 1000 : 0;
    const executionProgress = executionDurationSec > 0 ? Math.min(1, executionElapsed / executionDurationSec) : 0;

    // Use the stored initial cooldown if available, otherwise fall back to the action's defined cooldown
    const initialCooldown = storedInitialCooldown > 0
      ? storedInitialCooldown
      : cooldownMs / 1000;

    // Use a ref to track if we should animate the width
    const skipAnimationRef = useRef(false);

    useEffect(() => {
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          skipAnimationRef.current = true;
          // Re-enable animation after the jump
          setTimeout(() => {
            skipAnimationRef.current = false;
          }, 50);
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);
      return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);

    // Track first render for transition
    useEffect(() => {
      if (isCoolingDown || isExecuting) {
        isFirstRenderRef.current = true;
        // Allow transition after initial render (next frame)
        requestAnimationFrame(() => {
          isFirstRenderRef.current = false;
        });
      } else {
        isFirstRenderRef.current = true;
      }
    }, [isCoolingDown, isExecuting]);

    // Calculate width percentage: cooldown = shrinks 100→0, execution = grows 0→100
    const overlayWidth = isExecuting
      ? executionProgress * 100
      : isCoolingDown && initialCooldown > 0
        ? (currentCooldown / initialCooldown) * 100
        : 0;

    const actionExecutedRef = useRef<boolean>(false);

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled && !isCoolingDown && !isExecuting) return;
      if (!isCoolingDown && !isExecuting) {
        actionExecutedRef.current = true;

        // Trigger animation if provided - use button center, not click position
        if (onAnimationTrigger) {
          const button = e.currentTarget;
          const rect = button.getBoundingClientRect();
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;
          onAnimationTrigger(centerX, centerY);
        }

        onClick();
        // Reset the flag after a short delay
        setTimeout(() => {
          actionExecutedRef.current = false;
        }, 100);
      }
    };

    const isButtonDisabled = disabled || isCoolingDown || isExecuting;
    const isCompassGlowing = compassGlowButton === actionIdFromProps;

    const buttonId = testId || `button-${Math.random()}`;

    // Create the button content with cooldown overlay
    const buttonContent = (
      <Button
        ref={ref}
        onClick={handleClick}
        disabled={isButtonDisabled}
        variant={variant}
        size={size}
        className={`relative overflow-hidden transition-all duration-200 select-none ${isCoolingDown ? "cursor-not-allowed" : ""
          } ${isCompassGlowing ? "compass-glow" : ""} ${className}`}
        data-testid={testId}
        button_id={props.button_id || actionIdFromProps}
        {...props}
        style={{ opacity: 1, position: 'relative', zIndex: 10, ...props.style }}
      >
        {/* Button content */}
        <span className={`relative transition-opacity duration-200 ${isCoolingDown || isExecuting || disabled ? "opacity-60" : ""}`}>{children}</span>

        {/* Cooldown or execution progress overlay */}
        {(isCoolingDown || isExecuting) && (
          <div
            className={`absolute inset-0 transition-opacity duration-200 bg-white/15`}
            style={{
              width: `${overlayWidth}%`,
              left: 0,
              transition: isFirstRenderRef.current || skipAnimationRef.current ? "none" : "width 0.3s ease-out",
            }}
          />
        )}

        {/* "2x" text indicator for compass glow */}
        {isCompassGlowing && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            <div className="bg-yellow-800 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center animate-fade-out-up shadow-sm border border-yellow-600/50">
              2x
            </div>
          </div>
        )}
      </Button>
    );

    return (
      <TooltipWrapper
        tooltip={tooltip}
        tooltipId={buttonId}
        disabled={isButtonDisabled}
        onMouseEnter={props.onMouseEnter}
        onMouseLeave={props.onMouseLeave}
      >
        {buttonContent}
      </TooltipWrapper>
    );
  }
);

export default CooldownButton;