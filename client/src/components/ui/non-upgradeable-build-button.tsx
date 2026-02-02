import React, { useState } from "react";
import { BubblyButton } from "./bubbly-button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./tooltip";
import { useMobileTooltip } from "@/hooks/useMobileTooltip";

interface NonUpgradeableBuildButtonProps {
  actionId: string;
  label: string;
  onExecute: () => void;
  disabled: boolean;
  tooltipContent: Array<{ text: string; satisfied: boolean }>;
  onAnimationTrigger?: (x: number, y: number) => void;
}

export default function NonUpgradeableBuildButton({
  actionId,
  label,
  onExecute,
  disabled,
  tooltipContent,
  onAnimationTrigger,
}: NonUpgradeableBuildButtonProps) {
  const [show, setShow] = useState(true);
  const mobileTooltip = useMobileTooltip();

  const handleClick = () => {
    // Execute the action
    onExecute();
    // Hide the button (represents completed build)
    setShow(false);
    // Animation persists via global portal
  };

  const tooltipContentElement = (
    <div className="text-xs whitespace-nowrap">
      {tooltipContent.map((cost, index) => (
        <div
          key={index}
          className={cost.satisfied ? "text-foreground" : "text-muted-foreground"}
        >
          {cost.text}
        </div>
      ))}
    </div>
  );

  return (
    <div className="relative">
      <div className="relative z-10">
        {show ? (
          <TooltipProvider>
            <Tooltip
              open={mobileTooltip.isTooltipOpen(actionId)}
            >
              <TooltipTrigger asChild>
                <div>
                  <BubblyButton
                    variant="outline"
                    onClick={handleClick}
                    onAnimationTrigger={onAnimationTrigger}
                    disabled={disabled}
                    className="bg-stone-800 hover:bg-stone-700 border-stone-600"
                    button_id={actionId}
                  >
                    {label}
                  </BubblyButton>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                {tooltipContentElement}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <div className="h-10 flex items-center justify-center text-green-600 text-xs font-medium">
            ✓ Built!
          </div>
        )}
      </div>

      {/* Note: BubblyButtonGlobalPortal should be rendered at a higher level in the component tree
          to handle all bubbles globally. This component triggers animation via onAnimationTrigger prop. */}
    </div>
  );
}