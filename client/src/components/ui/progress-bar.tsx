"use client";

import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

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
  emptyClassName = "bg-muted/60",
  segmentClassName,
  compact = false,
  animate = true,
  "aria-label": ariaLabel,
  "aria-valuenow": ariaValueNow,
  "aria-valuemin": ariaValueMin = 0,
  "aria-valuemax": ariaValueMax = 100,
  "data-testid": dataTestId,
}: SegmentedProgressProps) {
  const [progress, setProgress] = useState(initialValue);
  const value = showDemo ? progress : initialValue;

  const [displayValue, setDisplayValue] = useState(animate ? 0 : initialValue);
  const [isInitialized, setIsInitialized] = useState(!animate);
  const animationRef = useRef<number | null>(null);
  const startValueRef = useRef(0);
  const startTimeRef = useRef(0);

  useEffect(() => {
    if (!showDemo) {
      setProgress(initialValue);
    }
  }, [initialValue, showDemo]);

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

    const duration = 800;
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
  }, [value, isInitialized, animate]);

  return (
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
          className="flex gap-[3px] py-0.5"
          role="progressbar"
          aria-label={ariaLabel ?? label}
          aria-valuenow={ariaValueNow ?? value}
          aria-valuemin={ariaValueMin}
          aria-valuemax={ariaValueMax}
          data-testid={dataTestId}
        >
          {Array.from({ length: segments }).map((_, index) => {
            const fill = getSegmentFill(displayValue, segments, index);
            const delay = isInitialized ? index * 20 : 0;

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
                    "absolute inset-y-0 left-0 transition-[width] duration-500 ease-out",
                    filledClassName,
                  )}
                  style={{
                    width: `${fill * 100}%`,
                    transitionDelay: `${delay}ms`,
                  }}
                />
              </div>
            );
          })}
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
  );
}
