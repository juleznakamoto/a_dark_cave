"use client";

import * as React from "react";
import { useState, useRef, forwardRef, useImperativeHandle } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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

// 8 gray tones from light to dark
const GRAY_TONES = [
  "#f5f5f5",
  "#e0e0e0",
  "#bdbdbd",
  "#9e9e9e",
  "#757575",
  "#616161",
  "#424242",
  "#212121",
];

const BubblyButton = forwardRef<BubblyButtonHandle, BubblyButtonProps>(
  ({ className, onClick, children, bubbleColor = "#8b7355", bubbleColors, onAnimationTrigger, ...props }, ref) => {
    const [bubbles, setBubbles] = useState<Bubble[]>([]);
    const [isGlowing, setIsGlowing] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const bubbleIdCounter = useRef(0);

    const triggerAnimation = (x: number, y: number) => {
      const newBubble: Bubble = {
        id: `bubble-${bubbleIdCounter.current++}`,
        x,
        y,
      };

      setBubbles((prev) => [...prev, newBubble]);

      // Remove bubble after animation completes (longer to account for varied durations)
      setTimeout(() => {
        setBubbles((prev) => prev.filter((b) => b.id !== newBubble.id));
      }, 5000);

      // Trigger glow effect for 1 second
      setIsGlowing(true);
      setTimeout(() => {
        setIsGlowing(false);
      }, 1000);
    };

    // Expose triggerAnimation method via ref
    useImperativeHandle(ref, () => ({
      triggerAnimation,
    }));

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      const button = buttonRef.current;
      if (!button) return;

      const rect = button.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Trigger animation locally
      triggerAnimation(x, y);

      // Notify parent if callback provided (for lifted state pattern)
      if (onAnimationTrigger) {
        onAnimationTrigger(e.clientX, e.clientY);
      }

      // Call original onClick
      if (onClick) {
        onClick(e);
      }
    };

    return (
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
            // Using the middle gray tone for the glow effect as per intention
            boxShadow: isGlowing
              ? `0 0 20px ${GRAY_TONES[4]}99, 0 0 40px ${GRAY_TONES[5]}66, 0 0 60px ${GRAY_TONES[6]}33`
              : undefined,
            transition: "box-shadow 0.15s ease-out",
            filter: isGlowing ? "brightness(1.2)" : undefined,
            zIndex: 1,
          } as React.CSSProperties
        }
        {...props}
      >
        {/* Bubble animations container - behind button */}
        <div className="absolute inset-0 pointer-events-none overflow-visible" style={{ zIndex: -1 }}>
          <AnimatePresence>
            {bubbles.map((bubble) => {
              // Generate 100 bubbles
              const particleBubbles = Array.from({ length: 100 }).map(() => {
                const angle = Math.random() * Math.PI * 2;
                const distance = 30 + Math.random() * 120;
                const size = 3 + Math.random() * 25;
                const color = GRAY_TONES[Math.floor(Math.random() * GRAY_TONES.length)];
                const duration = 2.5 + Math.random() * 1.2;

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
                          zIndex: -1,
                        }}
                        initial={{
                          opacity: 1,
                          scale: 1,
                          x: 0,
                          y: 0,
                        }}
                        animate={{
                          opacity: 0,
                          scale: 0.1,
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
                  })}
                </React.Fragment>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Button content */}
        <span style={{ position: 'relative', zIndex: 2 }}>
          {children}
        </span>
      </Button>
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
              const gray = Math.floor(Math.random() * 8);
              const duration = 0.5 + Math.random() * 1.2;

              return (
                <motion.div
                  key={`${bubble.id}-${i}`}
                  className="fixed rounded-full"
                  style={{
                    width: `${size}px`,
                    height: `${size}px`,
                    backgroundColor: GRAY_TONES[gray],
                    left: bubble.x,
                    top: bubble.y,
                    zIndex: 9998,
                    boxShadow: `0 0 ${size * 0.8}px ${GRAY_TONES[gray]}aa, 0 0 ${size * 1.5}px ${GRAY_TONES[gray]}55`,
                  }}
                  initial={{ opacity: 1, scale: 1, x: 0, y: 0 }}
                  animate={{
                    opacity: 0,
                    scale: 0.1,
                    x: Math.cos(angle) * distance,
                    y: Math.sin(angle) * distance,
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