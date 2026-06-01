import React, { useRef, useEffect, useState, forwardRef } from "react";
import { Button } from "@/components/ui/button";
import { useGameStore } from "@/game/state";
import { TooltipWrapper } from "@/components/game/TooltipWrapper";
import { X } from "lucide-react";
import { GAME_CONSTANTS } from "@/game/constants";
import { tWithFallback } from "@/i18n/resolveGameText";

interface CooldownButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  cooldownMs: number;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
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
      onMouseEnter,
      onMouseLeave,
      style,
      ...props
    },
    ref
  ) {
    const {
      cooldowns,
      initialCooldowns,
      executionStartTimes,
      executionDurations,
      compassGlowButton,
      insightRevealing,
    } = useGameStore();
    const isFirstRenderRef = useRef<boolean>(true);
    const [, forceUpdate] = useState(0);

    // Get the action ID from the test ID or generate one
    const actionIdFromProps = props.actionId || props.button_id || testId
      ?.replace("button-", "")
      .replace(/-([a-z])/g, (_, letter) => letter.toUpperCase()) || "unknown";

    const executionAbortEligible = useGameStore((s) => s.executionAbortEligible?.[actionIdFromProps]);
    const hasAbortSnapshot = useGameStore((s) => s.executionSpendSnapshots?.[actionIdFromProps] != null);
    const hasClerksHut = useGameStore((s) => (s.buildings.clerksHut ?? 0) > 0);
    const gold = useGameStore((s) => s.resources.gold ?? 0);
    const abortActionExecution = useGameStore((s) => s.abortActionExecution);

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
    const isInsightRevealing =
      typeof insightRevealing?.[actionIdFromProps] === "number" &&
      insightRevealing[actionIdFromProps] > Date.now();

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
        style={{ opacity: 1, position: 'relative', zIndex: 10, ...style }}
      >
        {/* Button content */}
        <span className={`relative transition-opacity duration-200 ${isCoolingDown || isExecuting || disabled ? "opacity-60" : ""}`}>{children}</span>

        {/* Cooldown or execution progress overlay */}
        {(isCoolingDown || isExecuting) && (
          <div
            className={`absolute inset-0 transition-opacity duration-200 ${isInsightRevealing ? "bg-blue-400/25" : "bg-white/15"
              }`}
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

    // Pass onClick to TooltipWrapper so mobile touch events can execute the action.
    // TooltipWrapper's touch handlers call this when user taps (short press); without it,
    // mobile taps do nothing because we preventDefault/stopPropagation and the Button's
    // onClick never fires.
    const triggerPrimaryClick = (e?: React.MouseEvent | React.TouchEvent) => {
      if (isButtonDisabled) return;
      if (onAnimationTrigger) {
        let button: HTMLButtonElement | null = null;
        if (ref && typeof ref !== "function" && ref.current) {
          button = ref.current;
        } else if (e?.target) {
          button = (e.target as HTMLElement).closest?.("button") ?? null;
        }
        if (button) {
          const rect = button.getBoundingClientRect();
          onAnimationTrigger(rect.left + rect.width / 2, rect.top + rect.height / 2);
        }
      }
      onClick();
    };

    const isAbortActionType =
      actionIdFromProps.startsWith("craft") ||
      actionIdFromProps.startsWith("build");
    const showAbortOverlay =
      isAbortActionType &&
      isExecuting &&
      hasClerksHut &&
      executionAbortEligible === true &&
      hasAbortSnapshot;
    const canAffordAbort = gold >= GAME_CONSTANTS.ACTION_ABORT_GOLD_COST;
    const abortTooltip = tWithFallback(
      "ui",
      "cave.abortForGold",
      `Abort for ${GAME_CONSTANTS.ACTION_ABORT_GOLD_COST} Gold`,
      { amount: GAME_CONSTANTS.ACTION_ABORT_GOLD_COST },
    );

    return (
      <div className="relative inline-block">
        <TooltipWrapper
          tooltip={tooltip}
          tooltipId={buttonId}
          disabled={isButtonDisabled}
          onClick={triggerPrimaryClick}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
        >
          {buttonContent}
        </TooltipWrapper>
        {showAbortOverlay && (
          <div
            className={`absolute bottom-[-10px] right-[-7px] z-[30] pointer-events-auto ${!canAffordAbort ? "opacity-40" : ""}`}
          >
            <TooltipWrapper
              tooltip={abortTooltip}
              tooltipId={`${buttonId}-abort`}
              className="inline-flex"
            >
              <button
                type="button"
                className="flex h-4 w-4 items-center justify-center rounded-full bg-red-950 text-white shadow-sm border border-red-800/50 hover:bg-red-900 transition-colors cursor-pointer"
                data-testid={testId ? `${testId}-abort` : undefined}
                aria-label={abortTooltip}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  if (canAffordAbort) {
                    abortActionExecution(actionIdFromProps);
                  }
                }}
              >
                <X className="h-2.5 w-2.5 stroke-[3]" />
              </button>
            </TooltipWrapper>
          </div>
        )}
      </div>
    );
  }
);

export default CooldownButton;