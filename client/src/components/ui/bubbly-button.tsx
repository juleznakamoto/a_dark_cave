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
  tailwindToHex("neutral-950/90"),
  tailwindToHex("neutral-950"),
  tailwindToHex("stone-800"),
  tailwindToHex("stone-900"),
  tailwindToHex("stone-950/90"),
  tailwindToHex("stone-950"),
];

// Craft tones (amber, copper, bronze) - for craft action buttons
export const CRAFT_TONES = [
  tailwindToHex("amber-900"),
  tailwindToHex("amber-950"),
  tailwindToHex("yellow-900"),
  tailwindToHex("orange-900"),
  tailwindToHex("orange-950"),
  tailwindToHex("red-900"),
  tailwindToHex("red-950"),

];

const DEFAULT_PARTICLE_CONFIG: Required<ParticleConfig> = {
  colors: BUILD_TONES,
  count: 150,
  durationMin: 0.75,
  durationMax: 1.25,
  distanceMin: 40,
  distanceMax: 100,
  sizeMin: 5,
  sizeMax: 25,
  glowDuration: 700,
  bubbleRemoveDelay: 3000,
  ease: [0, 0, 0.5, 1],
};

/** Build preset - stone/neutral tones, default sizing */
export const BUILD_PARTICLE_CONFIG: Partial<ParticleConfig> = {
  colors: BUILD_TONES,
};

/** Craft preset - amber/copper tones, snappier/shorter animation */
export const CRAFT_PARTICLE_CONFIG: Partial<ParticleConfig> = {
  colors: CRAFT_TONES,
  durationMin: 1,
  durationMax: 1.8,
  distanceMin: 30,
  distanceMax: 70,
  sizeMin: 4,
  sizeMax: 18,
  glowDuration: 500,
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
                const color = config.colors[Math.floor(Math.random() * config.colors.length)];
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
    const color = config.colors[Math.floor(Math.random() * config.colors.length)];
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
