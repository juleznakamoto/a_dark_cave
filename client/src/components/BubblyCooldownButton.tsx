
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
import { tailwindToHex } from "@/lib/tailwindColors";

interface BubblyCooldownButtonProps {
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
  button_id?: string;
  tooltip?: React.ReactNode;
  onMouseEnter?: (e?: React.MouseEvent<HTMLDivElement>) => void;
  onMouseLeave?: (e?: React.MouseEvent<HTMLDivElement>) => void;
  onAnimationTrigger?: (x: number, y: number) => void;
}

const TONES = [
  tailwindToHex("neutral-800"),
  tailwindToHex("neutral-900"),
  tailwindToHex("neutral-950/90"),
  tailwindToHex("neutral-950"),
  tailwindToHex("stone-800"),
  tailwindToHex("stone-900"),
  tailwindToHex("stone-950/90"),
  tailwindToHex("stone-950"),
];

const BubblyCooldownButton = forwardRef<HTMLButtonElement, BubblyCooldownButtonProps>(
  function BubblyCooldownButton(
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
      onAnimationTrigger,
      ...props
    },
    ref
  ) {
  const { cooldowns, cooldownDurations } = useGameStore();
  const isFirstRenderRef = useRef<boolean>(true);
  const mobileTooltip = useMobileButtonTooltip();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [isGlowing, setIsGlowing] = React.useState(false);

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

      // Trigger bubble animation
      const button = buttonRef.current;
      if (button && onAnimationTrigger) {
        const rect = button.getBoundingClientRect();
        onAnimationTrigger(
          rect.left + rect.width / 2,
          rect.top + rect.height / 2
        );
      }

      // Trigger glow effect for 1 second
      setIsGlowing(true);
      setTimeout(() => {
        setIsGlowing(false);
      }, 700);

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
      ref={(node) => {
        buttonRef.current = node;
        if (typeof ref === 'function') {
          ref(node);
        } else if (ref) {
          ref.current = node;
        }
      }}
      onClick={handleClick}
      disabled={isButtonDisabled}
      variant={variant}
      size={size}
      className={`relative overflow-hidden transition-all duration-200 select-none ${
        isCoolingDown ? "opacity-60 cursor-not-allowed" : ""
      } ${className}`}
      data-testid={testId}
      button_id={props.button_id || actionId}
      style={
        {
          boxShadow: isGlowing
            ? `0 0 15px ${TONES[2]}99, 0 0 30px ${TONES[3]}66, 0 0 40px ${TONES[4]}33`
            : undefined,
          transition: "box-shadow 0.15s ease-out",
          filter: isGlowing ? "brightness(1.2)" : undefined,
        } as React.CSSProperties
      }
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

  const tooltipId = buttonId;

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    props.onMouseEnter?.(e);
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    props.onMouseLeave?.(e);
  };

  return (
    <div
      className="relative inline-block"
      onClick={mobileTooltip.isMobile ? (e) => {
        if (actionExecutedRef.current) return;
        if (isButtonDisabled) {
          e.stopPropagation();
          mobileTooltip.handleWrapperClick(tooltipId, isButtonDisabled, isCoolingDown, e);
        }
      } : undefined}
      onMouseDown={mobileTooltip.isMobile ? (e) => {
        mobileTooltip.handleMouseDown(tooltipId, isButtonDisabled, isCoolingDown, e);
      } : undefined}
      onMouseUp={mobileTooltip.isMobile ? (e) => {
        if (actionExecutedRef.current) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        mobileTooltip.handleMouseUp(tooltipId, isButtonDisabled, onClick, e);
      } : undefined}
      onTouchStart={mobileTooltip.isMobile ? (e) => {
        mobileTooltip.handleTouchStart(tooltipId, isButtonDisabled, isCoolingDown, e);
      } : undefined}
      onTouchEnd={mobileTooltip.isMobile ? (e) => {
        if (actionExecutedRef.current) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        mobileTooltip.handleTouchEnd(tooltipId, isButtonDisabled, onClick, e);
      } : undefined}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <TooltipProvider>
        <Tooltip open={mobileTooltip.isMobile ? mobileTooltip.isTooltipOpen(tooltipId) : undefined} delayDuration={300}>
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

export default BubblyCooldownButton;
