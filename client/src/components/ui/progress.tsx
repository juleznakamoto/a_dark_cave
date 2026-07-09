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

function drawTipGlow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  barHeight: number,
) {
  const radius = Math.max(18, barHeight * 5);
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, tailwindToHex("yellow-100"));
  gradient.addColorStop(0.3, tailwindToHex("yellow-200"));
  gradient.addColorStop(0.5, tailwindToHex("yellow-300/60"));
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

function createGrowSparkParticle(
  x: number,
  y: number,
  variant: GrowSparkParticle["variant"],
): GrowSparkParticle {
  const angle = (-70 + Math.random() * 140) * (Math.PI / 180);
  const isBright = variant === "bright";
  const speed = isBright ? 50 + Math.random() * 250 : 20 + Math.random() * 30;
  const maxLife = isBright
    ? 0.2 + Math.random() * 0.6
    : 0.2 + Math.random() * 0.4;
  const colors = isBright ? BRIGHT_SPARK_COLORS : GROW_SPARK_COLORS;
  return {
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    size: isBright ? 0.2 + Math.random() * 0.8 : 1 + Math.random() * 3,
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
}: {
  tipMarkerRef: React.RefObject<HTMLDivElement | null>;
  durationMs: number;
  sessionKey: number;
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
          for (let i = 0; i < GROW_SPARKS_PER_EMIT; i++) {
            particlesRef.current.push(createGrowSparkParticle(x, y, "warm"));
          }
          for (let i = 0; i < BRIGHT_SPARKS_PER_EMIT; i++) {
            particlesRef.current.push(createGrowSparkParticle(x, y, "bright"));
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

      if (elapsed <= durationMs) {
        const marker = tipMarkerRef.current;
        if (marker) {
          const rect = marker.getBoundingClientRect();
          drawTipGlow(ctx, rect.right, rect.top + rect.height / 2, rect.height);
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
  }, [tipMarkerRef, durationMs, sessionKey]);

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
      ...props
    },
    ref,
  ) => {
    const [animationKey, setAnimationKey] = React.useState(0);
    const [flashKey, setFlashKey] = React.useState(0);
    const [growSparkSession, setGrowSparkSession] = React.useState(0);
    const [growTransitionActive, setGrowTransitionActive] =
      React.useState(false);
    const tipMarkerRef = React.useRef<HTMLDivElement>(null);
    const prevValueRef = React.useRef(value || 0);
    const growTransitionTimerRef = React.useRef<ReturnType<
      typeof setTimeout
    > | null>(null);
    const currentValue = value ?? 0;
    const isGrowingThisRender = currentValue > prevValueRef.current;
    const showGrowTransition =
      growAnimationMs > 0 && (growTransitionActive || isGrowingThisRender);

    React.useLayoutEffect(() => {
      const nextValue = value ?? 0;
      if (value != null) {
        if (!disableGlow && nextValue > prevValueRef.current) {
          setAnimationKey((prev) => prev + 1);
        }
        if (growAnimationMs > 0 && nextValue > prevValueRef.current) {
          setGrowTransitionActive(true);
          if (growTransitionTimerRef.current) {
            clearTimeout(growTransitionTimerRef.current);
          }
          growTransitionTimerRef.current = setTimeout(() => {
            setGrowTransitionActive(false);
            growTransitionTimerRef.current = null;
          }, growAnimationMs);

          if (emitSparksOnGrow) {
            setGrowSparkSession((prev) => prev + 1);
          }
        }
        if (flashOnDecrease && nextValue < prevValueRef.current) {
          setFlashKey((prev) => prev + 1);
        }
      }
      prevValueRef.current = nextValue;
    }, [
      value,
      disableGlow,
      flashOnDecrease,
      emitSparksOnGrow,
      growAnimationMs,
    ]);

    React.useEffect(() => {
      return () => {
        if (growTransitionTimerRef.current) {
          clearTimeout(growTransitionTimerRef.current);
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
            transition: flashOnDecrease
              ? "transform 400ms ease-out"
              : showGrowTransition
                ? `transform ${growAnimationMs}ms ease-out`
                : undefined,
          }}
        >
          {/* Glow effect - animates on every increase */}
          {animationKey > 0 && (
            <motion.div
              key={animationKey}
              className={cn(
                "absolute inset-0 bg-gradient-to-r from-transparent to-transparent pointer-events-none",
                indicatorClassName ? "via-orange-400/80" : "via-red-500/100",
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
          {emitSparksOnGrow && (
            <div
              ref={tipMarkerRef}
              className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2"
              aria-hidden
            >
              {showGrowTransition && (
                <div className="absolute right-0 top-1/2 h-full min-h-[8px] w-0.5 -translate-y-1/2 bg-yellow-400 shadow-[0_0_10px_3px] shadow-yellow-400" />
              )}
            </div>
          )}
        </ProgressPrimitive.Indicator>
      </ProgressPrimitive.Root>
    );

    return (
      <>
        {root}
        {emitSparksOnGrow && growSparkSession > 0 && (
          <ProgressGrowSparksCanvas
            key={growSparkSession}
            tipMarkerRef={tipMarkerRef}
            durationMs={growAnimationMs}
            sessionKey={growSparkSession}
          />
        )}
      </>
    );
  },
);
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };
