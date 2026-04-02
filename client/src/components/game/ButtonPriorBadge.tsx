import React, { useState } from "react";
import { useGameStore } from "@/game/state";
import { DISGRACED_PRIOR_UPGRADES } from "@/game/rules/skillUpgrades";
import {
  getPriorDiscFillMetrics,
  getPriorDiscInnerFillStyle,
  getPriorDiscSurfaceColors,
  PRIOR_DISC_OUTER_TRANSITION,
} from "@/lib/priorDiscStyles";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const BADGE_SIZE = 10;
const BADGE_SIZE_ASSIGNED = 8;
const badgeFillMetrics = getPriorDiscFillMetrics(BADGE_SIZE);

interface ButtonPriorBadgeProps {
  actionId: string;
}

export function ButtonPriorBadge({ actionId }: ButtonPriorBadgeProps) {
  const fellowship = useGameStore((s) => s.fellowship);
  const priorAssignedActions = useGameStore((s) => s.priorAssignedActions);
  const disgracedPriorSkills = useGameStore((s) => s.disgracedPriorSkills);
  const togglePriorAction = useGameStore((s) => s.togglePriorAction);
  const [hovered, setHovered] = useState(false);

  if (!fellowship?.disgraced_prior) return null;

  const level = disgracedPriorSkills?.level ?? 0;
  const maxActions = DISGRACED_PRIOR_UPGRADES[level]?.maxActions ?? 1;
  const isAssigned = priorAssignedActions?.includes(actionId) ?? false;
  const atCapacity =
    !isAssigned && (priorAssignedActions?.length ?? 0) >= maxActions;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!atCapacity || isAssigned) {
      togglePriorAction(actionId);
    }
  };

  const tooltipText = atCapacity
    ? "Upgrade Disgraced Prior to assign more actions"
    : isAssigned
      ? "Click to remove Disgraced Prior"
      : "Click to assign Disgraced Prior";

  const { background, boxShadow } = getPriorDiscSurfaceColors({
    active: isAssigned,
    surfaceLocked: atCapacity,
    hovered,
  });

  return (
    <TooltipProvider delayDuration={400}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            onClick={handleClick}
            onPointerDown={(e) => e.stopPropagation()}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            data-testid={`prior-badge-${actionId}`}
            style={{
              position: "absolute",
              bottom: isAssigned ? "-3px" : "-4px",
              right: isAssigned ? "-3px" : "-4px",
              width: isAssigned
                ? `${BADGE_SIZE_ASSIGNED}px`
                : `${BADGE_SIZE}px`,
              height: isAssigned
                ? `${BADGE_SIZE_ASSIGNED}px`
                : `${BADGE_SIZE}px`,
              borderRadius: "50%",
              background,
              boxShadow,
              overflow: "hidden",
              cursor: atCapacity ? "default" : "pointer",
              zIndex: 20,
              transition: PRIOR_DISC_OUTER_TRANSITION,
            }}
          >
            <div
              style={getPriorDiscInnerFillStyle({
                active: isAssigned,
                fillSize: badgeFillMetrics.fillSize,
                fillOffsetInPx: badgeFillMetrics.fillOffsetInPx,
                fillOffsetOutPx: badgeFillMetrics.fillOffsetOutPx,
              })}
            />
          </div>
        </TooltipTrigger>
        <TooltipContent
          side="right"
          className="max-w-xs bg-popover text-white border text-xs"
        >
          {tooltipText}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
