"use client";

import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

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
  /** Hover glow on a filled segment (default: primary glow). */
  filledGlowClassName?: string;
  /** Compact spacing for tight chrome (e.g. footer). */
  compact?: boolean;
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
  filledGlowClassName = "shadow-[0_0_16px_hsl(var(--primary)/0.5)]",
  compact = false,
  "aria-label": ariaLabel,
  "aria-valuenow": ariaValueNow,
  "aria-valuemin": ariaValueMin = 0,
  "aria-valuemax": ariaValueMax = 100,
  "data-testid": dataTestId,
}: SegmentedProgressProps) {
  const [progress, setProgress] = useState(initialValue);
  const value = showDemo ? progress : initialValue;

  const [displayValue, setDisplayValue] = useState(0);
  const [hoveredSegment, setHoveredSegment] = useState<number | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const animationRef = useRef<number | null>(null);
  const startValueRef = useRef(0);
  const startTimeRef = useRef(0);

  const filledSegments = Math.round((displayValue / 100) * segments);

  useEffect(() => {
    if (!showDemo) {
      setProgress(initialValue);
    }
  }, [initialValue, showDemo]);

  useEffect(() => {
    if (!isInitialized) {
      const initTimeout = setTimeout(() => setIsInitialized(true), 50);
      return () => clearTimeout(initTimeout);
    }

    const duration = 800;
    startValueRef.current = displayValue;
    startTimeRef.current = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTimeRef.current;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      const newValue =
        startValueRef.current + (value - startValueRef.current) * eased;
      setDisplayValue(newValue);

      if (t < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
    // displayValue is captured at effect start via startValueRef; omit from deps
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
  }, [value, isInitialized]);

  const getSegmentStyle = (index: number) => {
    let scale = 1;
    let translateY = 0;

    if (hoveredSegment !== null) {
      const distance = Math.abs(hoveredSegment - index);
      if (distance === 0) {
        scale = 1.3;
        translateY = -1;
      } else if (distance <= 3) {
        const falloff = Math.cos((distance / 3) * (Math.PI / 2));
        scale = 1 + 0.2 * falloff;
        translateY = -0.5 * falloff;
      }
    }

    const delay = isInitialized ? index * 20 : 0;

    return {
      transform: `scaleY(${scale}) translateY(${translateY}px)`,
      transitionDelay: `${delay}ms`,
      opacity: 1,
    };
  };

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
              <span
                className="text-sm font-semibold text-foreground tabular-nums tracking-tight transition-all duration-300"
                style={{
                  filter:
                    hoveredSegment !== null
                      ? "brightness(1.2)"
                      : "brightness(1)",
                }}
              >
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
            const isFilled = index < filledSegments;
            const isHovered = hoveredSegment === index;

            return (
              <div
                key={index}
                onMouseEnter={() => setHoveredSegment(index)}
                onMouseLeave={() => setHoveredSegment(null)}
                className={cn(
                  "h-3 flex-1 rounded-[4px] cursor-pointer origin-center",
                  "transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
                  isFilled ? filledClassName : emptyClassName,
                  isHovered && isFilled && cn("brightness-110", filledGlowClassName),
                  isHovered && !isFilled && "brightness-125",
                  hoveredSegment !== null &&
                  !isFilled &&
                  !isHovered &&
                  "opacity-70",
                  segmentClassName,
                )}
                style={getSegmentStyle(index)}
              />
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
