import React, { useRef, useEffect, useState, forwardRef } from "react";
import { Button } from "@/components/ui/button";
import { useGameStore } from "@/game/state";
import { TooltipWrapper } from "@/components/game/TooltipWrapper";
import { X } from "lucide-react";
import { GAME_CONSTANTS } from "@/game/constants";
import { INSIGHT_REVEAL_DURATION_MS } from "@/game/rules/insightReveal";
import { tWithFallback } from "@/i18n/resolveGameText";
import { cn } from "@/lib/utils";
import { useInlineButtonParticles } from "@/components/ui/bubbly-button";
import type { ParticleConfig } from "@/components/ui/bubbly-button.particles";

/** Relative wrapper for action buttons and badges. */
export const GAME_ACTION_BUTTON_STACK_CLASS = "relative inline-block";

/** Uniform gap between game action buttons (horizontal, wrapped rows, stacked row groups). */
export const GAME_ACTION_BUTTON_GRID_GAP_CLASS = "gap-4";

/** Flex-wrap layout for grids of game action buttons (panels, timed events, dialogs). */
export function gameActionButtonGridClassName(className?: string): string {
  return cn("flex flex-wrap", GAME_ACTION_BUTTON_GRID_GAP_CLASS, className);
}

/** Vertical stack of separate button rows (e.g. Craft subGroups); gap matches the grid. */
export function gameActionButtonRowsClassName(className?: string): string {
  return cn("flex flex-col", GAME_ACTION_BUTTON_GRID_GAP_CLASS, className);
}

/** Outline border + hover for game action buttons (panels, timed events, dialogs). */
export function gameActionOutlineButtonClassName(
  disabled = false,
  options?: { groupHover?: boolean },
): string {
  const hoverPrefix = options?.groupHover ? "group-hover:" : "hover:";
  return cn(
    disabled
      ? "border-orange-950/50 !bg-transparent hover:!bg-transparent"
      : "border-orange-950 text-foreground",
    !disabled &&
    `${hoverPrefix}bg-accent ${hoverPrefix}text-accent-foreground bg-neutral-600/10`,
  );
}

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
  /** Click particle burst (portaled above side panel and game tabs). */
  particleConfig?: Partial<ParticleConfig> | (() => Partial<ParticleConfig>);
  /** @deprecated Use particleConfig for click particles. */
  onAnimationTrigger?: (x: number, y: number) => void;
  /** Play-time overlay while the button is blocked (`cooldown` shrinks 100→0, `progress` fills 0→100). */
  playTimeCooldown?: {
    startPlayTime: number;
    endPlayTime: number;
    mode?: "cooldown" | "progress";
  } | null;
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
      particleConfig,
      onAnimationTrigger,
      onMouseEnter,
      onMouseLeave,
      style,
      playTimeCooldown,
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
      playTime,
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

    // Get current and initial cooldown from game state
    const currentCooldown = cooldowns[actionIdFromProps] || 0;
    const storedInitialCooldown = initialCooldowns[actionIdFromProps] || 0;
    const isCoolingDown = currentCooldown > 0;
    const insightRevealEnd = insightRevealing?.[actionIdFromProps];
    const isInsightRevealing =
      typeof insightRevealEnd === "number" && insightRevealEnd > Date.now();

    const currentPlayTime = playTime ?? 0;

    const playTimeRange = playTimeCooldown;
    const isPlayTimeOverlayActive = !!(
      playTimeRange &&
      playTimeRange.endPlayTime > playTimeRange.startPlayTime &&
      currentPlayTime < playTimeRange.endPlayTime
    );
    const playTimeElapsedFraction =
      isPlayTimeOverlayActive && playTimeRange
        ? Math.min(
          1,
          Math.max(
            0,
            (currentPlayTime - playTimeRange.startPlayTime) /
            (playTimeRange.endPlayTime - playTimeRange.startPlayTime),
          ),
        )
        : 0;
    const playTimeOverlayWidth =
      isPlayTimeOverlayActive && playTimeRange
        ? playTimeRange.mode === "progress"
          ? playTimeElapsedFraction * 100
          : (1 - playTimeElapsedFraction) * 100
        : 0;

    // Force re-renders during execution / insight reveal so overlay updates
    const isExecutingCheck = !!(executionStartTimes && executionStartTimes[actionIdFromProps]);
    useEffect(() => {
      if (!isExecutingCheck && !isInsightRevealing && !isPlayTimeOverlayActive) return;
      const id = setInterval(() => forceUpdate((n) => n + 1), 100);
      return () => clearInterval(id);
    }, [isExecutingCheck, isInsightRevealing, isPlayTimeOverlayActive, actionIdFromProps]);

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
      if (isCoolingDown || isExecuting || isInsightRevealing || isPlayTimeOverlayActive) {
        isFirstRenderRef.current = true;
        // Allow transition after initial render (next frame)
        requestAnimationFrame(() => {
          isFirstRenderRef.current = false;
        });
      } else {
        isFirstRenderRef.current = true;
      }
    }, [isCoolingDown, isExecuting, isInsightRevealing, isPlayTimeOverlayActive]);

    const insightRevealWidth =
      isInsightRevealing && typeof insightRevealEnd === "number"
        ? Math.max(
          0,
          Math.min(
            100,
            ((insightRevealEnd - Date.now()) / INSIGHT_REVEAL_DURATION_MS) * 100,
          ),
        )
        : 0;

    // Calculate width percentage: cooldown = shrinks 100→0, execution = grows 0→100
    const overlayWidth = isPlayTimeOverlayActive
      ? playTimeOverlayWidth
      : isExecuting
        ? executionProgress * 100
        : isCoolingDown && initialCooldown > 0
          ? (currentCooldown / initialCooldown) * 100
          : insightRevealWidth;

    const actionExecutedRef = useRef<boolean>(false);
    const { triggerParticles, portal } = useInlineButtonParticles(particleConfig);

    const emitClickParticles = (button: HTMLButtonElement | null) => {
      if (particleConfig && button) {
        const rect = button.getBoundingClientRect();
        triggerParticles({
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        });
      } else if (onAnimationTrigger && button) {
        const rect = button.getBoundingClientRect();
        onAnimationTrigger(rect.left + rect.width / 2, rect.top + rect.height / 2);
      }
    };

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled && !isCoolingDown && !isExecuting && !isInsightRevealing && !isPlayTimeOverlayActive) return;
      if (!isCoolingDown && !isExecuting && !isInsightRevealing && !isPlayTimeOverlayActive) {
        actionExecutedRef.current = true;

        emitClickParticles(e.currentTarget);

        onClick();
        // Reset the flag after a short delay
        setTimeout(() => {
          actionExecutedRef.current = false;
        }, 100);
      }
    };

    const isButtonDisabled =
      disabled || isCoolingDown || isExecuting || isInsightRevealing || isPlayTimeOverlayActive;
    const isCompassGlowing = compassGlowButton === actionIdFromProps;

    const buttonId = testId || `button-${Math.random()}`;

    // Create the button content with cooldown overlay
    const buttonContent = (
      <Button
        ref={ref}
        onClick={handleClick}
        // Use aria-disabled instead of the native `disabled` attribute: native disabled triggers
        // `disabled:opacity-50` (and Android/Samsung's own control dimming), which washes out the
        // cooldown/execution progress overlay. Interaction stays blocked via pointer-events-none
        // plus the guards in handleClick.
        aria-disabled={isButtonDisabled || undefined}
        variant={variant}
        size={size}
        className={cn(
          // appearance-none resets native Android Chromium button chrome that otherwise leaks
          // through and makes the dark outline buttons look flat/grey.
          "relative select-none appearance-none [-webkit-appearance:none]",
          particleConfig ? "overflow-visible" : "overflow-hidden",
          isButtonDisabled && "pointer-events-none",
          // aria-disabled (not native disabled) so outline variant hover styles still apply — reset them.
          isButtonDisabled &&
          "!bg-transparent hover:!bg-transparent hover:!text-foreground",
          isButtonDisabled && "active:scale-100",
          isCompassGlowing && "compass-glow",
          variant === "outline" && gameActionOutlineButtonClassName(isButtonDisabled),
          className,
        )}
        data-testid={testId}
        button_id={props.button_id || actionIdFromProps}
        {...props}
        style={{ opacity: 1, position: "relative", ...style }}
      >
        {/* Button content */}
        <span className={`relative transition-opacity duration-200 ${isCoolingDown || isExecuting || isInsightRevealing || isPlayTimeOverlayActive || disabled ? "opacity-50" : ""}`}>{children}</span>

        {/* Cooldown, execution, or insight-reveal progress overlay */}
        {(isCoolingDown || isExecuting || isInsightRevealing || isPlayTimeOverlayActive) && (
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
            <div className="bg-yellow-800 text-white text-2xs rounded-full w-4 h-4 flex items-center justify-center animate-fade-out-up shadow-sm border border-yellow-600/50">
              2x
            </div>
          </div>
        )}
      </Button>
    );

    const isAbortActionType =
      actionIdFromProps.startsWith("craft") ||
      actionIdFromProps.startsWith("build");
    const isFreeMerchantAbort =
      actionIdFromProps === "callMerchant" &&
      isExecuting &&
      executionAbortEligible === true &&
      hasAbortSnapshot;
    const showAbortOverlay =
      isFreeMerchantAbort ||
      (isAbortActionType &&
        isExecuting &&
        hasClerksHut &&
        executionAbortEligible === true &&
        hasAbortSnapshot);
    const canAffordAbort =
      isFreeMerchantAbort || gold >= GAME_CONSTANTS.ACTION_ABORT_GOLD_COST;
    const abortTooltip = isFreeMerchantAbort
      ? tWithFallback(
        "ui",
        "village.merchantAbortCall",
        "Cancel call",
      )
      : tWithFallback(
        "ui",
        "cave.abortForGold",
        `Abort for ${GAME_CONSTANTS.ACTION_ABORT_GOLD_COST} Gold`,
        { amount: GAME_CONSTANTS.ACTION_ABORT_GOLD_COST },
      );

    return (
      <div className={GAME_ACTION_BUTTON_STACK_CLASS}>
        {particleConfig && portal}
        <TooltipWrapper
          tooltip={tooltip}
          tooltipId={buttonId}
          disabled={isButtonDisabled}
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