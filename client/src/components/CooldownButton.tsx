
import React, { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useGameStore } from "@/game/state";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CooldownButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  cooldownMs: number;
  disabled?: boolean;
  className?: string;
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link";
  size?: "default" | "sm" | "xs" | "lg" | "icon";
  "data-testid"?: string;
  tooltip?: React.ReactNode;
}

export default function CooldownButton({
  children,
  onClick,
  cooldownMs,
  disabled = false,
  className = "",
  variant = "default",
  size = "default",
  "data-testid": testId,
  tooltip,
  ...props
}: CooldownButtonProps) {
  const { cooldowns } = useGameStore();
  const initialCooldownRef = useRef<number>(0);
  const isFirstRenderRef = useRef<boolean>(true);
  const isMobile = useIsMobile();
  const [mobileOpenTooltip, setMobileOpenTooltip] = useState(false);
  const pressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [isPressing, setIsPressing] = useState(false);

  // Get the action ID from the test ID or generate one
  const actionId =
    testId
      ?.replace("button-", "")
      .replace(/-([a-z])/g, (_, letter) => letter.toUpperCase()) || "unknown";

  // Get current cooldown from game state
  const currentCooldown = cooldowns[actionId] || 0;
  const isCoolingDown = currentCooldown > 0;

  // Track the initial cooldown value when cooldown starts
  useEffect(() => {
    if (isCoolingDown && initialCooldownRef.current === 0) {
      // New cooldown started
      initialCooldownRef.current = currentCooldown;
      isFirstRenderRef.current = true;
      
      // Allow transition after initial render (next frame)
      requestAnimationFrame(() => {
        isFirstRenderRef.current = false;
      });
    } else if (!isCoolingDown) {
      // Cooldown finished, reset
      initialCooldownRef.current = 0;
      isFirstRenderRef.current = true;
    }
  }, [isCoolingDown, currentCooldown]);

  // Effect to handle click outside of tooltip on mobile
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mobileOpenTooltip && !event.target?.closest('[role="tooltip"]')) {
        setMobileOpenTooltip(false);
      }
    };

    if (isMobile && mobileOpenTooltip) {
      document.addEventListener("click", handleClickOutside, true);
    }

    return () => {
      document.removeEventListener("click", handleClickOutside, true);
    };
  }, [mobileOpenTooltip, isMobile]);

  // Calculate width percentage directly from remaining cooldown
  const overlayWidth =
    isCoolingDown && initialCooldownRef.current > 0
      ? (currentCooldown / initialCooldownRef.current) * 100
      : 0;

  const handleClick = (e: React.MouseEvent) => {
    if (isCoolingDown || disabled) return;
    onClick();
  };

  const handleWrapperClick = (e: React.MouseEvent) => {
    // On mobile with tooltip, handle inactive buttons specially
    if (isMobile && tooltip && disabled && !isCoolingDown) {
      e.stopPropagation();
      setMobileOpenTooltip(!mobileOpenTooltip);
      return;
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isMobile || !tooltip || isCoolingDown) return;
    
    // Don't use press-and-hold for inactive buttons
    if (disabled) return;
    
    e.preventDefault();
    setIsPressing(true);
    
    // Start timer to show tooltip after 300ms
    pressTimerRef.current = setTimeout(() => {
      setMobileOpenTooltip(true);
      setIsPressing(false);
    }, 300);
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!isMobile || !tooltip) return;
    
    // Don't use press-and-hold for inactive buttons
    if (disabled) return;
    
    // Clear the timer
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
    
    // If we were pressing and didn't show tooltip yet, execute the action
    if (isPressing && !mobileOpenTooltip) {
      setIsPressing(false);
      handleClick(e);
    } else {
      setIsPressing(false);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isMobile || !tooltip || isCoolingDown) return;
    
    // Don't use press-and-hold for inactive buttons
    if (disabled) return;
    
    setIsPressing(true);
    
    // Start timer to show tooltip after 300ms
    pressTimerRef.current = setTimeout(() => {
      setMobileOpenTooltip(true);
      setIsPressing(false);
    }, 300);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isMobile || !tooltip) return;
    
    // Don't use press-and-hold for inactive buttons
    if (disabled) return;
    
    // Clear the timer
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
    
    // If we were pressing and didn't show tooltip yet, execute the action
    if (isPressing && !mobileOpenTooltip) {
      setIsPressing(false);
      handleClick(e as any);
    } else {
      setIsPressing(false);
    }
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (pressTimerRef.current) {
        clearTimeout(pressTimerRef.current);
      }
    };
  }, []);

  const isButtonDisabled = disabled || isCoolingDown;

  const button = (
    <Button
      onClick={handleClick}
      onMouseDown={isMobile && tooltip ? handleMouseDown : undefined}
      onMouseUp={isMobile && tooltip ? handleMouseUp : undefined}
      onTouchStart={isMobile && tooltip ? handleTouchStart : undefined}
      onTouchEnd={isMobile && tooltip ? handleTouchEnd : undefined}
      disabled={isButtonDisabled}
      variant={variant}
      size={size}
      className={`relative overflow-hidden transition-all duration-200 select-none ${
        isCoolingDown ? "opacity-60 cursor-not-allowed" : ""
      } ${className}`}
      data-testid={testId}
      {...props}
    >
      {/* Button content */}
      <span className="relative z-10">{children}</span>

      {/* Cooldown progress overlay */}
      {isCoolingDown && (
        <div
          className="absolute inset-0 bg-white/15"
          style={{
            width: `${overlayWidth}%`,
            left: 0,
            transition: isFirstRenderRef.current ? "none" : "width 0.3s ease-out",
          }}
        />
      )}
    </Button>
  );

  // If no tooltip, return button without tooltip
  if (!tooltip) {
    return <div className="relative inline-block">{button}</div>;
  }

  return (
    <div className="relative inline-block" onClick={handleWrapperClick}>
      <TooltipProvider>
        <Tooltip open={isMobile ? mobileOpenTooltip : undefined}>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent>{tooltip}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
