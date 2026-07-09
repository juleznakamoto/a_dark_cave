"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { motion } from "framer-motion";

import { cn } from "@/lib/utils";
import { Z_INDEX } from "@/lib/z-index";
import { tailwindToHex } from "@/lib/tailwindColors";

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
  /** Emit soft circle particles near the bar tip while it grows — no tip glow or bright sparks */
  emitCirclesOnGrow?: boolean;
  /** Emit soft circle particles near the bar tip while it shrinks — no tip glow or bright sparks */
  emitCirclesOnDecrease?: boolean;
}

interface GrowSparkParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
  /** Warm embers with soft glow; bright sparks stay tiny and crisp. */
  variant: "warm" | "bright";
}

const GROW_SPARK_COLORS = [
  tailwindToHex("red-600"),
  tailwindToHex("red-700"),
  tailwindToHex("red-800"),
];

const BRIGHT_SPARK_COLORS = [
  tailwindToHex("yellow-100"),
  tailwindToHex("yellow-200"),
  tailwindToHex("amber-100"),
  tailwindToHex("amber-200"),
];

interface SparkPalette {
  warmColors: string[];
  brightColors: string[];
  tipGlowInner: string;
  tipGlowMid: string;
  tipGlowOuter: string;
  tipMarkerClassName: string;
}

const ESTATE_SPARK_PALETTE: SparkPalette = {
  warmColors: GROW_SPARK_COLORS,
  brightColors: BRIGHT_SPARK_COLORS,
  tipGlowInner: tailwindToHex("yellow-100"),
  tipGlowMid: tailwindToHex("yellow-200"),
  tipGlowOuter: tailwindToHex("yellow-300/60"),
  tipMarkerClassName:
    "bg-yellow-400 shadow-[0_0_10px_3px] shadow-yellow-400",
};

function resolveSparkPalette(indicatorClassName?: string): SparkPalette {
  if (indicatorClassName?.includes("green")) {
    return {
      warmColors: [
        tailwindToHex("green-600"),
        tailwindToHex("green-700"),
        tailwindToHex("green-800"),
      ],
      brightColors: [
        tailwindToHex("green-100"),
        tailwindToHex("green-200"),
        tailwindToHex("lime-100"),
        tailwindToHex("lime-200"),
      ],
      tipGlowInner: tailwindToHex("green-100"),
      tipGlowMid: tailwindToHex("green-200"),
      tipGlowOuter: tailwindToHex("green-300/60"),
      tipMarkerClassName:
        "bg-green-400 shadow-[0_0_10px_3px] shadow-green-400",
    };
  }

  if (indicatorClassName?.includes("red")) {
    return {
      warmColors: [
        tailwindToHex("red-600"),
        tailwindToHex("red-700"),
        tailwindToHex("red-800"),
      ],
      brightColors: [
        tailwindToHex("red-100"),
        tailwindToHex("red-200"),
        tailwindToHex("orange-100"),
        tailwindToHex("orange-200"),
      ],
      tipGlowInner: tailwindToHex("red-100"),
      tipGlowMid: tailwindToHex("red-200"),
      tipGlowOuter: tailwindToHex("red-300/60"),
      tipMarkerClassName: "bg-red-400 shadow-[0_0_10px_3px] shadow-red-400",
    };
  }

  return ESTATE_SPARK_PALETTE;
}

function drawTipGlow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  barHeight: number,
  palette: SparkPalette,
) {
  const radius = Math.max(17, barHeight * 5);
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, palette.tipGlowInner);
  gradient.addColorStop(0.3, palette.tipGlowMid);
  gradient.addColorStop(0.5, palette.tipGlowOuter);
  gradient.addColorStop(1, "transparent");

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

const GROW_SPARK_EMIT_INTERVAL_MS = Math.floor(Math.random() * 6) + 3;
const GROW_SPARKS_PER_EMIT = Math.floor(Math.random() * 9) + 4;
const BRIGHT_SPARKS_PER_EMIT = Math.floor(Math.random() * 9) + 3;

function resolveGrowCircleColors(indicatorClassName?: string): string[] {
  if (!indicatorClassName) return GROW_SPARK_COLORS;
  const match = indicatorClassName.match(/bg-([a-z]+)-(\d+)/);
  if (!match) return GROW_SPARK_COLORS;
  const [, colorName, shadeStr] = match;
  const shade = parseInt(shadeStr, 10);
  const shades = [
    shade,
    Math.min(950, shade + 100),
    Math.max(500, shade - 100),
  ].filter((s, index, arr) => arr.indexOf(s) === index);
  return shades.map((s) => tailwindToHex(`${colorName}-${s}`));
}

function resolveGrowGlowViaClass(indicatorClassName?: string): string {
  if (!indicatorClassName) return "via-red-500/100";
  if (indicatorClassName.includes("green")) return "via-green-400/80";
  if (indicatorClassName.includes("red")) return "via-red-500/100";
  return "via-orange-400/80";
}

function createGrowSparkParticle(
  x: number,
  y: number,
  variant: GrowSparkParticle["variant"],
  palette: SparkPalette,
): GrowSparkParticle {
  const angle = (-70 + Math.random() * 140) * (Math.PI / 180);
  const isBright = variant === "bright";
  const speed = isBright ? 50 + Math.random() * 250 : 20 + Math.random() * 30;
  const maxLife = isBright
    ? 0.2 + Math.random() * 0.6
    : 0.2 + Math.random() * 0.4;
  const colors = isBright ? palette.brightColors : palette.warmColors;
  return {
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    size: isBright ? 0.2 + Math.random() * 0.6 : 1 + Math.random() * 3,
    color: colors[Math.floor(Math.random() * colors.length)],
    life: maxLife,
    maxLife,
    variant,
  };
}

function brightSparkAlpha(life: number, maxLife: number): number {
  const lifeRatio = Math.max(0, life / maxLife);
  // Full opacity at spawn; fade only in the last 40% of lifetime.
  const fadeStart = 0.4;
  if (lifeRatio >= fadeStart) return 1;
  return lifeRatio / fadeStart;
}

function drawGrowSparkParticle(
  ctx: CanvasRenderingContext2D,
  particle: GrowSparkParticle,
) {
  const alpha = Math.max(0, particle.life / particle.maxLife);
  ctx.globalAlpha =
    particle.variant === "bright"
      ? brightSparkAlpha(particle.life, particle.maxLife)
      : alpha;
  ctx.fillStyle = particle.color;

  if (particle.variant === "bright") {
    // Fixed-size pinpoints — no shadow blur so they never bloom/grow.
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  ctx.shadowColor = particle.color;
  ctx.shadowBlur = particle.size * 2;
  ctx.beginPath();
  ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
}

/**
 * Canvas spark trail driven by a DOM marker on the bar's right edge.
 * Each frame reads getBoundingClientRect() so sparks follow the actual CSS
 * grow transition instead of a separately computed percentage path.
 */
function ProgressGrowSparksCanvas({
  tipMarkerRef,
  durationMs,
  sessionKey,
  showTipGlow = true,
  showBrightSparks = true,
  sparkPalette = ESTATE_SPARK_PALETTE,
  sparkIntensity = "full",
}: {
  tipMarkerRef: React.RefObject<HTMLDivElement | null>;
  durationMs: number;
  sessionKey: number;
  showTipGlow?: boolean;
  showBrightSparks?: boolean;
  sparkPalette?: SparkPalette;
  sparkIntensity?: "full" | "subtle";
}) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const particlesRef = React.useRef<GrowSparkParticle[]>([]);
  const rafRef = React.useRef(0);
  const lastFrameRef = React.useRef(0);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;

      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;

      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const start = performance.now();
    let lastEmit = -GROW_SPARK_EMIT_INTERVAL_MS;
    lastFrameRef.current = start;

    const warmPerEmit =
      sparkIntensity === "subtle"
        ? Math.max(2, Math.floor(GROW_SPARKS_PER_EMIT * 0.35))
        : GROW_SPARKS_PER_EMIT;
    const brightPerEmit =
      sparkIntensity === "subtle"
        ? Math.max(1, Math.floor(BRIGHT_SPARKS_PER_EMIT * 0.35))
        : BRIGHT_SPARKS_PER_EMIT;

    const loop = (now: number) => {
      const elapsed = now - start;
      const dt = Math.min(0.05, (now - lastFrameRef.current) / 1000);
      lastFrameRef.current = now;

      if (
        elapsed - lastEmit >= GROW_SPARK_EMIT_INTERVAL_MS &&
        elapsed <= durationMs
      ) {
        lastEmit = elapsed;
        const marker = tipMarkerRef.current;
        if (marker) {
          const rect = marker.getBoundingClientRect();
          const x = rect.right;
          const y = rect.top + rect.height / 2;
          for (let i = 0; i < warmPerEmit; i++) {
            particlesRef.current.push(
              createGrowSparkParticle(x, y, "warm", sparkPalette),
            );
          }
          if (showBrightSparks) {
            for (let i = 0; i < brightPerEmit; i++) {
              particlesRef.current.push(
                createGrowSparkParticle(x, y, "bright", sparkPalette),
              );
            }
          }
        }
      }

      particlesRef.current = particlesRef.current.filter((particle) => {
        particle.x += particle.vx * dt;
        particle.y += particle.vy * dt;
        particle.vx *= 0.92;
        particle.vy *= 0.92;
        particle.life -= dt;
        return particle.life > 0;
      });

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (showTipGlow && elapsed <= durationMs) {
        const marker = tipMarkerRef.current;
        if (marker) {
          const rect = marker.getBoundingClientRect();
          drawTipGlow(
            ctx,
            rect.right,
            rect.top + rect.height / 2,
            rect.height,
            sparkPalette,
          );
        }
      }

      for (const particle of particlesRef.current) {
        drawGrowSparkParticle(ctx, particle);
      }
      ctx.globalAlpha = 1;

      if (elapsed < durationMs || particlesRef.current.length > 0) {
        rafRef.current = requestAnimationFrame(loop);
      }
    };

    particlesRef.current = [];
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
      particlesRef.current = [];
      window.removeEventListener("resize", resize);
    };
  }, [
    tipMarkerRef,
    durationMs,
    sessionKey,
    showTipGlow,
    showBrightSparks,
    sparkPalette,
    sparkIntensity,
  ]);

  return createPortal(
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0"
      style={{ zIndex: Z_INDEX.particles }}
      aria-hidden
    />,
    document.body,
  );
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
    const particlePalette = React.useMemo(() => {
      if (emitSparksOnGrow) return sparkPalette;
      return {
        ...sparkPalette,
        warmColors: resolveGrowCircleColors(indicatorClassName),
      };
    }, [emitSparksOnGrow, sparkPalette, indicatorClassName]);
    const changeAnimationMs =
      growAnimationMs > 0
        ? growAnimationMs
        : emitCirclesOnDecrease || flashOnDecrease
          ? 400
          : 0;
    const [animationKey, setAnimationKey] = React.useState(0);
    const [flashKey, setFlashKey] = React.useState(0);
    const [growSparkSession, setGrowSparkSession] = React.useState(0);
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
            "h-full w-full flex-1 bg-red-950 relative z-10 overflow-hidden",
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
              {emitSparksOnGrow && showGrowTransition && (
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
            showTipGlow={emitSparksOnGrow}
            showBrightSparks={emitSparksOnGrow}
            sparkPalette={particlePalette}
            sparkIntensity={emitSparksOnGrow ? growSparkIntensity : "subtle"}
          />
        )}
      </>
    );
  },
);
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };
