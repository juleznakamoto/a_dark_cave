import React, { useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useGameStore } from "@/game/state";
import { useMobileButtonTooltip } from "@/hooks/useMobileTooltip";
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
  const mobileTooltip = useMobileButtonTooltip();

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

  // Calculate width percentage directly from remaining cooldown
  const overlayWidth =
    isCoolingDown && initialCooldownRef.current > 0
      ? (currentCooldown / initialCooldownRef.current) * 100
      : 0;

  const handleClick = (e: React.MouseEvent) => {
    // Prevent default click behavior on mobile - we handle it in mouseup/touchend
    if (mobileTooltip.isMobile && tooltip) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    if (isCoolingDown || disabled) return;
    onClick();
  };

  const isButtonDisabled = disabled || isCoolingDown;

  const buttonId = testId || `button-${Math.random()}`;

  const button = (
    <Button
      onClick={handleClick}
      onMouseDown={mobileTooltip.isMobile && tooltip ? (e) => mobileTooltip.handleMouseDown(buttonId, disabled, isCoolingDown, e) : undefined}
      onMouseUp={mobileTooltip.isMobile && tooltip ? (e) => mobileTooltip.handleMouseUp(buttonId, disabled, onClick, e) : undefined}
      onTouchStart={mobileTooltip.isMobile && tooltip ? (e) => mobileTooltip.handleTouchStart(buttonId, disabled, isCoolingDown, e) : undefined}
      onTouchEnd={mobileTooltip.isMobile && tooltip ? (e) => mobileTooltip.handleTouchEnd(buttonId, disabled, onClick, e) : undefined}
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
    <div
      className="relative inline-block"
      onClick={(e) => mobileTooltip.handleWrapperClick(buttonId, disabled, isCoolingDown, e)}
    >
      <TooltipProvider>
        <Tooltip open={mobileTooltip.isTooltipOpen(buttonId)}>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent>{tooltip}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}