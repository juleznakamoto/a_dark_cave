"use client";

import * as React from "react";
import { useState, useRef, forwardRef, useImperativeHandle } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { tailwindToHex } from "@/lib/tailwindColors";
import type { ButtonProps } from "@/components/ui/button";

/** Full configuration for particle animation - all params optional with defaults */
export interface ParticleConfig {
  colors?: string[];
  /** Colors only used for particles with size <= smallParticleMaxSize */
  smallParticleOnlyColors?: string[];
  /** Max size (inclusive) for smallParticleOnlyColors. Default 2. */
  smallParticleMaxSize?: number;
  count?: number;
  durationMin?: number;
  durationMax?: number;
  distanceMin?: number;
  distanceMax?: number;
  sizeMin?: number;
  sizeMax?: number;
  glowDuration?: number;
  bubbleRemoveDelay?: number;
  /** Cubic bezier for framer-motion, e.g. [0, 0, 0.5, 1] */
  ease?: number[];
}

interface BubblyButtonProps extends ButtonProps {
  bubbleColor?: string;
  bubbleColors?: string[];
  /** Full particle config - overrides bubbleColors when both provided */
  particleConfig?: Partial<ParticleConfig>;
  onAnimationTrigger?: (x: number, y: number) => void;
}

interface Bubble {
  id: string;
  x: number;
  y: number;
}

export interface BubblyButtonHandle {
  triggerAnimation: (x: number, y: number) => void;
}

// Build/stone tones (neutral, gray)
const BUILD_TONES = [
  tailwindToHex("neutral-800"),
  tailwindToHex("neutral-900"),
  tailwindToHex("neutral-950"),
  tailwindToHex("stone-800"),
  tailwindToHex("stone-700"),
  tailwindToHex("stone-900"),
  tailwindToHex("stone-950"),
];

// Craft tones (amber, copper, bronze) - for craft action buttons
export const CRAFT_TONES = [
  tailwindToHex("amber-900"),
  tailwindToHex("amber-950"),
  tailwindToHex("yellow-900"),
  tailwindToHex("orange-950"),
  tailwindToHex("red-950"),
];

const DEFAULT_PARTICLE_CONFIG: Required<ParticleConfig> = {
  colors: BUILD_TONES,
  smallParticleOnlyColors: [],
  smallParticleMaxSize: 2,
  count: 150,
  durationMin: 0.65,
  durationMax: 1.1,
  distanceMin: 40,
  distanceMax: 80,
  sizeMin: 5,
  sizeMax: 25,
  glowDuration: 700,
  bubbleRemoveDelay: 3000,
  ease: [0, 0, 0.5, 1],
};

const BUILD_SMALL_PARTICLE_ONLY_COLORS = [tailwindToHex("gray-200")];

/** Build preset - stone/neutral tones, default sizing */
export const BUILD_PARTICLE_CONFIG: Partial<ParticleConfig> = {
  colors: BUILD_TONES,
  smallParticleOnlyColors: BUILD_SMALL_PARTICLE_ONLY_COLORS,
  smallParticleMaxSize: 2,
};

const CRAFT_SMALL_PARTICLE_ONLY_COLORS = [
  tailwindToHex("yellow-500"),
  tailwindToHex("red-500"),
];

/** Craft preset - amber/copper tones, snappier/shorter animation */
export const CRAFT_PARTICLE_CONFIG: Partial<ParticleConfig> = {
  colors: CRAFT_TONES,
  smallParticleOnlyColors: CRAFT_SMALL_PARTICLE_ONLY_COLORS,
  smallParticleMaxSize: 2,
  count: 150,
  durationMin: 0.45,
  durationMax: 0.7,
  distanceMin: 25,
  distanceMax: 65,
  sizeMin: 1,
  sizeMax: 6,
  glowDuration: 500,
  bubbleRemoveDelay: 2500,
};

// Mine tones (grey/black base for all mining)
const MINE_TONES = [
  tailwindToHex("neutral-800"),
  tailwindToHex("neutral-900"),
  tailwindToHex("neutral-950"),
  tailwindToHex("stone-800"),
  tailwindToHex("stone-900"),
  tailwindToHex("stone-950"),
];

// Per-resource highlight colors for small particles (size 1-2)
const MINE_HIGHLIGHT_COLORS: Record<string, string[]> = {
  mineStone: [tailwindToHex("stone-400"), tailwindToHex("gray-400")],
  mineIron: [tailwindToHex("red-800"), tailwindToHex("orange-900")],
  mineCoal: [tailwindToHex("slate-950"), tailwindToHex("gray-950")],
  mineSulfur: [tailwindToHex("yellow-500"), tailwindToHex("amber-400")],
  mineObsidian: [tailwindToHex("violet-600"), tailwindToHex("purple-600")],
  mineAdamant: [tailwindToHex("indigo-400"), tailwindToHex("blue-400")],
};

/** Get mine particle config for a specific mine action (stone, iron, coal, etc.) */
export function getMineParticleConfig(actionId: string): Partial<ParticleConfig> {
  const highlightColors = MINE_HIGHLIGHT_COLORS[actionId] ?? [];
  return {
    colors: MINE_TONES,
    smallParticleOnlyColors: highlightColors,
    smallParticleMaxSize: 5,
    count: 200,
    durationMin: 0.5,
    durationMax: 1,
    distanceMin: 25,
    distanceMax: 60,
    sizeMin: 1,
    sizeMax: 10,
    glowDuration: 500,
    bubbleRemoveDelay: 2500,
  };
}

// Cave explore tones - darker/more mysterious as depth increases
// Cave explore base tones (stone/neutral - same for all levels)
const EXPLORE_TONES = [
  tailwindToHex("stone-700"),
  tailwindToHex("stone-800"),
  tailwindToHex("stone-900"),
  tailwindToHex("neutral-700"),
  tailwindToHex("neutral-800"),
  tailwindToHex("neutral-900"),
  tailwindToHex("slate-700"),
  tailwindToHex("slate-800"),
  tailwindToHex("slate-900"),
];

// Per-level highlight colors for small particles - based on resources found at each level.
// Colors accumulate: each level keeps colors from the previous level for resources that still exist,
// and adds new colors only for newly introduced resources.
const EXPLORE_LEVEL_ORDER = [
  "exploreCave",
  "ventureDeeper",
  "descendFurther",
  "exploreRuins",
  "exploreTemple",
] as const;

const EXPLORE_RESOURCES_BY_LEVEL: Record<string, string[]> = {
  exploreCave: ["wood", "stone", "coal", "iron"],
  ventureDeeper: ["stone", "coal", "iron", "sulfur", "silver"],
  descendFurther: ["stone", "coal", "iron", "obsidian", "silver"],
  exploreRuins: ["obsidian", "adamant", "silver", "gold"],
  exploreTemple: ["obsidian", "adamant", "moonstone", "silver", "gold"],
};

const RESOURCE_HIGHLIGHT_COLORS: Record<string, string> = {
  wood: "amber-600",
  stone: "stone-400",
  coal: "slate-600",
  iron: "slate-500",
  sulfur: "yellow-500",
  silver: "slate-400",
  obsidian: "violet-700",
  adamant: "indigo-400",
  gold: "amber-500",
  moonstone: "sky-400",
};

function buildExploreHighlightColors(): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  const resourceToColor: Record<string, string> = {};

  for (const level of EXPLORE_LEVEL_ORDER) {
    const resources = EXPLORE_RESOURCES_BY_LEVEL[level];
    const colors: string[] = [];
    for (const r of resources) {
      if (!resourceToColor[r]) {
        resourceToColor[r] = tailwindToHex(RESOURCE_HIGHLIGHT_COLORS[r] ?? "stone-400");
      }
      colors.push(resourceToColor[r]);
    }
    result[level] = colors;
  }
  return result;
}

const EXPLORE_HIGHLIGHT_COLORS: Record<string, string[]> = {
  ...buildExploreHighlightColors(),
  // Final stage - defined individually for a distinct look
  exploreCitadel: [
    tailwindToHex("violet-400"),
    tailwindToHex("indigo-400"),
    tailwindToHex("amber-400"),
    tailwindToHex("sky-300"),
    tailwindToHex("slate-300"),
  ],
};

const EXPLORE_LEVEL_ORDER_FOR_COUNT = [...EXPLORE_LEVEL_ORDER, "exploreCitadel"];

/** Get cave explore particle config by action id (shared base + per-level highlights) */
export function getExploreParticleConfig(actionId: string): Partial<ParticleConfig> {
  const highlightColors = EXPLORE_HIGHLIGHT_COLORS[actionId] ?? [];
  const levelIndex = EXPLORE_LEVEL_ORDER_FOR_COUNT.indexOf(actionId);
  const count =
    actionId === "exploreCitadel" ? 200 : levelIndex >= 0 ? 40 + levelIndex * 20 : 100;
  return {
    colors: EXPLORE_TONES,
    smallParticleOnlyColors: highlightColors,
    smallParticleMaxSize: 3,
    count,
    durationMin: 0.5,
    durationMax: 1.2,
    distanceMin: 25,
    distanceMax: 75,
    sizeMin: 2,
    sizeMax: 10,
    bubbleRemoveDelay: 2500,
  };
}

// Chop wood / Gather wood - forest tones
export const CHOP_WOOD_PARTICLE_CONFIG: Partial<ParticleConfig> = {
  colors: [
    tailwindToHex("amber-950"),
    tailwindToHex("yellow-950"),
    tailwindToHex("orange-950"),
    tailwindToHex("stone-950")
  ],
  smallParticleOnlyColors: [tailwindToHex("green-950")],
  smallParticleMaxSize: 8,
  count: 100,
  durationMin: 0.35,
  durationMax: 0.7,
  distanceMin: 25,
  distanceMax: 65,
  sizeMin: 2,
  sizeMax: 16,
  bubbleRemoveDelay: 2500,
};

// Gold coin - slow gentle emission for hover
export const GOLD_COIN_PARTICLE_CONFIG: Partial<ParticleConfig> = {
  colors: [
    tailwindToHex("yellow-500"),
    tailwindToHex("yellow-600"),
    tailwindToHex("amber-500"),
    tailwindToHex("amber-600"),
  ],
  count: 4,
  durationMin: 0.5,
  durationMax: 1.5,
  distanceMin: 10,
  distanceMax: 25,
  sizeMin: 1,
  sizeMax: 3,
  bubbleRemoveDelay: 2500,
};

// Silver coin - slow gentle emission for hover
export const SILVER_COIN_PARTICLE_CONFIG: Partial<ParticleConfig> = {
  colors: [
    tailwindToHex("gray-300"),
    tailwindToHex("gray-400"),
    tailwindToHex("slate-300"),
    tailwindToHex("slate-400"),
    tailwindToHex("zinc-300"),
  ],
  count: 4,
  durationMin: 0.5,
  durationMax: 1.5,
  distanceMin: 10,
  distanceMax: 25,
  sizeMin: 1,
  sizeMax: 3,
  bubbleRemoveDelay: 2500,
};

// Hunt - fur, blood, forest tones
export const HUNT_PARTICLE_CONFIG: Partial<ParticleConfig> = {
  colors: [
    tailwindToHex("amber-900"),
    tailwindToHex("stone-800"),
    tailwindToHex("red-950"),
    tailwindToHex("orange-900"),
    tailwindToHex("neutral-800"),
  ],
  smallParticleOnlyColors: [tailwindToHex("red-600")],
  smallParticleMaxSize: 4,
  count: 140,
  durationMin: 0.3,
  durationMax: 0.65,
  distanceMin: 25,
  distanceMax: 50,
  sizeMin: 2,
  sizeMax: 10,
  bubbleRemoveDelay: 2500,
};

function mergeParticleConfig(
  base: Partial<ParticleConfig>,
  override?: Partial<ParticleConfig>
): Required<ParticleConfig> {
  if (!override) return { ...DEFAULT_PARTICLE_CONFIG, ...base };
  return {
    ...DEFAULT_PARTICLE_CONFIG,
    ...base,
    ...override,
    colors: override.colors ?? base.colors ?? DEFAULT_PARTICLE_CONFIG.colors,
  };
}

const BubblyButton = forwardRef<BubblyButtonHandle, BubblyButtonProps>(
  (
    {
      className,
      onClick,
      children,
      bubbleColor = "#8b7355",
      bubbleColors,
      particleConfig,
      onAnimationTrigger,
      ...props
    },
    ref,
  ) => {
    const [bubbles, setBubbles] = useState<Bubble[]>([]);
    const [isGlowing, setIsGlowing] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const bubbleIdCounter = useRef(0);

    const config = mergeParticleConfig(
      bubbleColors ? { colors: bubbleColors } : {},
      particleConfig
    );

    const triggerAnimation = (x: number, y: number) => {
      // Always use center of button for animation
      const button = buttonRef.current;
      if (!button) return;

      const rect = button.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const newBubble: Bubble = {
        id: `bubble-${bubbleIdCounter.current++}`,
        x: centerX,
        y: centerY,
      };

      setBubbles((prev) => [...prev, newBubble]);

      // Remove bubble after animation completes (longer to account for varied durations)
      setTimeout(() => {
        setBubbles((prev) => prev.filter((b) => b.id !== newBubble.id));
      }, config.bubbleRemoveDelay);

      setIsGlowing(true);
      setTimeout(() => {
        setIsGlowing(false);
      }, config.glowDuration);
    };

    // Expose triggerAnimation method via ref
    useImperativeHandle(ref, () => ({
      triggerAnimation,
    }));

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      const button = buttonRef.current;
      if (!button) return;

      const rect = button.getBoundingClientRect();

      // Trigger animation locally (always from center)
      triggerAnimation(0, 0);

      // Notify parent if callback provided (for lifted state pattern)
      // Pass the absolute center position to parent
      if (onAnimationTrigger) {
        onAnimationTrigger(
          rect.left + rect.width / 2,
          rect.top + rect.height / 2,
        );
      }

      // Call original onClick
      if (onClick) {
        onClick(e);
      }
    };

    return (
      <div
        style={{
          position: "relative",
          display: "inline-block",
          isolation: "isolate",
        }}
      >
        {/* Bubble animations container - behind button */}
        <div
          className="absolute pointer-events-none overflow-visible"
          style={{
            left: 0,
            top: 0,
            width: "100%",
            height: "100%",
            zIndex: -1,
          }}
        >
          <AnimatePresence>
            {bubbles.map((bubble) => {
              const particleBubbles = Array.from({ length: config.count }).map(() => {
                const angle = Math.random() * Math.PI * 2;
                const distance = config.distanceMin + Math.random() * (config.distanceMax - config.distanceMin);
                const size = config.sizeMin + Math.random() * (config.sizeMax - config.sizeMin);
                const colorPool =
                  config.smallParticleOnlyColors?.length && size > config.smallParticleMaxSize
                    ? config.colors.filter((c) => !config.smallParticleOnlyColors!.includes(c))
                    : config.smallParticleOnlyColors?.length
                      ? [...config.colors, ...config.smallParticleOnlyColors]
                      : config.colors;
                const color = colorPool[Math.floor(Math.random() * colorPool.length)] ?? config.colors[0];
                const duration = config.durationMin + Math.random() * (config.durationMax - config.durationMin);

                return { size, angle, distance, color, duration };
              });

              return particleBubbles.map((b, index) => {
                const endX = Math.cos(b.angle) * b.distance;
                const endY = Math.sin(b.angle) * b.distance;

                return (
                  <motion.div
                    key={`${bubble.id}-${index}`}
                    className="absolute rounded-full"
                    style={{
                      width: `${b.size}px`,
                      height: `${b.size}px`,
                      backgroundColor: b.color,
                      left: bubble.x - b.size / 2,
                      top: bubble.y - b.size / 2,
                      boxShadow: `0 0 ${b.size * 0.5}px ${b.color}aa, 0 0 ${b.size * 1}px ${b.color}55`,
                      zIndex: -1,
                    }}
                    initial={{
                      opacity: 1,
                      scale: 1,
                      x: 0,
                      y: 0,
                    }}
                    animate={{
                      opacity: 0.8,
                      scale: 0.0,
                      x: endX,
                      y: endY,
                    }}
                    exit={{
                      opacity: 0.8,
                    }}
                    transition={{
                      duration: b.duration,
                      ease: config.ease as [number, number, number, number],
                    }}
                  />
                );
              });
            })}
          </AnimatePresence>
        </div>

        {/* Button - in front */}
        <Button
          ref={buttonRef}
          onClick={handleClick}
          className={cn(
            "transition-all duration-100 ease-in overflow-visible",
            className,
          )}
          style={
            (() => {
              const c = config.colors;
              return {
                boxShadow: isGlowing
                  ? `0 0 15px ${c[2] ?? c[0]}99, 0 0 30px ${c[3] ?? c[1]}66, 0 0 40px ${c[4] ?? c[2]}33`
                  : undefined,
                transition: "box-shadow 0.15s ease-out",
                filter: isGlowing ? "brightness(1.2)" : undefined,
                position: "relative",
                zIndex: 10,
                transform: "translateZ(0)",
              } as React.CSSProperties;
            })()
          }
          {...props}
        >
          {children}
        </Button>
      </div>
    );
  },
);

BubblyButton.displayName = "BubblyButton";

// Helper to generate particle data for global portal (accepts full config or colors array for legacy)
export function generateParticleData(
  configOrColors?: Partial<ParticleConfig> | string[]
): Array<{ size: number; color: string; duration: number; endX: number; endY: number }> {
  const config = mergeParticleConfig(
    Array.isArray(configOrColors) ? { colors: configOrColors } : configOrColors ?? {}
  );
  return Array.from({ length: config.count }).map(() => {
    const angle = Math.random() * Math.PI * 2;
    const distance = config.distanceMin + Math.random() * (config.distanceMax - config.distanceMin);
    const size = config.sizeMin + Math.random() * (config.sizeMax - config.sizeMin);
    const colorPool =
      config.smallParticleOnlyColors?.length && size > config.smallParticleMaxSize
        ? config.colors.filter((c) => !config.smallParticleOnlyColors!.includes(c))
        : config.smallParticleOnlyColors?.length
          ? [...config.colors, ...config.smallParticleOnlyColors]
          : config.colors;
    const color = colorPool[Math.floor(Math.random() * colorPool.length)] ?? config.colors[0];
    const duration = config.durationMin + Math.random() * (config.durationMax - config.durationMin);
    const endX = Math.cos(angle) * distance;
    const endY = Math.sin(angle) * distance;
    return { size, color, duration, endX, endY };
  });
}

export interface BubbleWithParticles {
  id: string;
  x: number;
  y: number;
  particles: ReturnType<typeof generateParticleData>;
}

// Global bubble portal component for lifted state pattern
export const BubblyButtonGlobalPortal = ({
  bubbles,
  zIndex = 5,
}: {
  bubbles: BubbleWithParticles[];
  zIndex?: number;
}) => {
  return (
    <div className="fixed inset-0 pointer-events-none" style={{ zIndex }}>
      <AnimatePresence>
        {bubbles.map((bubble) => (
          <div key={bubble.id}>
            {bubble.particles.map((particle, i) => (
              <motion.div
                key={`${bubble.id}-${i}`}
                className="fixed rounded-full"
                style={{
                  width: `${particle.size}px`,
                  height: `${particle.size}px`,
                  backgroundColor: particle.color,
                  left: bubble.x - particle.size / 2,
                  top: bubble.y - particle.size / 2,
                  boxShadow: `0 0 ${particle.size * 0.5}px ${particle.color}aa, 0 0 ${particle.size * 1}px ${particle.color}55`,
                }}
                initial={{ opacity: 1, scale: 1, x: 0, y: 0 }}
                animate={{
                  opacity: 0.8,
                  scale: 0.0,
                  x: particle.endX,
                  y: particle.endY,
                }}
                exit={{ opacity: 0.8 }}
                transition={{ duration: particle.duration, ease: [0, 0, 0.5, 1] }}
              />
            ))}
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export { BubblyButton };
