"use client";

import * as React from "react";
import { useState, useRef, forwardRef, useImperativeHandle } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { tailwindToHex } from "@/lib/tailwindColors";
import type { ButtonProps } from "@/components/ui/button";

interface BubblyButtonProps extends ButtonProps {
  bubbleColor?: string;
  bubbleColors?: string[];
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

// 4 gray tones from light to dark using Tailwind colors
const TONES = [
  tailwindToHex("neutral-800"),
  tailwindToHex("neutral-900"),
  tailwindToHex("neutral-950/90"),
  tailwindToHex("neutral-950"),
  tailwindToHex("stone-800"),
  tailwindToHex("stone-900"),
  tailwindToHex("stone-950/90"),
  tailwindToHex("stone-950"),
];

const BubblyButton = forwardRef<BubblyButtonHandle, BubblyButtonProps>(
  (
    {
      className,
      onClick,
      children,
      bubbleColor = "#8b7355",
      bubbleColors,
      onAnimationTrigger,
      ...props
    },
    ref,
  ) => {
    const [bubbles, setBubbles] = useState<Bubble[]>([]);
    const [isGlowing, setIsGlowing] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const bubbleIdCounter = useRef(0);

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
      }, 3000);

      // Trigger glow effect for 1 second
      setIsGlowing(true);
      setTimeout(() => {
        setIsGlowing(false);
      }, 700);
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
              // Generate 100 bubbles
              const particleBubbles = Array.from({ length: 100 }).map(() => {
                const angle = Math.random() * Math.PI * 2;
                const distanceX = 20 + Math.random() * 120;
                const distanceY = 20 + Math.random() * 80;
                const size = 3 + Math.random() * 25;
                const color = TONES[Math.floor(Math.random() * TONES.length)];
                const duration = 2.0 + Math.random() * 1.0;

                return { size, angle, distanceX, distanceY, color, duration };
              });

              return particleBubbles.map((b, index) => {
                const endX = Math.cos(b.angle) * b.distanceX;
                const endY = Math.sin(b.angle) * b.distanceY;

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
                      boxShadow: `0 0 ${b.size * 0.8}px ${b.color}aa, 0 0 ${b.size * 1.5}px ${b.color}55`,
                    }}
                    initial={{
                      opacity: 1,
                      scale: 1,
                      x: 0,
                      y: 0,
                    }}
                    animate={{
                      opacity: 0.0,
                      scale: 0.0,
                      x: endX,
                      y: endY,
                    }}
                    exit={{
                      opacity: 0,
                    }}
                    transition={{
                      duration: b.duration,
                      ease: [0.16, 1, 0.3, 1],
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
            "relative transition-all duration-100 ease-in overflow-visible",
            className,
          )}
          style={
            {
              boxShadow: isGlowing
                ? `0 0 15px ${TONES[2]}99, 0 0 30px ${TONES[3]}66, 0 0 40px ${TONES[4]}33`
                : undefined,
              transition: "box-shadow 0.15s ease-out",
              filter: isGlowing ? "brightness(1.2)" : undefined,
              zIndex: 0,
            } as React.CSSProperties
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

// Global bubble portal component for lifted state pattern
export const BubblyButtonGlobalPortal = ({
  bubbles,
  zIndex = -1,
}: {
  bubbles: Array<{ id: string; x: number; y: number }>;
  zIndex?: number;
}) => {
  return (
    <div className="fixed inset-0 pointer-events-none" style={{ zIndex }}>
      <AnimatePresence>
        {bubbles.map((bubble) => (
          <div key={bubble.id} style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%", isolation: "isolate" }}>
            {Array.from({ length: 150 }).map((_, i) => {
              const angle = Math.random() * Math.PI * 2;
              const distance = 40 + Math.random() * 60;
              const size = 5 + Math.random() * 20;
              const color = TONES[Math.floor(Math.random() * TONES.length)];
              const duration = 2 + Math.random() * 1.0;
              // Ensure particles move outwards by using positive distance in all directions
              const endX = Math.cos(angle) * distance;
              const endY = Math.sin(angle) * distance;

              return (
                <motion.div
                  key={`${bubble.id}-${i}`}
                  className="fixed rounded-full"
                  style={{
                    width: `${size}px`,
                    height: `${size}px`,
                    backgroundColor: color,
                    left: bubble.x - size / 2,
                    top: bubble.y - size / 2,
                    zIndex: -1,
                    boxShadow: `0 0 ${size * 0.5}px ${color}aa, 0 0 ${size * 1}px ${color}55`,
                  }}
                  initial={{ opacity: 1, scale: 1, x: 0, y: 0 }}
                  animate={{
                    opacity: 0.8,
                    scale: 0.0,
                    x: endX,
                    y: endY,
                  }}
                  exit={{ opacity: 0.8 }}
                  transition={{ duration, ease: [0, 0, 0.5, 1] }}
                />
              );
            })}
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export { BubblyButton };
