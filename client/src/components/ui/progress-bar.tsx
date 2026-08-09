"use client";

import {
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  useMemo,
  type ReactNode,
} from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  ProgressGrowSparksCanvas,
  resolveGrowGlowViaClass,
  resolveSparkPalette,
} from "@/components/ui/progressGrowSparks";

/** 0–1 fill for segment `index` from a 0–100 value across `segments` buckets. */
function getSegmentFill(
  displayValue: number,
  segments: number,
  index: number,
): number {
  if (segments <= 0) return 0;
  const units = Math.min(
    segments,
    Math.max(0, (displayValue / 100) * segments),
  );
  return Math.min(1, Math.max(0, units - index));
}

/** Segment currently filling (or just completed at a bucket boundary). */
function getActiveSegmentIndex(displayValue: number, segments: number): number {
  if (segments <= 0) return -1;
  const units = Math.min(
    segments,
    Math.max(0, (displayValue / 100) * segments),
  );
  if (units <= 0) return -1;
  const floored = Math.floor(units);
  // Exact boundary: tip sits at the end of the segment that just filled.
  if (units === floored) return Math.max(0, floored - 1);
  return Math.min(segments - 1, floored);
}

interface SegmentedProgressProps {
  value?: number;
  segments?: number;
  label?: string;
  showPercentage?: boolean;
  showDemo?: boolean;
  className?: string;
  /** Classes for filled segments (default: bg-primary). */
  filledClassName?: string;
  /** Classes for empty segments (default: bg-muted/60). */
  emptyClassName?: string;
  /** Extra classes on each segment (e.g. height). */
  segmentClassName?: string;
  /** Compact spacing for tight chrome (e.g. footer). */
  compact?: boolean;
  /** When false, snap to value (use for frequently updating lists). */
  animate?: boolean;
  /**
   * Tween duration on value change (ms). When set with emitSparksOnGrow,
   * skips mount-from-0 and only animates on change (estate Improve bars).
   */
  growAnimationMs?: number;
  /** Emit spark particles from the fill tip while the bar grows. */
  emitSparksOnGrow?: boolean;
  /** Radial tip glow and tip marker while grow sparks play. */
  growSparkTipGlow?: boolean;
  /**
   * Class used only for spark/glow color resolution (same role as Progress
   * `indicatorClassName`). Omit for estate yellow sparks + red glow.
   */
  sparkClassName?: string;
  /** Skip the increase glow sweep. */
  disableGlow?: boolean;
  /**
   * Optional fill layer (e.g. SharedProgressShaderSegment). When set, skips
   * solid `filledClassName` so the custom fill can show through.
   */
  renderFill?: () => ReactNode;
  "aria-label"?: string;
  "aria-valuenow"?: number;
  "aria-valuemin"?: number;
  "aria-valuemax"?: number;
  "data-testid"?: string;
}

export function SegmentedProgress({
  value: initialValue = 80,
  segments = 20,
  label,
  showPercentage = true,
  showDemo = false,
  className,
  filledClassName = "bg-primary",
  emptyClassName = "bg-neutral-800",
  segmentClassName,
  compact = false,
  animate = true,
  growAnimationMs = 0,
  emitSparksOnGrow = false,
  growSparkTipGlow = true,
  sparkClassName,
  disableGlow = false,
  renderFill,
  "aria-label": ariaLabel,
  "aria-valuenow": ariaValueNow,
  "aria-valuemin": ariaValueMin = 0,
  "aria-valuemax": ariaValueMax = 100,
  "data-testid": dataTestId,
}: SegmentedProgressProps) {
  const [progress, setProgress] = useState(initialValue);
  const value = showDemo ? progress : initialValue;

  /** Change-only mode: snap on mount, tween + sparks on Improve (estate). */
  const changeOnlyGrow = growAnimationMs > 0 || emitSparksOnGrow;
  const tweenDurationMs = growAnimationMs > 0 ? growAnimationMs : 800;

  const [displayValue, setDisplayValue] = useState(
    animate && !changeOnlyGrow ? 0 : initialValue,
  );
  const [isInitialized, setIsInitialized] = useState(
    !animate || changeOnlyGrow,
  );
  const [glowKey, setGlowKey] = useState(0);
  /** Segment index locked when a grow glow starts (target bucket, not live tip). */
  const [glowSegmentIndex, setGlowSegmentIndex] = useState(-1);
  const [growSparkSession, setGrowSparkSession] = useState(0);
  const [growTransitionActive, setGrowTransitionActive] = useState(false);
  const animationRef = useRef<number | null>(null);
  const startValueRef = useRef(changeOnlyGrow ? initialValue : 0);
  const startTimeRef = useRef(0);
  const prevValueRef = useRef(initialValue);
  const tipMarkerRef = useRef<HTMLDivElement>(null);
  const growTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sparkPalette = useMemo(
    () => resolveSparkPalette(sparkClassName),
    [sparkClassName],
  );

  const isGrowingThisRender = value > prevValueRef.current;
  const showGrowTransition =
    changeOnlyGrow && (growTransitionActive || isGrowingThisRender);

  useEffect(() => {
    if (!showDemo) {
      setProgress(initialValue);
    }
  }, [initialValue, showDemo]);

  useLayoutEffect(() => {
    if (!changeOnlyGrow) {
      prevValueRef.current = value;
      return;
    }

    const prev = prevValueRef.current;
    if (value > prev) {
      if (!disableGlow) {
        setGlowKey((k) => k + 1);
        setGlowSegmentIndex(getActiveSegmentIndex(value, segments));
      }
      setGrowTransitionActive(true);
      if (growTimerRef.current) clearTimeout(growTimerRef.current);
      growTimerRef.current = setTimeout(() => {
        setGrowTransitionActive(false);
        growTimerRef.current = null;
      }, tweenDurationMs);
      if (emitSparksOnGrow) {
        setGrowSparkSession((s) => s + 1);
      }
    }
    prevValueRef.current = value;

    return () => {
      if (growTimerRef.current) {
        clearTimeout(growTimerRef.current);
        growTimerRef.current = null;
      }
    };
  }, [
    value,
    segments,
    changeOnlyGrow,
    disableGlow,
    emitSparksOnGrow,
    tweenDurationMs,
  ]);

  useEffect(() => {
    if (!animate) {
      setDisplayValue(value);
      setIsInitialized(true);
      return;
    }

    if (!isInitialized) {
      const initTimeout = setTimeout(() => setIsInitialized(true), 50);
      return () => clearTimeout(initTimeout);
    }

    const duration = tweenDurationMs;
    startValueRef.current = displayValue;
    startTimeRef.current = performance.now();

    const tick = (currentTime: number) => {
      const elapsed = currentTime - startTimeRef.current;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      const newValue =
        startValueRef.current + (value - startValueRef.current) * eased;
      setDisplayValue(newValue);

      if (t < 1) {
        animationRef.current = requestAnimationFrame(tick);
      }
    };

    animationRef.current = requestAnimationFrame(tick);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
    // displayValue is captured at effect start via startValueRef; omit from deps
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
  }, [value, isInitialized, animate, tweenDurationMs]);

  return (
    <>
      <div
        className={cn(
          "flex flex-col",
          compact ? "gap-1" : "gap-8",
          className,
        )}
      >
        <div className={cn("flex flex-col", compact ? "gap-1" : "gap-3")}>
          {(label || showPercentage) && (
            <div
              className={cn(
                "flex items-center",
                compact && !showPercentage
                  ? "justify-center"
                  : "justify-between",
              )}
            >
              {label && (
                <span
                  className={cn(
                    "font-medium text-muted-foreground tracking-wide whitespace-nowrap",
                    compact
                      ? "text-2xs leading-none text-neutral-400"
                      : "text-sm",
                  )}
                >
                  {label}
                </span>
              )}
              {showPercentage && (
                <span className="text-sm font-semibold text-foreground tabular-nums tracking-tight">
                  {Math.round(displayValue)}%
                </span>
              )}
            </div>
          )}

          <div
            className="relative flex gap-[3px] py-0.5"
            role="progressbar"
            aria-label={ariaLabel ?? label}
            aria-valuenow={ariaValueNow ?? value}
            aria-valuemin={ariaValueMin}
            aria-valuemax={ariaValueMax}
            data-testid={dataTestId}
          >
            {Array.from({ length: segments }).map((_, index) => {
              const fill = getSegmentFill(displayValue, segments, index);
              const delay =
                isInitialized && !changeOnlyGrow ? index * 20 : 0;
              const showSegmentGlow =
                glowKey > 0 && index === glowSegmentIndex && fill > 0;

              return (
                <div
                  key={index}
                  className={cn(
                    "relative h-3 flex-1 overflow-hidden rounded-[4px]",
                    emptyClassName,
                    segmentClassName,
                  )}
                >
                  <div
                    className={cn(
                      "absolute inset-y-0 left-0 overflow-hidden transition-[width] ease-out",
                      changeOnlyGrow
                        ? "duration-0"
                        : "duration-500",
                      !renderFill && filledClassName,
                    )}
                    style={{
                      width: `${fill * 100}%`,
                      transitionDelay: `${delay}ms`,
                    }}
                  >
                    {renderFill ? renderFill() : null}
                    {showSegmentGlow && (
                      <motion.div
                        key={glowKey}
                        className={cn(
                          "pointer-events-none absolute inset-0 z-[1] bg-gradient-to-r from-transparent to-transparent",
                          sparkClassName
                            ? resolveGrowGlowViaClass(sparkClassName)
                            : "via-orange-300/90",
                        )}
                        initial={{ x: "-100%", opacity: 1 }}
                        animate={{ x: "100%", opacity: 0 }}
                        transition={{
                          duration: Math.min(0.9, tweenDurationMs / 1000),
                          ease: "easeOut",
                        }}
                      />
                    )}
                  </div>
                </div>
              );
            })}

            {emitSparksOnGrow && (
              // Zero-size tip anchor (same as Progress): glow radius uses
              // Math.max(17, height*5); h-full here inflated the orb.
              <div
                ref={tipMarkerRef}
                className="pointer-events-none absolute top-1/2 z-20 w-0 -translate-y-1/2"
                style={{ left: `${Math.min(100, Math.max(0, displayValue))}%` }}
                aria-hidden
              >
                {growSparkTipGlow && showGrowTransition && (
                  <div
                    className={cn(
                      "absolute right-0 top-1/2 h-2 min-h-[8px] w-0.5 -translate-y-1/2",
                      sparkPalette.tipMarkerClassName,
                    )}
                  />
                )}
              </div>
            )}
          </div>
        </div>

        {showDemo && (
          <div className="flex flex-col gap-4">
            <input
              type="range"
              min={0}
              max={100}
              value={progress}
              onChange={(e) => setProgress(Number(e.target.value))}
              className="w-full h-1.5 bg-muted rounded-full appearance-none cursor-pointer
                transition-all duration-300
                [&::-webkit-slider-thumb]:appearance-none
                [&::-webkit-slider-thumb]:w-4
                [&::-webkit-slider-thumb]:h-4
                [&::-webkit-slider-thumb]:rounded-full
                [&::-webkit-slider-thumb]:bg-primary
                [&::-webkit-slider-thumb]:shadow-[0_0_10px_hsl(var(--primary)/0.4)]
                [&::-webkit-slider-thumb]:cursor-pointer
                [&::-webkit-slider-thumb]:transition-all
                [&::-webkit-slider-thumb]:duration-300
                [&::-webkit-slider-thumb]:ease-out
                [&::-webkit-slider-thumb]:hover:scale-125
                [&::-webkit-slider-thumb]:hover:shadow-[0_0_16px_hsl(var(--primary)/0.6)]
                [&::-moz-range-thumb]:w-4
                [&::-moz-range-thumb]:h-4
                [&::-moz-range-thumb]:rounded-full
                [&::-moz-range-thumb]:bg-primary
                [&::-moz-range-thumb]:border-0
                [&::-moz-range-thumb]:cursor-pointer"
            />
            <p className="text-center text-xs text-muted-foreground tracking-wide">
              Drag to adjust value
            </p>
          </div>
        )}
      </div>

      {emitSparksOnGrow && growSparkSession > 0 && (
        <ProgressGrowSparksCanvas
          key={growSparkSession}
          tipMarkerRef={tipMarkerRef}
          durationMs={tweenDurationMs}
          sessionKey={growSparkSession}
          showTipGlow={growSparkTipGlow}
          showBrightSparks
          sparkPalette={sparkPalette}
          sparkIntensity="full"
          countScale={0.7}
        />
      )}
    </>
  );
}
