
"use client";

import * as React from "react";
import { useState, useRef, useEffect, forwardRef } from "react";
import ReactDOM from "react-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ButtonProps } from "@/components/ui/button";

interface BubblyButtonProps extends ButtonProps {
  bubbleColor?: string;
  bubbleColors?: string[]; // Array of colors for varied bubbles
}

interface Bubble {
  id: string;
  startX: number;
  startY: number;
  color: string;
  isTop: boolean;
}

// Bubble animation component rendered via portal
function BubbleAnimation({ bubble, colors }: { bubble: Bubble; colors: string[] }) {
  const bubbles = [
    { size: 10, angle: Math.random() * Math.PI * 2, distance: 50 + Math.random() * 30, color: colors[Math.floor(Math.random() * colors.length)] },
    { size: 20, angle: Math.random() * Math.PI * 2, distance: 40 + Math.random() * 40, color: colors[Math.floor(Math.random() * colors.length)] },
    { size: 15, angle: Math.random() * Math.PI * 2, distance: 60 + Math.random() * 20, color: colors[Math.floor(Math.random() * colors.length)] },
    { size: 20, angle: Math.random() * Math.PI * 2, distance: 45 + Math.random() * 35, color: colors[Math.floor(Math.random() * colors.length)] },
    { size: 18, angle: Math.random() * Math.PI * 2, distance: 55 + Math.random() * 25, color: colors[Math.floor(Math.random() * colors.length)] },
    { size: 10, angle: Math.random() * Math.PI * 2, distance: 50 + Math.random() * 30, color: colors[Math.floor(Math.random() * colors.length)] },
    { size: 15, angle: Math.random() * Math.PI * 2, distance: 60 + Math.random() * 20, color: colors[Math.floor(Math.random() * colors.length)] },
    { size: 10, angle: Math.random() * Math.PI * 2, distance: 50 + Math.random() * 30, color: colors[Math.floor(Math.random() * colors.length)] },
    { size: 18, angle: Math.random() * Math.PI * 2, distance: 55 + Math.random() * 25, color: colors[Math.floor(Math.random() * colors.length)] },
  ];

  return (
    <>
      {bubbles.map((b, index) => {
        const endX = bubble.startX + Math.cos(b.angle) * b.distance;
        const endY = bubble.isTop
          ? bubble.startY - Math.abs(Math.sin(b.angle) * b.distance)
          : bubble.startY + Math.abs(Math.sin(b.angle) * b.distance);

        return (
          <motion.div
            key={`${bubble.id}-${index}`}
            className="fixed rounded-full"
            style={{
              width: `${b.size}px`,
              height: `${b.size}px`,
              backgroundColor: b.color,
              left: bubble.startX,
              top: bubble.startY,
              zIndex: 9999,
              pointerEvents: "none",
            }}
            initial={{
              opacity: 1,
              scale: 1,
            }}
            animate={{
              opacity: 0,
              scale: 0.1,
              x: endX - bubble.startX,
              y: endY - bubble.startY,
            }}
            transition={{
              duration: 1.75,
              ease: "easeOut",
            }}
          />
        );
      })}
    </>
  );
}

const BubblyButton = forwardRef<HTMLButtonElement, BubblyButtonProps>(
  ({ className, onClick, children, bubbleColor = "#8b7355", bubbleColors, ...props }, ref) => {
    const [bubbles, setBubbles] = useState<Bubble[]>([]);
    const [isGlowing, setIsGlowing] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const bubbleIdCounter = useRef(0);
    
    // Use provided colors or fall back to single color variations
    const colors = bubbleColors || [
      bubbleColor,
      bubbleColor + "dd", // slightly transparent
      bubbleColor + "bb",
    ];

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      const button = buttonRef.current;
      if (!button) return;

      const rect = button.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      // Create bubble animations
      const newBubbles: Bubble[] = [
        {
          id: `bubble-top-${bubbleIdCounter.current++}`,
          startX: centerX,
          startY: centerY,
          color: bubbleColor,
          isTop: true,
        },
        {
          id: `bubble-bottom-${bubbleIdCounter.current++}`,
          startX: centerX,
          startY: centerY,
          color: bubbleColor,
          isTop: false,
        },
      ];

      setBubbles((prev) => [...prev, ...newBubbles]);

      // Remove bubbles after animation completes
      setTimeout(() => {
        setBubbles((prev) =>
          prev.filter((b) => !newBubbles.find((nb) => nb.id === b.id))
        );
      }, 800);

      // Trigger glow effect for 1 second
      setIsGlowing(true);
      setTimeout(() => {
        setIsGlowing(false);
      }, 1000);

      // Call original onClick
      if (onClick) {
        onClick(e);
      }
    };

    // Note: We don't clean up bubbles on unmount because:
    // 1. They're rendered via portal to document.body (not in this component's tree)
    // 2. They have their own timeout-based cleanup that removes them after animation
    // 3. This allows animations to complete even when the button is removed from DOM

    return (
      <>
        {/* Render bubbles via portal to document.body */}
        {typeof document !== "undefined" &&
          bubbles.map((bubble) =>
            ReactDOM.createPortal(
              <BubbleAnimation key={bubble.id} bubble={bubble} colors={colors} />,
              document.body
            )
          )}

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
            "relative transition-all duration-100 ease-in overflow-visible",
            "active:scale-90",
            className
          )}
          style={
            {
              "--bubble-color": bubbleColor,
              boxShadow: isGlowing 
                ? `0 0 15px ${bubbleColor}80, 0 0 30px ${bubbleColor}40` 
                : undefined,
              transition: "box-shadow 0.1s ease-in-out",
            } as React.CSSProperties
          }
          {...props}
        >
          {children}
        </Button>
      </>
    );
  }
);

BubblyButton.displayName = "BubblyButton";

export { BubblyButton };
