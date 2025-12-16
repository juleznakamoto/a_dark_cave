
import React from "react";
import { CircularProgress } from "@/components/ui/circular-progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useMobileTooltip } from "@/hooks/useMobileTooltip";

interface StatusIndicatorProps {
  id: string;
  progress: number;
  color: string;
  icon: string;
  iconSize?: string;
  tooltipContent: React.ReactNode;
}

export function StatusIndicator({
  id,
  progress,
  color,
  icon,
  iconSize = "text-[12px]",
  tooltipContent,
}: StatusIndicatorProps) {
  const mobileTooltip = useMobileTooltip();

  return (
    <TooltipProvider>
      <Tooltip open={mobileTooltip.isTooltipOpen(id)}>
        <TooltipTrigger asChild>
          <div
            className="text-xs text-primary flex items-center gap-0.5 cursor-pointer"
            onClick={(e) => mobileTooltip.handleTooltipClick(id, e)}
          >
            <div className="relative inline-flex items-center gap-1 mt-[0px]">
              <CircularProgress
                value={progress}
                size={18}
                strokeWidth={2}
                className={color}
              />
              <span
                className={`absolute inset-0 flex items-center justify-center font-extrabold ${iconSize} -mt-[0px] ${color}`}
              >
                {icon}
              </span>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-xs whitespace-pre-line">{tooltipContent}</div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
