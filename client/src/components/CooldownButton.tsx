import React, { useRef, useEffect, forwardRef } from "react";
import { Button } from "@/components/ui/button";
import { useGameStore } from "@/game/state";
import { useMobileButtonTooltip } from "@/hooks/useMobileTooltip";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ACTION_TO_UPGRADE_KEY, getButtonUpgradeInfo } from "@/game/buttonUpgrades";

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

const CooldownButton = forwardRef<HTMLButtonElement, CooldownButtonProps>(
  function CooldownButton(
    {
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
    },
    ref
  ) {
  const { cooldowns, cooldownDurations } = useGameStore();
  const isFirstRenderRef = useRef<boolean>(true);
  const mobileTooltip = useMobileButtonTooltip();

  // Get the action ID from the test ID or generate one
  const actionId =
    testId
      ?.replace("button-", "")
      .replace(/-([a-z])/g, (_, letter) => letter.toUpperCase()) || "unknown";

  // Get current cooldown from game state
  const currentCooldown = cooldowns[actionId] || 0;
  const initialCooldown = cooldownDurations[actionId] || 0;
  const isCoolingDown = currentCooldown > 0;

  // Track first render for transition
  useEffect(() => {
    if (isCoolingDown) {
      isFirstRenderRef.current = true;
      // Allow transition after initial render (next frame)
      requestAnimationFrame(() => {
        isFirstRenderRef.current = false;
      });
    } else {
      isFirstRenderRef.current = true;
    }
  }, [isCoolingDown]);

  // Calculate width percentage directly from remaining cooldown
  const overlayWidth =
    isCoolingDown && initialCooldown > 0
      ? (currentCooldown / initialCooldown) * 100
      : 0;

  const actionExecutedRef = useRef<boolean>(false);

  const handleClick = (e: React.MouseEvent) => {
    if (disabled && !isCoolingDown) return;
    if (!isCoolingDown) {
      actionExecutedRef.current = true;
      onClick();
      // Reset the flag after a short delay
      setTimeout(() => {
        actionExecutedRef.current = false;
      }, 100);
    }
  };

  const isButtonDisabled = disabled || isCoolingDown;

  const buttonId = testId || `button-${Math.random()}`;

  // Get upgrade level for this button
  const state = useGameStore();
  const upgradeKey = ACTION_TO_UPGRADE_KEY[actionId];
  const upgradeLevel = upgradeKey ? getButtonUpgradeInfo(upgradeKey, state.buttonUpgrades[upgradeKey]).level : 0;

  const button = (
    <Button
      ref={ref}
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
      <span className="relative">{children}</span>

      {/* Level indicator */}
      {upgradeLevel > 0 && (
        <span className="absolute top-0 right-0 -mt-1 -mr-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
          {upgradeLevel}
        </span>
      )}

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

  // Check for level up
  useEffect(() => {
    if (actionId && isUpgradableAction(actionId)) {
      const currentClicks = gameState.buttonUpgrades[actionId as keyof typeof gameState.buttonUpgrades] || 0;
      const levelUpInfo = checkLevelUp(actionId as any, currentClicks - 1, currentClicks);

      if (levelUpInfo?.leveledUp) {
        // Show level up notification
        setShowLevelUp(true);
        setLevelUpInfo(levelUpInfo);

        // Hide after 3 seconds
        setTimeout(() => {
          setShowLevelUp(false);
        }, 3000);
      }
    }
  }, [actionId, gameState.buttonUpgrades]);

  // Get current upgrade info for badge display
  const upgradeInfo = actionId && isUpgradableAction(actionId)
    ? getButtonUpgradeInfo(
        actionId as keyof typeof gameState.buttonUpgrades,
        gameState.buttonUpgrades[actionId as keyof typeof gameState.buttonUpgrades] || 0
      )
    : null;

  return (
    <TooltipProvider>
      <Tooltip open={mobileTooltip.isMobile ? mobileTooltip.isTooltipOpen(buttonId) : undefined} delayDuration={300}>
        <TooltipTrigger asChild>
          <div className="relative inline-block">
            {/* Upgrade Level Badge */}
            {upgradeInfo && upgradeInfo.level > 0 && (
              <div className="absolute -top-1.5 -right-1.5 z-10 flex items-center justify-center w-5 h-5 text-[10px] font-bold text-white bg-blue-600 border-2 border-background rounded-full">
                {upgradeInfo.level}
              </div>
            )}
            <Button
              ref={ref}
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
              <span className="relative">{children}</span>

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
          </div>
        </TooltipTrigger>
        <TooltipContent>{tooltip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
});

export default CooldownButton;