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
import { getActionCostBreakdown } from "@/game/rules";

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

// Helper function to extract resource IDs from action costs using existing game rules
const extractResourcesFromAction = (actionId: string, state: any): string[] => {
  const costBreakdown = getActionCostBreakdown(actionId, state);
  const resources: string[] = [];

  // Extract resource names from the cost breakdown text
  // The text format is like "-5 Wood", "-10 Stone", etc.
  costBreakdown.forEach(({ text }) => {
    const match = text.match(/-\d+\s+(.+)/);
    if (match) {
      const resourceName = match[1];
      // Convert "Bone Totem" back to "bone_totem" for state key
      const resourceKey = resourceName.toLowerCase().replace(/\s+/g, '_');
      resources.push(resourceKey);
    }
  });

  return [...new Set(resources)]; // Remove duplicates
};

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
  const { cooldowns, cooldownDurations, setHoveredResourceCosts, gameState } = useGameStore();
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

  // Extract resources from action definition
  const hoveredResources = extractResourcesFromAction(actionId, gameState);


  const handleMouseEnter = () => {
    if (hoveredResources.length > 0) {
      setHoveredResourceCosts(hoveredResources);
    }
  };

  const handleMouseLeave = () => {
    setHoveredResourceCosts([]);
  };

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
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
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
  );

  // If no tooltip, return button without tooltip
  if (!tooltip) {
    return <div className="relative inline-block">{button}</div>;
  }

  return (
    <div
      className="relative inline-block"
      onClick={mobileTooltip.isMobile ? (e) => {
        // Don't show tooltip if action was just executed
        if (actionExecutedRef.current) return;

        // Only show tooltip if button is disabled
        if (isButtonDisabled) {
          e.stopPropagation();
          mobileTooltip.handleWrapperClick(buttonId, isButtonDisabled, isCoolingDown, e);
        }
      } : undefined}
      onMouseDown={mobileTooltip.isMobile ? (e) => {
        // Start hold timer for tooltip (will show for both active and inactive buttons if held)
        mobileTooltip.handleMouseDown(buttonId, isButtonDisabled, isCoolingDown, e);
      } : undefined}
      onMouseUp={mobileTooltip.isMobile ? (e) => {
        // Don't show tooltip if action was just executed
        if (actionExecutedRef.current) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }

        mobileTooltip.handleMouseUp(buttonId, isButtonDisabled, onClick, e);
      } : undefined}
      onTouchStart={mobileTooltip.isMobile ? (e) => {
        // Start hold timer for tooltip (will show for both active and inactive buttons if held)
        mobileTooltip.handleTouchStart(buttonId, isButtonDisabled, isCoolingDown, e);
      } : undefined}
      onTouchEnd={mobileTooltip.isMobile ? (e) => {
        // Don't show tooltip if action was just executed
        if (actionExecutedRef.current) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }

        mobileTooltip.handleTouchEnd(buttonId, isButtonDisabled, onClick, e);
      } : undefined}
    >
      <TooltipProvider>
        <Tooltip open={mobileTooltip.isMobile ? mobileTooltip.isTooltipOpen(buttonId) : undefined} delayDuration={300}>
          <TooltipTrigger asChild>
            <span className="inline-block">
              {button}
            </span>
          </TooltipTrigger>
          <TooltipContent>{tooltip}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
});

export default CooldownButton;