import React from "react";
import { Button } from "@/components/ui/button";
import { useCooldown } from "@/hooks/useCooldown";
import { type VariantProps } from "class-variance-authority";
import { buttonVariants } from "@/components/ui/button";
import { useGameState } from "@/game/state";

type ButtonVariant = VariantProps<typeof buttonVariants>["variant"];
type ButtonSize = VariantProps<typeof buttonVariants>["size"];

interface CooldownButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  actionId: string;
  cooldownDuration: number;
  variant?: ButtonVariant;
  size?: ButtonSize;
  showVisualCooldown?: boolean;
  testId?: string;
}

export function CooldownButton({
  actionId,
  cooldownDuration,
  variant = "default",
  size = "default",
  showVisualCooldown = true,
  className = "",
  children,
  disabled,
  onClick,
  testId,
  ...props
}: CooldownButtonProps) {
  const { state } = useGameState();
  const { isOnCooldown, progress, startCooldown } = useCooldown(
    actionId,
    cooldownDuration
  );

  const isButtonDisabled = disabled || isOnCooldown;
  const showCooldownVisual = showVisualCooldown && isOnCooldown;

  // Use rainbow variant if odd_bracelet relic is owned, otherwise use provided variant
  const effectiveVariant = state.relics.odd_bracelet ? "rainbow" : variant;

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!isButtonDisabled && onClick) {
      startCooldown();
      onClick(e);
    }
  };

  return (
    <div className="relative inline-block">
      <Button
        onClick={handleClick}
        disabled={isButtonDisabled}
        variant={effectiveVariant}
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