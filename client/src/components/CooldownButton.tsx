
import React, { useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useGameStore } from "@/game/state";

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
  ...props
}: CooldownButtonProps) {
  const { cooldowns } = useGameStore();
  const initialCooldownRef = useRef<number>(0);
  const isFirstRenderRef = useRef<boolean>(true);

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

  const handleClick = () => {
    if (isCoolingDown || disabled) return;
    onClick();
  };

  const isButtonDisabled = disabled || isCoolingDown;

  return (
    <div className="relative inline-block">
      <Button
        onClick={handleClick}
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
              transition: isFirstRenderRef.current ? "none" : "width 0.2s ease-out",
            }}
          />
        )}
      </Button>
    </div>
  );
}
