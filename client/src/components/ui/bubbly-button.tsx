
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
  approach?: 1 | 2 | 3 | 4 | 5;
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
  ({ className, onClick, children, bubbleColor = "#8b7355", bubbleColors, onAnimationTrigger, approach = 1, ...props }, ref) => {
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

      setTimeout(() => {
        setBubbles((prev) => prev.filter((b) => b.id !== newBubble.id));
      }, 2500);

      setIsGlowing(true);
      setTimeout(() => {
        setIsGlowing(false);
      }, 700);
    };

    useImperativeHandle(ref, () => ({
      triggerAnimation,
    }));

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      const button = buttonRef.current;
      if (!button) return;

      const rect = button.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      triggerAnimation(centerX, centerY);

      if (onAnimationTrigger) {
        onAnimationTrigger(e.clientX, e.clientY);
      }

      if (onClick) {
        onClick(e);
      }
    };

    // Approach 1: Negative z-index on animation container
    if (approach === 1) {
      return (
        <div className="relative inline-block">
          <div className="absolute inset-0 pointer-events-none" style={{ zIndex: -1 }}>
            <AnimatePresence>
              {bubbles.map((bubble) => {
                const particleBubbles = Array.from({ length: 100 }).map(() => {
                  const angle = Math.random() * Math.PI * 2;
                  const distance = 30 + Math.random() * 70;
                  const size = 2 + Math.random() * 20;
                  const color = NEUTRAL_TONES[Math.floor(Math.random() * NEUTRAL_TONES.length)];
                  const duration = 2.0 + Math.random() * 1.0;
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
                          initial={{ opacity: 0.8, scale: 1, x: 0, y: 0 }}
                          animate={{ opacity: 0, scale: 0.1, x: endX, y: endY }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: b.duration, ease: [0.16, 1, 0.3, 1] }}
                        />
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </AnimatePresence>
          </div>
          <Button
            ref={buttonRef}
            onClick={handleClick}
            className={cn("relative transition-all duration-100 ease-in active:scale-90", className)}
            style={{
              boxShadow: isGlowing ? `0 0 15px ${NEUTRAL_TONES[2]}99, 0 0 30px ${NEUTRAL_TONES[3]}66` : undefined,
              transition: "box-shadow 0.15s ease-out",
              filter: isGlowing ? "brightness(1.2)" : undefined,
              zIndex: 1,
            }}
            {...props}
          >
            {children}
          </Button>
        </div>
      );
    }

    // Approach 2: Transform translateZ to create stacking context
    if (approach === 2) {
      return (
        <div className="relative inline-block" style={{ transformStyle: 'preserve-3d' }}>
          <div className="absolute inset-0 pointer-events-none" style={{ transform: 'translateZ(-1px)' }}>
            <AnimatePresence>
              {bubbles.map((bubble) => {
                const particleBubbles = Array.from({ length: 100 }).map(() => {
                  const angle = Math.random() * Math.PI * 2;
                  const distance = 30 + Math.random() * 70;
                  const size = 2 + Math.random() * 20;
                  const color = NEUTRAL_TONES[Math.floor(Math.random() * NEUTRAL_TONES.length)];
                  const duration = 2.0 + Math.random() * 1.0;
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
                          initial={{ opacity: 0.8, scale: 1, x: 0, y: 0 }}
                          animate={{ opacity: 0, scale: 0.1, x: endX, y: endY }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: b.duration, ease: [0.16, 1, 0.3, 1] }}
                        />
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </AnimatePresence>
          </div>
          <Button
            ref={buttonRef}
            onClick={handleClick}
            className={cn("relative transition-all duration-100 ease-in active:scale-90", className)}
            style={{
              boxShadow: isGlowing ? `0 0 15px ${NEUTRAL_TONES[2]}99, 0 0 30px ${NEUTRAL_TONES[3]}66` : undefined,
              transition: "box-shadow 0.15s ease-out",
              filter: isGlowing ? "brightness(1.2)" : undefined,
              transform: 'translateZ(0)',
            }}
            {...props}
          >
            {children}
          </Button>
        </div>
      );
    }

    // Approach 3: Isolation with CSS isolation property
    if (approach === 3) {
      return (
        <div className="relative inline-block" style={{ isolation: 'isolate' }}>
          <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 0 }}>
            <AnimatePresence>
              {bubbles.map((bubble) => {
                const particleBubbles = Array.from({ length: 100 }).map(() => {
                  const angle = Math.random() * Math.PI * 2;
                  const distance = 30 + Math.random() * 70;
                  const size = 2 + Math.random() * 20;
                  const color = NEUTRAL_TONES[Math.floor(Math.random() * NEUTRAL_TONES.length)];
                  const duration = 2.0 + Math.random() * 1.0;
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
                          initial={{ opacity: 0.8, scale: 1, x: 0, y: 0 }}
                          animate={{ opacity: 0, scale: 0.1, x: endX, y: endY }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: b.duration, ease: [0.16, 1, 0.3, 1] }}
                        />
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </AnimatePresence>
          </div>
          <Button
            ref={buttonRef}
            onClick={handleClick}
            className={cn("relative transition-all duration-100 ease-in active:scale-90", className)}
            style={{
              boxShadow: isGlowing ? `0 0 15px ${NEUTRAL_TONES[2]}99, 0 0 30px ${NEUTRAL_TONES[3]}66` : undefined,
              transition: "box-shadow 0.15s ease-out",
              filter: isGlowing ? "brightness(1.2)" : undefined,
              zIndex: 1,
            }}
            {...props}
          >
            {children}
          </Button>
        </div>
      );
    }

    // Approach 4: Pseudo-element with ::before
    if (approach === 4) {
      return (
        <div className="relative inline-block">
          <Button
            ref={buttonRef}
            onClick={handleClick}
            className={cn("relative transition-all duration-100 ease-in active:scale-90", className)}
            style={{
              boxShadow: isGlowing ? `0 0 15px ${NEUTRAL_TONES[2]}99, 0 0 30px ${NEUTRAL_TONES[3]}66` : undefined,
              transition: "box-shadow 0.15s ease-out",
              filter: isGlowing ? "brightness(1.2)" : undefined,
            }}
            {...props}
          >
            <span className="relative z-10">{children}</span>
            <div className="absolute inset-0 pointer-events-none overflow-visible" style={{ zIndex: -1 }}>
              <AnimatePresence>
                {bubbles.map((bubble) => {
                  const particleBubbles = Array.from({ length: 100 }).map(() => {
                    const angle = Math.random() * Math.PI * 2;
                    const distance = 30 + Math.random() * 70;
                    const size = 2 + Math.random() * 20;
                    const color = NEUTRAL_TONES[Math.floor(Math.random() * NEUTRAL_TONES.length)];
                    const duration = 2.0 + Math.random() * 1.0;
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
                            initial={{ opacity: 0.8, scale: 1, x: 0, y: 0 }}
                            animate={{ opacity: 0, scale: 0.1, x: endX, y: endY }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: b.duration, ease: [0.16, 1, 0.3, 1] }}
                          />
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </AnimatePresence>
            </div>
          </Button>
        </div>
      );
    }

    // Approach 5: Double wrapper with explicit stacking
    return (
      <div className="relative inline-block">
        <div className="relative" style={{ zIndex: 2 }}>
          <Button
            ref={buttonRef}
            onClick={handleClick}
            className={cn("transition-all duration-100 ease-in active:scale-90", className)}
            style={{
              boxShadow: isGlowing ? `0 0 15px ${NEUTRAL_TONES[2]}99, 0 0 30px ${NEUTRAL_TONES[3]}66` : undefined,
              transition: "box-shadow 0.15s ease-out",
              filter: isGlowing ? "brightness(1.2)" : undefined,
            }}
            {...props}
          >
            {children}
          </Button>
        </div>
        <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 1 }}>
          <AnimatePresence>
            {bubbles.map((bubble) => {
              const particleBubbles = Array.from({ length: 100 }).map(() => {
                const angle = Math.random() * Math.PI * 2;
                const distance = 30 + Math.random() * 70;
                const size = 2 + Math.random() * 20;
                const color = NEUTRAL_TONES[Math.floor(Math.random() * NEUTRAL_TONES.length)];
                const duration = 2.0 + Math.random() * 1.0;
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
                        initial={{ opacity: 0.8, scale: 1, x: 0, y: 0 }}
                        animate={{ opacity: 0, scale: 0.1, x: endX, y: endY }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: b.duration, ease: [0.16, 1, 0.3, 1] }}
                      />
                    );
                  })}
                </React.Fragment>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    );
  }
);

BubblyButton.displayName = "BubblyButton";

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
              const gray = Math.floor(Math.random() * 4);
              const duration = 0.5 + Math.random() * 1.2;

              return (
                <motion.div
                  key={`${bubble.id}-${i}`}
                  className="fixed rounded-full"
                  style={{
                    width: `${size}px`,
                    height: `${size}px`,
                    backgroundColor: NEUTRAL_TONES[gray],
                    left: bubble.x,
                    top: bubble.y,
                    zIndex: 9998,
                    boxShadow: `0 0 ${size * 0.8}px ${NEUTRAL_TONES[gray]}aa, 0 0 ${size * 1.5}px ${NEUTRAL_TONES[gray]}55`,
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
