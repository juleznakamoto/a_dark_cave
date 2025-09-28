import React from "react";
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
  size?: "default" | "sm" | "lg" | "icon";
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
  const { devMode, cooldowns, setCooldown, stats } = useGameStore();

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

    // Execute the action immediately
    onClick();

    // Calculate cooldown with knowledge reduction for trade actions
    let finalCooldownMs = cooldownMs;
    if (actionId.startsWith('trade') && actionId.includes('ForGold') || actionId === 'tradeGoldForSilver') {
      const knowledge = stats?.knowledge || 0;
      const reductionSeconds = Math.min(0.5 * knowledge, 15);
      const baseCooldownSeconds = 30;
      const finalCooldownSeconds = Math.max(baseCooldownSeconds - reductionSeconds, 0);
      finalCooldownMs = finalCooldownSeconds * 1000;
    }

    // Start the cooldown in game state (skip in dev mode)
    if (!devMode) {
      setCooldown(actionId, finalCooldownMs / 1000); // Convert to seconds
    }
  };

  const isButtonDisabled = disabled || (isCoolingDown && !devMode);
  const showCooldownVisual = isCoolingDown && !devMode;

  return (
    <div className="relative inline-block">
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
      </Button>
    </div>
  );
}
