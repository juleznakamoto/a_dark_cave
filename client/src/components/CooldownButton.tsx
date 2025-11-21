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
import { gameActions } from "@/game/actions";

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

// Helper function to extract resource IDs from action costs
const extractResourcesFromAction = (actionId: string): string[] => {
  const action = gameActions[actionId];
  if (!action?.cost) return [];

  const resources: string[] = [];

  // Handle action costs - extract resource keys
  const processCosts = (costs: any) => {
    if (!costs || typeof costs !== 'object') return;

    for (const [path, _value] of Object.entries(costs)) {
      if (path.startsWith('resources.')) {
        const resourceId = path.split('.')[1];
        resources.push(resourceId);
      }
    }
  };

  // Check if costs are tiered (numbered keys)
  const costKeys = Object.keys(action.cost);
  const hasTieredCost = costKeys.length > 0 && costKeys.every(key => !isNaN(Number(key)));

  if (hasTieredCost) {
    // Process all tiers
    costKeys.forEach(tierKey => {
      processCosts(action.cost[tierKey]);
    });
  } else {
    // Process direct costs
    processCosts(action.cost);
  }

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
  const { cooldowns, cooldownDurations } = useGameStore();
  const setHoveredResourceCosts = useGameStore((state) => state.setHoveredResourceCosts);
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

  // Extract resources from action definition
  const hoveredResources = extractResourcesFromAction(actionId);

  // Update store when hovering over button with resources
  useEffect(() => {
    if (hoveredResources.length > 0) {
      setHoveredResourceCosts(hoveredResources);
    } else {
      setHoveredResourceCosts([]);
    }

    // Cleanup function to clear hovered costs when component unmounts or resources change
    return () => {
      setHoveredResourceCosts([]);
    };
  }, [hoveredResources, setHoveredResourceCosts]);

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