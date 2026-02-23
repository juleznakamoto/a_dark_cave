import React, { useState } from "react";
import { useGameStore } from "@/game/state";
import { DISGRACED_PRIOR_UPGRADES } from "@/game/rules/skillUpgrades";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const BADGE_SIZE = 10;
const FILL_SIZE = BADGE_SIZE * 2.2;

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
  const atCapacity = !isAssigned && (priorAssignedActions?.length ?? 0) >= maxActions;

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
      ? "Click to remove Disgraced Prior from this action"
      : "Click to assign Disgraced Prior to this action";

  // Base background: provides the always-visible dim fill (inactive/locked).
  // When active, the animated fill div slides over it.
  const bg = atCapacity
    ? "rgba(255,255,255,0.12)"
    : hovered && !isAssigned ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.6)";

  // active: dark gap + bright outer ring; inactive/locked: simple ring
  const shadow = isAssigned
    ? `0 0 0 1.5px #252525, 0 0 0 2.5px ${hovered ? "rgba(255,255,255,1)" : "rgba(255,255,255,0.95)"}`
    : atCapacity
      ? "0 0 0 0.5px rgba(255,255,255,0.15)"
      : `0 0 0 0.5px ${hovered ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.7)"}`;

  // Animated fill div slides in from top-left when assigned
  const fillOffset = isAssigned
    ? `-${Math.round(BADGE_SIZE * 0.3)}px`
    : `-${FILL_SIZE + 2}px`;

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
              bottom: "-4px",
              right: "-4px",
              width: `${BADGE_SIZE}px`,
              height: `${BADGE_SIZE}px`,
              borderRadius: "50%",
              background: bg,
              boxShadow: shadow,
              overflow: "hidden",
              cursor: atCapacity ? "default" : "pointer",
              zIndex: 20,
              transition: "background 700ms, box-shadow 800ms",
            }}
          >
            <div
              style={{
                width: `${FILL_SIZE}px`,
                height: `${FILL_SIZE}px`,
                background: "rgba(255,255,255,1)",
                position: "absolute",
                top: fillOffset,
                left: fillOffset,
                transform: "rotateZ(45deg)",
                transition: "top 600ms ease, left 600ms ease",
              }}
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
