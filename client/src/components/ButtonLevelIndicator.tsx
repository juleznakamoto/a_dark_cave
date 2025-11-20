import React from 'react';
import { useGameStore } from '@/game/state';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { ButtonLevelKey, getButtonLevel, getButtonLevelTooltip, getClicksForLevel } from '@/game/buttonLevels';
import { useMobileTooltip } from '@/hooks/useMobileTooltip';

interface ButtonLevelIndicatorProps {
  buttonKey: ButtonLevelKey;
  actionId: string;
}

export default function ButtonLevelIndicator({ buttonKey, actionId }: ButtonLevelIndicatorProps) {
  const state = useGameStore();
  const level = getButtonLevel(state, buttonKey);
  const mobileTooltip = useMobileTooltip();
  const tooltipId = `level-${actionId}`;

  if (level === 0) return null;

  const tooltipText = getButtonLevelTooltip(state, buttonKey);

  return (
    <TooltipProvider>
      <Tooltip open={mobileTooltip.isTooltipOpen(tooltipId)}>
        <TooltipTrigger asChild>
          <div
            className="absolute -top-1 -right-1 bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold shadow-md z-10 cursor-help"
            onClick={mobileTooltip.isMobile ? (e) => {
              e.stopPropagation();
              mobileTooltip.handleTooltipClick(tooltipId, e);
            } : undefined}
          >
            {level}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-xs whitespace-pre-line">
            {tooltipText}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}