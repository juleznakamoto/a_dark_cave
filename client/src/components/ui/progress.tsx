"use client";

import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { motion } from "framer-motion";

import { cn } from "@/lib/utils";
import {
  ProgressGrowSparksCanvas,
  resolveGrowCircleColors,
  resolveGrowGlowViaClass,
  resolveSparkPalette,
} from "@/components/ui/progressGrowSparks";

interface ProgressProps
  extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> {
  segments?: number;
  hideBorder?: boolean;
  disableGlow?: boolean;
  /** Flash the bar 3 times when value decreases (e.g. combat health bars) */
  flashOnDecrease?: boolean;
  /** Animate growth when value increases (milliseconds) */
  growAnimationMs?: number;
  /** Override the indicator fill color class (default: bg-red-950) */
  indicatorClassName?: string;
  /** Emit spark particles from the bar's right tip while it grows (e.g. estate "Improve" bars) */
  emitSparksOnGrow?: boolean;
  /** Particle count for grow sparks — `subtle` emits fewer (e.g. combat heal) */
  growSparkIntensity?: "full" | "subtle";
  /** Radial tip glow and tip marker while grow sparks play (estate bars) */
  growSparkTipGlow?: boolean;
  /** Emit soft circle particles near the bar tip while it grows — no tip glow or bright sparks */
  emitCirclesOnGrow?: boolean;
  /** Emit soft circle particles near the bar tip while it shrinks — no tip glow or bright sparks */
  emitCirclesOnDecrease?: boolean;
}

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  ProgressProps
>(
  (
    {
      className,
      value,
      segments = 1,
      hideBorder = false,
      disableGlow = false,
      flashOnDecrease = false,
      growAnimationMs = 0,
      indicatorClassName,
      emitSparksOnGrow = false,
      growSparkIntensity = "full",
      growSparkTipGlow = true,
      emitCirclesOnGrow = false,
      emitCirclesOnDecrease = false,
      ...props
    },
    ref,
  ) => {
    const emitGrowParticles = emitSparksOnGrow || emitCirclesOnGrow;
    const emitChangeParticles = emitGrowParticles || emitCirclesOnDecrease;
    const sparkPalette = React.useMemo(
      () => resolveSparkPalette(indicatorClassName),
      [indicatorClassName],
    );
    const particlePalette = React.useMemo(
      () => ({
        ...sparkPalette,
        warmColors: resolveGrowCircleColors(indicatorClassName),
      }),
      [sparkPalette, indicatorClassName],
    );
    const changeAnimationMs =
      growAnimationMs > 0
        ? growAnimationMs
        : emitCirclesOnDecrease || flashOnDecrease
          ? 400
          : 0;
    const [animationKey, setAnimationKey] = React.useState(0);
    const [flashKey, setFlashKey] = React.useState(0);
    const [growSparkSession, setGrowSparkSession] = React.useState(0);
    const [particleSessionDirection, setParticleSessionDirection] =
      React.useState<"grow" | "shrink">("grow");
    const [growTransitionActive, setGrowTransitionActive] =
      React.useState(false);
    const [shrinkTransitionActive, setShrinkTransitionActive] =
      React.useState(false);
    const tipMarkerRef = React.useRef<HTMLDivElement>(null);
    const prevValueRef = React.useRef(value || 0);
    const changeTransitionTimerRef = React.useRef<ReturnType<
      typeof setTimeout
    > | null>(null);
    const currentValue = value ?? 0;
    const isGrowingThisRender = currentValue > prevValueRef.current;
    const isShrinkingThisRender = currentValue < prevValueRef.current;
    const showGrowTransition =
      changeAnimationMs > 0 &&
      (growTransitionActive || isGrowingThisRender);
    const showShrinkTransition =
      changeAnimationMs > 0 &&
      (shrinkTransitionActive || isShrinkingThisRender);
    const showChangeTransition = showGrowTransition || showShrinkTransition;

    const startChangeTransition = React.useCallback(
      (direction: "grow" | "shrink", emitParticles: boolean) => {
        if (changeAnimationMs <= 0) return;
        if (direction === "grow") {
          setGrowTransitionActive(true);
        } else {
          setShrinkTransitionActive(true);
        }
        if (changeTransitionTimerRef.current) {
          clearTimeout(changeTransitionTimerRef.current);
        }
        changeTransitionTimerRef.current = setTimeout(() => {
          setGrowTransitionActive(false);
          setShrinkTransitionActive(false);
          changeTransitionTimerRef.current = null;
        }, changeAnimationMs);
        if (emitParticles) {
          setParticleSessionDirection(direction);
          setGrowSparkSession((prev) => prev + 1);
        }
      },
      [changeAnimationMs],
    );

    React.useLayoutEffect(() => {
      const nextValue = value ?? 0;
      if (value != null) {
        if (!disableGlow && nextValue > prevValueRef.current) {
          setAnimationKey((prev) => prev + 1);
        }
        if (nextValue > prevValueRef.current) {
          startChangeTransition("grow", emitGrowParticles);
        }
        if (nextValue < prevValueRef.current) {
          if (flashOnDecrease) {
            setFlashKey((prev) => prev + 1);
          }
          startChangeTransition("shrink", emitCirclesOnDecrease);
        }
      }
      prevValueRef.current = nextValue;
    }, [
      value,
      disableGlow,
      flashOnDecrease,
      emitGrowParticles,
      emitCirclesOnDecrease,
      startChangeTransition,
    ]);

    React.useEffect(() => {
      return () => {
        if (changeTransitionTimerRef.current) {
          clearTimeout(changeTransitionTimerRef.current);
        }
      };
    }, []);

    const isGrowSparkSession =
      particleSessionDirection === "grow" && emitSparksOnGrow;

    const root = (
      <ProgressPrimitive.Root
        ref={ref}
        className={cn(
          "relative h-4 w-full overflow-hidden rounded-full bg-neutral-900 transition-all",
          !hideBorder && value === 100 && "border border-red-900",
          className,
        )}
        {...props}
      >
        {/* Render segment dividers */}
        {segments > 1 && (
          <div className="absolute inset-0 flex">
            {Array.from({ length: segments }).map((_, i) => (
              <div
                key={i}
                className="flex-1 border-r border-neutral-600 last:border-r-0 bg-neutral"
              />
            ))}
          </div>
        )}

        {/* Progress indicator */}
        <ProgressPrimitive.Indicator
          className={cn(
            // rounded-full rounds the fill tip (right edge after translateX) to match the track
            "h-full w-full flex-1 bg-red-950 relative z-10 overflow-hidden rounded-full",
            indicatorClassName,
          )}
          style={{
            transform: `translateX(-${100 - (value || 0)}%)`,
            transition: showChangeTransition
              ? `transform ${changeAnimationMs}ms ease-out`
              : undefined,
          }}
        >
          {/* Glow effect - animates on every increase */}
          {animationKey > 0 && (
            <motion.div
              key={animationKey}
              className={cn(
                "absolute inset-0 bg-gradient-to-r from-transparent to-transparent pointer-events-none",
                resolveGrowGlowViaClass(indicatorClassName),
              )}
              initial={{ x: "-100%", opacity: 1 }}
              animate={{ x: "100%", opacity: 0 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
            />
          )}
          {/* Flash effect - 3 flashes when value decreases */}
          {flashKey > 0 && (
            <motion.div
              key={flashKey}
              className="absolute inset-0 bg-white pointer-events-none z-20"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.6, 0, 0.6, 0, 0.6, 0] }}
              transition={{ duration: 0.6, ease: "easeInOut" }}
            />
          )}
          {emitChangeParticles && (
            <div
              ref={tipMarkerRef}
              className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2"
              aria-hidden
            >
              {isGrowSparkSession &&
                growSparkTipGlow &&
                showGrowTransition && (
                  <div
                    className={cn(
                      "absolute right-0 top-1/2 h-full min-h-[8px] w-0.5 -translate-y-1/2",
                      sparkPalette.tipMarkerClassName,
                    )}
                  />
                )}
            </div>
          )}
        </ProgressPrimitive.Indicator>
      </ProgressPrimitive.Root>
    );

    return (
      <>
        {root}
        {emitChangeParticles && growSparkSession > 0 && (
          <ProgressGrowSparksCanvas
            key={growSparkSession}
            tipMarkerRef={tipMarkerRef}
            durationMs={changeAnimationMs}
            sessionKey={growSparkSession}
            showTipGlow={isGrowSparkSession && growSparkTipGlow}
            showBrightSparks={isGrowSparkSession}
            sparkPalette={
              isGrowSparkSession ? sparkPalette : particlePalette
            }
            sparkIntensity={
              isGrowSparkSession ? growSparkIntensity : "subtle"
            }
          />
        )}
      </>
    );
  },
);
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };
