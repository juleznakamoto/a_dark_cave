"use client"

import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"
import { motion } from "framer-motion"

import { cn } from "@/lib/utils"

interface ProgressProps extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> {
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

interface GrowSpark {
  angle: number;
  distance: number;
  size: number;
  duration: number;
  delay: number;
  color: string;
}

const GROW_SPARK_COLORS = [
  "#fde68a", // amber-200
  "#fbbf24", // amber-400
  "#f59e0b", // amber-500
  "#f97316", // orange-500
  "#ef4444", // red-500
];

function createGrowSpark(): GrowSpark {
  // Bias sparks toward the right, spraying up and down from the moving tip.
  const angle = (-70 + Math.random() * 140) * (Math.PI / 180);
  return {
    angle,
    distance: 6 + Math.random() * 14,
    size: 1.5 + Math.random() * 2,
    duration: 0.35 + Math.random() * 0.4,
    delay: 0,
    color:
      GROW_SPARK_COLORS[Math.floor(Math.random() * GROW_SPARK_COLORS.length)],
  };
}

/** Match CSS `ease-out` used by the bar grow transition. */
function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

interface ActiveGrowSpark extends GrowSpark {
  id: number;
  leftPct: number;
}

const GROW_SPARK_EMIT_INTERVAL_MS = 45;
const GROW_SPARKS_PER_EMIT = 2;

/**
 * Emit sparks along the bar's grow path. Each batch spawns at the eased tip
 * position for the current frame so sparks trail the moving right edge from
 * x → x+1, not only at the destination.
 */
function ProgressGrowSparks({
  fromPct,
  toPct,
  durationMs,
}: {
  fromPct: number;
  toPct: number;
  durationMs: number;
}) {
  const [activeSparks, setActiveSparks] = React.useState<ActiveGrowSpark[]>([]);
  const nextSparkIdRef = React.useRef(0);

  const removeSpark = React.useCallback((id: number) => {
    setActiveSparks((prev) => prev.filter((spark) => spark.id !== id));
  }, []);

  React.useEffect(() => {
    const start = performance.now();
    let lastEmit = -GROW_SPARK_EMIT_INTERVAL_MS;
    let rafId = 0;

    const tick = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / durationMs);
      const currentPct = fromPct + (toPct - fromPct) * easeOut(t);

      if (elapsed - lastEmit >= GROW_SPARK_EMIT_INTERVAL_MS) {
        lastEmit = elapsed;
        const batch = Array.from({ length: GROW_SPARKS_PER_EMIT }, () => ({
          id: nextSparkIdRef.current++,
          leftPct: currentPct,
          ...createGrowSpark(),
        }));
        setActiveSparks((prev) => [...prev, ...batch]);
      }

      if (t < 1) {
        rafId = requestAnimationFrame(tick);
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [fromPct, toPct, durationMs]);

  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-visible">
      {activeSparks.map((spark) => (
        <motion.span
          key={spark.id}
          className="absolute top-1/2 rounded-full"
          style={{
            left: `${spark.leftPct}%`,
            width: spark.size,
            height: spark.size,
            marginLeft: -spark.size / 2,
            marginTop: -spark.size / 2,
            background: spark.color,
            boxShadow: `0 0 ${spark.size * 2}px ${spark.color}`,
          }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{
            x: Math.cos(spark.angle) * spark.distance,
            y: Math.sin(spark.angle) * spark.distance,
            opacity: 0,
            scale: 0.2,
          }}
          transition={{
            duration: spark.duration,
            ease: "easeOut",
          }}
          onAnimationComplete={() => removeSpark(spark.id)}
        />
      ))}
    </div>
  );
}

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  ProgressProps
>(({ className, value, segments = 1, hideBorder = false, disableGlow = false, flashOnDecrease = false, growAnimationMs = 0, indicatorClassName, emitSparksOnGrow = false, ...props }, ref) => {
  const [animationKey, setAnimationKey] = React.useState(0);
  const [flashKey, setFlashKey] = React.useState(0);
  const [sparkBurst, setSparkBurst] = React.useState<{
    key: number;
    from: number;
    to: number;
  } | null>(null);
  const prevValueRef = React.useRef(value || 0);
  const isGrowing = (value || 0) > prevValueRef.current;

  React.useEffect(() => {
    const currentValue = value ?? 0;
    if (value != null) {
      if (!disableGlow && currentValue > prevValueRef.current) {
        setAnimationKey(prev => prev + 1);
      }
      if (emitSparksOnGrow && growAnimationMs > 0 && currentValue > prevValueRef.current) {
        setSparkBurst(prev => ({
          key: (prev?.key ?? 0) + 1,
          from: prevValueRef.current,
          to: currentValue,
        }));
      }
      if (flashOnDecrease && currentValue < prevValueRef.current) {
        setFlashKey(prev => prev + 1);
      }
    }
    prevValueRef.current = currentValue;
  }, [value, disableGlow, flashOnDecrease, emitSparksOnGrow, growAnimationMs]);

  const root = (
    <ProgressPrimitive.Root
      ref={ref}
      className={cn(
        "relative h-4 w-full overflow-hidden rounded-full bg-neutral-900 transition-all",
        !hideBorder && value === 100 && "border border-red-900",
        className
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
        className={cn("h-full w-full flex-1 bg-red-950 relative z-10 overflow-hidden", indicatorClassName)}
        style={{
          transform: `translateX(-${100 - (value || 0)}%)`,
          transition: flashOnDecrease
            ? "transform 400ms ease-out"
            : isGrowing && growAnimationMs > 0
              ? `transform ${growAnimationMs}ms ease-out`
              : undefined,
        }}
      >
        {/* Glow effect - animates on every increase */}
        {animationKey > 0 && (
          <motion.div
            key={animationKey}
            className={cn("absolute inset-0 bg-gradient-to-r from-transparent to-transparent pointer-events-none", indicatorClassName ? "via-orange-400/80" : "via-red-500/100")}
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
      </ProgressPrimitive.Indicator>
    </ProgressPrimitive.Root>
  );

  if (!emitSparksOnGrow) {
    return root;
  }

  // Wrapper is not clipped so sparks can spray beyond the (thin) bar bounds.
  return (
    <div className="relative w-full">
      {root}
      {sparkBurst && (
        <ProgressGrowSparks
          key={sparkBurst.key}
          fromPct={sparkBurst.from}
          toPct={sparkBurst.to}
          durationMs={growAnimationMs}
        />
      )}
    </div>
  );
})
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }
