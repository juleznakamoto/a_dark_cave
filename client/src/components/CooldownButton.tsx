import React, { useRef, useEffect, useId, useMemo, useState, forwardRef } from "react";
import { Button } from "@/components/ui/button";
import { isDemoPlayFrozen } from "@/game/demoLimit";
import {
  isModalDialogOpen,
  isVisibleModalDialogOpen,
  useGameStore,
} from "@/game/state";
import { TooltipWrapper } from "@/components/game/TooltipWrapper";
import { YELLOW_CORNER_DISC_CLASS } from "@/components/game/gameChrome";
import { X } from "lucide-react";
import { GAME_CONSTANTS } from "@/game/constants";
import { tWithFallback } from "@/i18n/resolveGameText";
import { cn, formatCompactDuration } from "@/lib/utils";
import { useInlineButtonParticles } from "@/components/ui/bubbly-button";
import type { ParticleConfig } from "@/components/ui/bubbly-button.particles";
import { ActionTooltipSeparator } from "@/game/rules/actionTooltipLayout";
import {
  ADC_PROGRESS_WIPE_PAUSED_CLASS,
  getCssTimedWipeStyle,
  useUiNow,
  useUntilTimestamp,
} from "@/lib/uiClock";

/** Relative wrapper for action buttons and badges. inline-flex avoids baseline gap so corner badges sit on the button. */
export const GAME_ACTION_BUTTON_STACK_CLASS = "relative inline-flex";

/** Uniform gap between game action buttons (horizontal, wrapped rows, stacked row groups). */
export const GAME_ACTION_BUTTON_GRID_GAP_CLASS = "gap-[1.125rem]";

/** Flex-wrap layout for grids of game action buttons (panels, timed events, dialogs). */
export function gameActionButtonGridClassName(className?: string): string {
  return cn("flex flex-wrap items-center", GAME_ACTION_BUTTON_GRID_GAP_CLASS, className);
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
      ? // Fade via border alpha + gameActionDisabledLabelClassName — never whole-button
      // opacity (that lets portaled click particles show through the chrome).
      cn(
        "border-orange-950/50",
        "!bg-transparent hover:!bg-transparent",
      )
      : cn(
        "border-orange-950",
        "text-foreground",
      ),
    !disabled &&
    `${hoverPrefix}bg-accent ${hoverPrefix}text-accent-foreground bg-neutral-600/10`,
  );
}

/** Label fade for disabled game action buttons (pairs with gameActionOutlineButtonClassName). */
export function gameActionDisabledLabelClassName(disabled = false): string {
  return cn(
    "relative z-10 transition-opacity duration-200",
    disabled && "opacity-60",
  );
}

/** Cooldown / execution wash. Same token and alpha as the blocked outline border. */
export const GAME_ACTION_COOLDOWN_WASH_CLASS = "bg-orange-950/50";
/** Short brighter fade on a filling wipe (execution / play-time progress). */
export const GAME_ACTION_COOLDOWN_WASH_EDGE_CLASS =
  "absolute inset-y-0 right-0 w-3 bg-gradient-to-r from-transparent to-orange-900/40";
/** Darker fade on a receding wipe (action cooldown / play-time cooldown). */
export const GAME_ACTION_COOLDOWN_WASH_EDGE_RECEDING_CLASS =
  "absolute inset-y-0 right-0 w-3 bg-gradient-to-r from-transparent to-black/40";

interface CooldownButtonProps {
  children: React.ReactNode;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
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
  /** Click particle burst (portaled above side panel/tabs, behind action buttons). */
  particleConfig?: Partial<ParticleConfig> | (() => Partial<ParticleConfig>);
  /** @deprecated Use particleConfig for click particles. */
  onAnimationTrigger?: (x: number, y: number) => void;
  /** Play-time overlay while the button is blocked (`cooldown` shrinks 100→0, `progress` fills 0→100). */
  playTimeCooldown?: {
    startPlayTime: number;
    endPlayTime: number;
    mode?: "cooldown" | "progress";
  } | null;
  /** Demo: force a wash without store cooldown or execution. */
  previewOverlay?: { widthPercent: number; mode: "fill" | "recede" } | null;
}

/**
 * Ticks once a second while mounted. Tooltip content unmounts when closed, so
 * this stays idle unless the player is actually looking at the remaining time.
 * Do not gate on `useGlobalTooltipOpen` — that is only true for long-press,
 * and desktop hover would freeze the countdown.
 */
function ExecutionRemainingLabel({
  startMs,
  durationSec,
}: {
  startMs: number;
  durationSec: number;
}) {
  const now = useUiNow(true);
  const remainingSec = Math.max(0, durationSec - (now - startMs) / 1000);
  return (
    <>
      {tWithFallback(
        "ui",
        "tooltips.executionRemaining",
        "{{duration}} left until finished",
        { duration: formatCompactDuration(remainingSec) },
      )}
    </>
  );
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
      previewOverlay,
      ...props
    },
    ref
  ) {
    const isFirstRenderRef = useRef<boolean>(true);
    const [wipeRevision, setWipeRevision] = useState(0);
    const generatedButtonId = useId();

    // Get the action ID from the test ID or generate one
    const actionIdFromProps = props.actionId || props.button_id || testId
      ?.replace("button-", "")
      .replace(/-([a-z])/g, (_, letter) => letter.toUpperCase()) || "unknown";

    // Boolean only: remaining-time ticks must not rewrite animation-delay.
    const isCoolingDown = useGameStore(
      (s) => (s.cooldowns[actionIdFromProps] || 0) > 0,
    );
    const storedInitialCooldown = useGameStore((s) => s.initialCooldowns[actionIdFromProps] || 0);
    const executionStart = useGameStore((s) => s.executionStartTimes?.[actionIdFromProps] || 0);
    const executionDurationSec = useGameStore((s) => s.executionDurations?.[actionIdFromProps] || 0);
    const isCompassGlowing = useGameStore((s) => s.compassGlowButton === actionIdFromProps);
    // Only subscribe to the 4 Hz playTime clock when this button has a play-time overlay.
    const currentPlayTime = useGameStore((s) =>
      playTimeCooldown ? (s.playTime ?? 0) : 0,
    );
    const executionAbortEligible = useGameStore((s) => s.executionAbortEligible?.[actionIdFromProps]);
    const hasAbortSnapshot = useGameStore((s) => s.executionSpendSnapshots?.[actionIdFromProps] != null);
    const hasClerksHut = useGameStore((s) => (s.buildings.clerksHut ?? 0) > 0);
    const gold = useGameStore((s) => s.resources.gold ?? 0);
    const abortActionExecution = useGameStore((s) => s.abortActionExecution);
    // Visible freeze: pause button, sleep, on-screen modal, demo-end.
    // Execution is wall-clock, so the bar may keep running during the 3s
    // post-dialog handoff and complete there (same as the game loop).
    const isVisibleFreeze = useGameStore(
      (s) =>
        s.isPaused ||
        Boolean(s.idleModeState?.isActive) ||
        isVisibleModalDialogOpen(s) ||
        isDemoPlayFrozen(s),
    );
    // Cooldown remaining only ticks while the sim runs. Handoff must pause
    // that wipe too, or the bar empties ~3s early and sits locked.
    const isSimFrozen = useGameStore(
      (s) =>
        s.isPaused ||
        Boolean(s.idleModeState?.isActive) ||
        isModalDialogOpen(s) ||
        isDemoPlayFrozen(s),
    );

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

    // Execution / cooldown washes are CSS-driven (no per-button remaining-time poll).
    // Play-time overlays already follow the 4 Hz store clock.
    const isExecuting = executionStart > 0 && executionDurationSec > 0;
    const isTimedWipePaused = isExecuting ? isVisibleFreeze : isSimFrozen;
    const executionEndMs = isExecuting
      ? executionStart + executionDurationSec * 1000
      : null;
    const executionStillRunning = useUntilTimestamp(executionEndMs);

    // Use the stored initial cooldown if available, otherwise fall back to the action's defined cooldown
    const initialCooldown = storedInitialCooldown > 0
      ? storedInitialCooldown
      : cooldownMs / 1000;

    // Use a ref to track if we should animate the width
    const skipAnimationRef = useRef(false);
    const wasWipePausedRef = useRef(isTimedWipePaused);

    useEffect(() => {
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          skipAnimationRef.current = true;
          setWipeRevision((n) => n + 1);
          // Re-enable animation after the jump
          setTimeout(() => {
            skipAnimationRef.current = false;
          }, 50);
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);
      return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);

    useEffect(() => {
      if (wasWipePausedRef.current && !isTimedWipePaused) {
        setWipeRevision((n) => n + 1);
      }
      wasWipePausedRef.current = isTimedWipePaused;
    }, [isTimedWipePaused]);

    useEffect(() => {
      if (!isExecuting || executionStillRunning || isVisibleFreeze) return;
      useGameStore.getState().completeActionExecution(actionIdFromProps);
    }, [actionIdFromProps, executionStillRunning, isExecuting, isVisibleFreeze]);

    // Track first render for transition
    const hasPreviewOverlay = previewOverlay != null;
    useEffect(() => {
      if (isCoolingDown || isExecuting || isPlayTimeOverlayActive || hasPreviewOverlay) {
        isFirstRenderRef.current = true;
        // Allow transition after initial render (next frame)
        requestAnimationFrame(() => {
          isFirstRenderRef.current = false;
        });
      } else {
        isFirstRenderRef.current = true;
      }
    }, [isCoolingDown, isExecuting, isPlayTimeOverlayActive, hasPreviewOverlay]);

    const executionWipe = useMemo(
      () =>
        !previewOverlay && !isPlayTimeOverlayActive && isExecuting
          ? getCssTimedWipeStyle({
            startMs: executionStart,
            durationMs: executionDurationSec * 1000,
            mode: "fill",
          })
          : null,
      [
        executionDurationSec,
        executionStart,
        isExecuting,
        isPlayTimeOverlayActive,
        previewOverlay,
        wipeRevision,
      ],
    );

    // Snapshot remaining once (or on wipeRevision remount). The CSS recede
    // then runs on its own. Do not put the ticking remaining number in deps:
    // rewriting animation-delay mid-wipe restarts it in Chromium.
    const cooldownWipe = useMemo(() => {
      if (previewOverlay || isPlayTimeOverlayActive || isExecuting || !isCoolingDown) {
        return null;
      }
      if (initialCooldown <= 0) return null;
      const remaining =
        useGameStore.getState().cooldowns[actionIdFromProps] || 0;
      if (remaining <= 0) return null;
      const elapsedMs = Math.max(0, (initialCooldown - remaining) * 1000);
      return getCssTimedWipeStyle({
        startMs: Date.now() - elapsedMs,
        durationMs: initialCooldown * 1000,
        mode: "recede",
      });
    }, [
      actionIdFromProps,
      initialCooldown,
      isCoolingDown,
      isExecuting,
      isPlayTimeOverlayActive,
      previewOverlay,
      wipeRevision,
    ]);

    const timedWipe = executionWipe ?? cooldownWipe;

    // Preview / play-time still set width in React. Execution and action
    // cooldown use CSS keyframes so remaining-time ticks do not restart them.
    const overlayWidth = previewOverlay
      ? previewOverlay.widthPercent
      : isPlayTimeOverlayActive
        ? playTimeOverlayWidth
        : 0;
    const isFillWipe = previewOverlay
      ? previewOverlay.mode === "fill"
      : isPlayTimeOverlayActive
        ? playTimeRange?.mode === "progress"
        : isExecuting;

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

    const isOverlayBlocked =
      previewOverlay != null ||
      isCoolingDown ||
      isExecuting ||
      isPlayTimeOverlayActive;
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (isOverlayBlocked || disabled) return;
      actionExecutedRef.current = true;

      emitClickParticles(e.currentTarget);

      onClick(e);
      // Reset the flag after a short delay
      setTimeout(() => {
        actionExecutedRef.current = false;
      }, 100);
    };

    const isButtonDisabled = disabled || isOverlayBlocked;

    const buttonId = testId || generatedButtonId;

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
        // opacity: 1 is load-bearing — whole-button opacity lets portaled particles
        // (z behind the button) show through and look like they are in front.
        // Keep it last so a caller `style.opacity` cannot undo the particle fix.
        style={{
          position: "relative",
          ...style,
          opacity: 1,
        }}
      >
        {particleConfig && (
          <div
            className="absolute inset-0 rounded-md pointer-events-none backdrop-blur-3xl"
            aria-hidden
          />
        )}

        {/* Wash first so it stays behind the label. */}
        {isOverlayBlocked && (
          <div
            key={
              timedWipe
                ? `wipe-${executionStart}-${executionDurationSec}-${wipeRevision}`
                : "static-wash"
            }
            className={cn(
              "pointer-events-none absolute inset-y-0 left-0 z-0 overflow-hidden rounded-md transition-opacity duration-200",
              GAME_ACTION_COOLDOWN_WASH_CLASS,
              timedWipe?.className,
              isTimedWipePaused && timedWipe?.className && ADC_PROGRESS_WIPE_PAUSED_CLASS,
            )}
            style={
              timedWipe
                ? { left: 0, ...timedWipe.style }
                : {
                  width: `${overlayWidth}%`,
                  left: 0,
                  transition:
                    isFirstRenderRef.current || skipAnimationRef.current
                      ? "none"
                      : "width 0.25s linear",
                }
            }
            aria-hidden
          >
            <div
              className={
                isFillWipe
                  ? GAME_ACTION_COOLDOWN_WASH_EDGE_CLASS
                  : GAME_ACTION_COOLDOWN_WASH_EDGE_RECEDING_CLASS
              }
            />
          </div>
        )}

        {/* Fade label only — keep chrome/backdrop-blur opaque so particles stay behind */}
        <span
          className={gameActionDisabledLabelClassName(isOverlayBlocked || disabled)}
        >
          {children}
        </span>

        {/* "2x" text indicator for compass glow */}
        {isCompassGlowing && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            <div
              className={cn(
                "button-compass-2x game-corner-badge-digit animate-fade-out-up",
                YELLOW_CORNER_DISC_CLASS,
              )}
            >
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

    const hasBaseTooltip = tooltip != null && tooltip !== false && tooltip !== "";
    const resolvedTooltip = isExecuting
      ? (
        <div className="text-xs">
          {hasBaseTooltip ? tooltip : null}
          {hasBaseTooltip ? <ActionTooltipSeparator /> : null}
          <div className="text-muted-foreground">
            <ExecutionRemainingLabel
              startMs={executionStart}
              durationSec={executionDurationSec}
            />
          </div>
        </div>
      )
      : tooltip;

    return (
      <div className={GAME_ACTION_BUTTON_STACK_CLASS}>
        {particleConfig && portal}
        <TooltipWrapper
          tooltip={resolvedTooltip}
          tooltipId={buttonId}
          className="relative inline-flex"
          disabled={isButtonDisabled}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
        >
          {buttonContent}
        </TooltipWrapper>
        {showAbortOverlay && (
          <div
            className={`button-corner-badge-16 ${!canAffordAbort ? "opacity-40" : ""}`}
          >
            <TooltipWrapper
              tooltip={abortTooltip}
              tooltipId={`${buttonId}-abort`}
              className="flex h-full w-full"
              tooltipTriggerAsChild
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
                <X className="h-3 w-3 stroke-[3]" />
              </button>
            </TooltipWrapper>
          </div>
        )}
      </div>
    );
  }
);

export default CooldownButton;