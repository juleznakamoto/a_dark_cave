"use client";

import * as React from "react";
import { useState, useRef, forwardRef, useImperativeHandle } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  type BubbleWithParticles,
  type ParticleConfig,
  mergeParticleConfig,
} from "@/components/ui/bubbly-button.particles";
import type { ButtonProps } from "@/components/ui/button";

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
    const buttonRef = useRef<HTMLButtonElement>(null);
    const bubbleIdCounter = useRef(0);

    const config = mergeParticleConfig(
      bubbleColors ? { colors: bubbleColors } : {},
      particleConfig,
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

      // Remove bubble after animation completes (all particles start at once, so durationMax is the max)
      setTimeout(() => {
        setBubbles((prev) => prev.filter((b) => b.id !== newBubble.id));
      }, config.bubbleRemoveDelay);
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
        onAnimationTrigger(rect.left + rect.width / 2, rect.top + rect.height / 2);
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
                const distance =
                  config.distanceMin + Math.random() * (config.distanceMax - config.distanceMin);
                const size = config.sizeMin + Math.random() * (config.sizeMax - config.sizeMin);
                const colorPool =
                  config.smallParticleOnlyColors?.length && size > config.smallParticleMaxSize
                    ? config.colors.filter((c) => !config.smallParticleOnlyColors!.includes(c))
                    : config.smallParticleOnlyColors?.length
                      ? [...config.colors, ...config.smallParticleOnlyColors]
                      : config.colors;
                const color = colorPool[Math.floor(Math.random() * colorPool.length)] ?? config.colors[0];
                const duration =
                  config.durationMin + Math.random() * (config.durationMax - config.durationMin);

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
                      willChange: "transform",
                      transform: "translateZ(0)",
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
          style={{
            position: "relative",
            zIndex: 10,
            willChange: "transform",
            transform: "translateZ(0)",
          }}
          {...props}
        >
          {children}
        </Button>
      </div>
    );
  },
);

BubblyButton.displayName = "BubblyButton";

// Global bubble layer component for lifted state pattern
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
                  willChange: "transform",
                  transform: "translateZ(0)",
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
