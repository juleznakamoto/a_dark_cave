import React from "react";
import { Button } from "@/components/ui/button";
import { RainbowButton } from "@/components/ui/rainbow-button";
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
  const { cooldowns, state } = useGameStore();
  const hasOddBracelet = state.relics?.odd_bracelet || false;

  // Get the action ID from the test ID or generate one
  const actionId =
    testId
      ?.replace("button-", "")
      .replace(/-([a-z])/g, (_, letter) => letter.toUpperCase()) || "unknown";

  // Get current cooldown from game state
  const currentCooldown = cooldowns[actionId] || 0;
  const isCoolingDown = currentCooldown > 0;
  const progress = isCoolingDown
    ? 1 - currentCooldown / (cooldownMs / 1000)
    : 1;

  const handleClick = () => {
    if (isCoolingDown || disabled) return;

    // Execute the action - action handler will set cooldown with dev mode adjustments
    onClick();
  };

  const isButtonDisabled = disabled || isCoolingDown;
  const showCooldownVisual = isCoolingDown;

  const buttonContent = (
    <>
      {/* Button content */}
      <span className="relative z-10">{children}</span>

      {/* Cooldown progress overlay */}
      {showCooldownVisual && (
        <div
          className="absolute inset-0 bg-white/15 transition-all duration-200 ease-linear"
          style={{
            width: `${(1 - progress) * 100}%`,
            left: 0,
            right: "auto",
          }}
        />
      )}
    </>
  );

  return (
    <div className="relative inline-block">
      {hasOddBracelet ? (
        <RainbowButton
          onClick={handleClick}
          disabled={isButtonDisabled}
          className={`relative overflow-hidden transition-all duration-200 select-none ${
            showCooldownVisual ? "opacity-60 cursor-not-allowed" : ""
          } ${className}`}
          data-testid={testId}
          {...props}
        >
          {buttonContent}
        </RainbowButton>
      ) : (
        <Button
          onClick={handleClick}
          disabled={isButtonDisabled}
          variant={variant}
          size={size}
          className={`relative overflow-hidden transition-all duration-200 select-none ${
            showCooldownVisual ? "opacity-60 cursor-not-allowed" : ""
          } ${className}`}
          data-testid={testId}
          {...props}
        >
          {buttonContent}
        </Button>
      )}
    </div>
  );
}
