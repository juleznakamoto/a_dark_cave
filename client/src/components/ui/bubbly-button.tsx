
"use client";

import * as React from "react";
import { useState, useRef, forwardRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ButtonProps } from "@/components/ui/button";

interface BubblyButtonProps extends ButtonProps {
  bubbleColor?: string;
  bubbleColors?: string[];
  onBubbleAnimationStart?: () => void;
  persistBubblesOnUnmount?: boolean;
}

interface Bubble {
  id: string;
  x: number;
  y: number;
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

const BubblyButton = forwardRef<HTMLButtonElement, BubblyButtonProps>(
  ({ className, onClick, children, bubbleColor = "#8b7355", bubbleColors, onBubbleAnimationStart, persistBubblesOnUnmount = false, ...props }, ref) => {
    const [bubbles, setBubbles] = useState<Bubble[]>([]);
    const [persistedBubbles, setPersistedBubbles] = useState<Array<{ id: string; x: number; y: number }>>([]);
    const [isGlowing, setIsGlowing] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const bubbleIdCounter = useRef(0);

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      const button = buttonRef.current;
      if (!button) return;

      const rect = button.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const newBubble: Bubble = {
        id: `bubble-${bubbleIdCounter.current++}`,
        x,
        y,
      };

      setBubbles((prev) => [...prev, newBubble]);

      // If we need to persist bubbles after unmount, add to persisted state with global coordinates
      if (persistBubblesOnUnmount) {
        const globalX = e.clientX;
        const globalY = e.clientY;
        const persistedBubble = {
          id: newBubble.id,
          x: globalX,
          y: globalY,
        };
        setPersistedBubbles((prev) => [...prev, persistedBubble]);

        setTimeout(() => {
          setPersistedBubbles((prev) => prev.filter((b) => b.id !== persistedBubble.id));
        }, 2000);
      }

      // Remove bubble after animation completes
      setTimeout(() => {
        setBubbles((prev) => prev.filter((b) => b.id !== newBubble.id));
      }, 2000);

      // Trigger glow effect for 1 second
      setIsGlowing(true);
      setTimeout(() => {
        setIsGlowing(false);
      }, 1000);

      // Notify parent that animation started
      if (onBubbleAnimationStart) {
        onBubbleAnimationStart();
      }

      // Call original onClick
      if (onClick) {
        onClick(e);
      }
    };

    return (
      <>
        <Button
          ref={(node) => {
            buttonRef.current = node;
            if (typeof ref === "function") {
              ref(node);
            } else if (ref) {
              ref.current = node;
            }
          }}
          onClick={handleClick}
          className={cn(
            "relative transition-all duration-100 ease-in overflow-visible isolate",
            "active:scale-90",
            className
          )}
          style={
            {
              boxShadow: isGlowing
                ? `0 0 20px ${GRAY_TONES[4]}99, 0 0 40px ${GRAY_TONES[5]}66, 0 0 60px ${GRAY_TONES[6]}33`
                : undefined,
              transition: "box-shadow 0.15s ease-out",
              filter: isGlowing ? "brightness(1.2)" : undefined,
            } as React.CSSProperties
          }
          {...props}
        >
          {/* Bubble animations container - behind content */}
          <div className="absolute inset-0 pointer-events-none overflow-visible -z-10">
            <AnimatePresence>
              {bubbles.map((bubble) => {
                const bubbleCount = 80 + Math.floor(Math.random() * 41);
                const particleBubbles = Array.from({ length: bubbleCount }).map(() => {
                  const angle = Math.random() * Math.PI * 2;
                  const distance = 30 + Math.random() * 120;
                  const size = 3 + Math.random() * 25;
                  const color = GRAY_TONES[Math.floor(Math.random() * GRAY_TONES.length)];
                  const duration = 0.5 + Math.random() * 1.2;
                  const rotation = Math.random() * 360;

                  return { size, angle, distance, color, duration, rotation };
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
                            opacity: 1,
                            scale: 1,
                            rotate: 0,
                            x: 0,
                            y: 0,
                          }}
                          animate={{
                            opacity: 0,
                            scale: 0.1,
                            x: endX,
                            y: endY,
                            rotate: b.rotation,
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
          {children}
        </Button>

        {/* Persisted bubbles that remain after button unmounts */}
        {persistBubblesOnUnmount && persistedBubbles.length > 0 && (
          <div className="fixed inset-0 pointer-events-none z-[9998]">
            <AnimatePresence>
              {persistedBubbles.map((bubble) => (
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
        )}
      </>
    );
  }
);

BubblyButton.displayName = "BubblyButton";

export { BubblyButton };
