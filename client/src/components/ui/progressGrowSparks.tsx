"use client";

import * as React from "react";
import { createPortal } from "react-dom";

import { Z_INDEX } from "@/lib/z-index";
import { tailwindToHex } from "@/lib/tailwindColors";

export interface GrowSparkParticle {
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

export interface SparkPalette {
  warmColors: string[];
  brightColors: string[];
  tipGlowInner: string;
  tipGlowMid: string;
  tipGlowOuter: string;
  tipMarkerClassName: string;
}

const GROW_SPARK_COLORS = [
  tailwindToHex("red-600"),
  tailwindToHex("red-700"),
  tailwindToHex("red-800"),
];

const BRIGHT_SPARK_COLORS = [
  tailwindToHex("yellow-300"),
  tailwindToHex("yellow-400"),
  tailwindToHex("amber-300"),
  tailwindToHex("amber-400"),
];

export const ESTATE_SPARK_PALETTE: SparkPalette = {
  warmColors: GROW_SPARK_COLORS,
  brightColors: BRIGHT_SPARK_COLORS,
  tipGlowInner: tailwindToHex("yellow-100"),
  tipGlowMid: tailwindToHex("yellow-200"),
  tipGlowOuter: tailwindToHex("yellow-300/60"),
  tipMarkerClassName:
    "bg-yellow-400 shadow-[0_0_10px_3px] shadow-yellow-400",
};

export function resolveSparkPalette(indicatorClassName?: string): SparkPalette {
  if (indicatorClassName?.includes("green")) {
    return {
      warmColors: [
        tailwindToHex("green-500"),
        tailwindToHex("green-600"),
        tailwindToHex("green-700"),
      ],
      brightColors: [
        tailwindToHex("green-300"),
        tailwindToHex("green-400"),
        tailwindToHex("green-500"),
        tailwindToHex("emerald-400"),
      ],
      tipGlowInner: tailwindToHex("green-300"),
      tipGlowMid: tailwindToHex("green-400"),
      tipGlowOuter: tailwindToHex("green-500/60"),
      tipMarkerClassName:
        "bg-green-500 shadow-[0_0_10px_3px] shadow-green-500",
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

export function resolveGrowCircleColors(indicatorClassName?: string): string[] {
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

export function resolveGrowGlowViaClass(indicatorClassName?: string): string {
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
export function ProgressGrowSparksCanvas({
  tipMarkerRef,
  durationMs,
  sessionKey,
  showTipGlow = true,
  showBrightSparks = true,
  sparkPalette = ESTATE_SPARK_PALETTE,
  sparkIntensity = "full",
  /** Multiplier for particles per emit (e.g. 0.7 = 30% fewer). */
  countScale = 1,
}: {
  tipMarkerRef: React.RefObject<HTMLDivElement | null>;
  durationMs: number;
  sessionKey: number;
  showTipGlow?: boolean;
  showBrightSparks?: boolean;
  sparkPalette?: SparkPalette;
  sparkIntensity?: "full" | "subtle";
  countScale?: number;
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
    let lastTipX: number | null = null;
    let tipEverMoved = false;
    let tipMotionlessMs = 0;
    let tipSettled = false;

    const intensityScale = sparkIntensity === "subtle" ? 0.35 : 1;
    const scale = Math.max(0, intensityScale * countScale);
    const warmPerEmit = Math.max(1, Math.floor(GROW_SPARKS_PER_EMIT * scale));
    const brightPerEmit = Math.max(
      1,
      Math.floor(BRIGHT_SPARKS_PER_EMIT * scale),
    );

    const loop = (now: number) => {
      const elapsed = now - start;
      const dt = Math.min(0.05, (now - lastFrameRef.current) / 1000);
      lastFrameRef.current = now;

      const marker = tipMarkerRef.current;
      let tipX = 0;
      let tipY = 0;
      let tipHeight = 0;
      if (marker) {
        const rect = marker.getBoundingClientRect();
        tipX = rect.right;
        tipY = rect.top + rect.height / 2;
        tipHeight = rect.height;
        if (lastTipX != null) {
          const dx = Math.abs(tipX - lastTipX);
          if (dx > 0.4) {
            tipEverMoved = true;
            tipMotionlessMs = 0;
            tipSettled = false;
          } else {
            tipMotionlessMs += dt * 1000;
            // Ease-out tip crawls then stops; cut emit/glow once it settles.
            if (tipEverMoved && tipMotionlessMs > 48) {
              tipSettled = true;
            }
          }
        }
        lastTipX = tipX;
      }

      const tipActive = elapsed <= durationMs && !tipSettled;

      if (
        tipActive &&
        elapsed - lastEmit >= GROW_SPARK_EMIT_INTERVAL_MS &&
        marker
      ) {
        lastEmit = elapsed;
        for (let i = 0; i < warmPerEmit; i++) {
          particlesRef.current.push(
            createGrowSparkParticle(tipX, tipY, "warm", sparkPalette),
          );
        }
        if (showBrightSparks) {
          for (let i = 0; i < brightPerEmit; i++) {
            particlesRef.current.push(
              createGrowSparkParticle(tipX, tipY, "bright", sparkPalette),
            );
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

      if (showTipGlow && tipActive && marker) {
        drawTipGlow(ctx, tipX, tipY, tipHeight, sparkPalette);
      }

      for (const particle of particlesRef.current) {
        drawGrowSparkParticle(ctx, particle);
      }
      ctx.globalAlpha = 1;

      if (tipActive || particlesRef.current.length > 0) {
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
    countScale,
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
