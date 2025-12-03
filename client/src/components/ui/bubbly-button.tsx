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
const NEUTRAL_TONES = [
  tailwindToHex("neutral-700"),
  tailwindToHex("neutral-800"),
  tailwindToHex("neutral-900"),
  tailwindToHex("neutral-950"),
];

const BubblyButton = forwardRef<BubblyButtonHandle, BubblyButtonProps>(
  ({ className, onClick, children, bubbleColor = "#8b7355", bubbleColors, onAnimationTrigger, ...props }, ref) => {
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
      }, 3500);

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
          display: "inline-block",
          transformStyle: "preserve-3d",
          perspective: "1000px",
        }}
      >
        {/* Bubble animations container - behind button using translateZ(-1px) */}
        <div
          className="absolute pointer-events-none overflow-visible"
          style={{
            transform: "translateZ(-1px)",
            transformStyle: "preserve-3d",
            left: 0,
            top: 0,
            width: "100%",
            height: "100%",
          }}
        >
          <AnimatePresence>
            {bubbles.map((bubble) => {
              // Generate 100 bubbles
              const particleBubbles = Array.from({ length: 100 }).map(() => {
                const angle = Math.random() * Math.PI * 2;
                const distance = 30 + Math.random() * 120;
                const size = 3 + Math.random() * 25;
                const color = NEUTRAL_TONES[Math.floor(Math.random() * NEUTRAL_TONES.length)];
                const duration = 2.5 + Math.random() * 1.0;

                return { size, angle, distance, color, duration };
              });

              return (
                <React.Fragment key={bubble.id}>
                  {particleBubbles.map((b, index) => {
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
                          left: bubble.x,
                          top: bubble.y,
                          boxShadow: `0 0 ${b.size * 0.8}px ${b.color}aa, 0 0 ${b.size * 1.5}px ${b.color}55`,
                        }}
                        initial={{
                          opacity: 0.8,
                          scale: 1,
                          x: 0,
                          y: 0,
                        }}
                        animate={{
                          opacity: 1,
                          scale: 0.1,
                          x: endX,
                          y: endY,
                        }}
                        exit={{
                          opacity: 0,
                        }}
                        transition={{
                          duration: b.duration,
                          ease: "linear",
                        }}
                      />
                    );
                  })}
                </React.Fragment>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Button - in front using translateZ(0) */}
        <Button
          ref={buttonRef}
          onClick={handleClick}
          className={cn(
            "relative transition-all duration-100 ease-in overflow-visible",
            "active:scale-90",
            className
          )}
          style={
            {
              boxShadow: isGlowing
                ? `0 0 15px ${NEUTRAL_TONES[2]}99, 0 0 30px ${NEUTRAL_TONES[3]}66, 0 0 40px ${NEUTRAL_TONES[4]}33`
                : undefined,
              transition: "box-shadow 0.15s ease-out",
              filter: isGlowing ? "brightness(1.2)" : undefined,
              transform: "translateZ(0)",
              transformStyle: "preserve-3d",
            } as React.CSSProperties
          }
          {...props}
        >
          {children}
        </Button>
      </div>
    );
  }
);

BubblyButton.displayName = "BubblyButton";

// Global bubble portal component for lifted state pattern
export const BubblyButtonGlobalPortal = ({ bubbles }: { bubbles: Array<{ id: string; x: number; y: number }> }) => {
  return (
    <div className="fixed inset-0 pointer-events-none z-[9998]">
      <AnimatePresence>
        {bubbles.map(bubble => (
          <div key={bubble.id}>
            {Array.from({ length: 100 }).map((_, i) => {
              const angle = Math.random() * Math.PI * 2;
              const distance = 30 + Math.random() * 120;
              const size = 3 + Math.random() * 25;
              const color = NEUTRAL_TONES[Math.floor(Math.random() * NEUTRAL_TONES.length)];
              const duration = 2.5 + Math.random() * 1.2;
              
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
                    left: bubble.x,
                    top: bubble.y,
                    zIndex: 9998,
                    boxShadow: `0 0 ${size * 0.8}px ${color}aa, 0 0 ${size * 1.5}px ${color}55`,
                  }}
                  initial={{ opacity: 0.8, scale: 1, x: 0, y: 0 }}
                  animate={{
                    opacity: 0,
                    scale: 0.1,
                    x: endX,
                    y: endY,
                  }}
                  exit={{ opacity: 0 }}
                  transition={{ duration, ease: [0.16, 1, 0.3, 1] }}
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