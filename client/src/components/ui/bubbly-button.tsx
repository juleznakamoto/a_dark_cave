
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

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      // Trigger animation
      setIsAnimating(true);
      setTimeout(() => {
        setIsAnimating(false);
      }, 700);

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
          "relative transition-all duration-100 ease-in overflow-visible",
          "shadow-[0_2px_25px_rgba(220,20,60,0.5)]",
          "active:scale-90 active:shadow-[0_2px_25px_rgba(220,20,60,0.2)]",
          "before:absolute before:content-[''] before:block before:w-[140%] before:h-full before:left-[-20%] before:-z-10",
          "before:transition-all before:duration-500 before:ease-in-out before:bg-no-repeat",
          "after:absolute after:content-[''] after:block after:w-[140%] after:h-full after:left-[-20%] after:-z-10",
          "after:transition-all after:duration-500 after:ease-in-out after:bg-no-repeat",
          isAnimating && "before:block before:animate-bubbly-top",
          isAnimating && "after:block after:animate-bubbly-bottom",
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
