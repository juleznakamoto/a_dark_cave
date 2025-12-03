
"use client";

import * as React from "react";
import { useState, useRef, forwardRef } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ButtonProps } from "@/components/ui/button";

interface BubblyButtonProps extends ButtonProps {
  bubbleColor?: string;
}

const BubblyButton = forwardRef<HTMLButtonElement, BubblyButtonProps>(
  ({ className, onClick, children, bubbleColor = "#dc143c", ...props }, ref) => {
    const [isAnimating, setIsAnimating] = useState(false);
    const [isGlowing, setIsGlowing] = useState(false);

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      // Trigger bubble animation
      setIsAnimating(true);
      setTimeout(() => {
        setIsAnimating(false);
      }, 700);

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

    return (
      <Button
        ref={ref}
        onClick={handleClick}
        className={cn(
          "relative transition-all duration-100 ease-in overflow-visible bubbly-button",
          isGlowing && "shadow-[0_2px_25px_rgba(220,20,60,0.5)]",
          "active:scale-90",
          isGlowing && "active:shadow-[0_2px_25px_rgba(220,20,60,0.2)]",
          isAnimating && "animate",
          className
        )}
        style={
          {
            "--bubble-color": bubbleColor,
          } as React.CSSProperties
        }
        {...props}
      >
        {children}
      </Button>
    );
  }
);

BubblyButton.displayName = "BubblyButton";

export { BubblyButton };
