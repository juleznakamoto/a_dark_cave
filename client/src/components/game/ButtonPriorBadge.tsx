import React from "react";
import { useGameStore } from "@/game/state";
import { DISGRACED_PRIOR_UPGRADES } from "@/game/rules/skillUpgrades";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const BADGE_SIZE = 12;
const FILL_SIZE = BADGE_SIZE * 2.1;

interface ButtonPriorBadgeProps {
  actionId: string;
}

export function ButtonPriorBadge({ actionId }: ButtonPriorBadgeProps) {
  const fellowship = useGameStore((s) => s.fellowship);
  const priorAssignedActions = useGameStore((s) => s.priorAssignedActions);
  const disgracedPriorSkills = useGameStore((s) => s.disgracedPriorSkills);
  const togglePriorAction = useGameStore((s) => s.togglePriorAction);

  if (!fellowship?.disgraced_prior) return null;

  const level = disgracedPriorSkills?.level ?? 0;
  const maxActions = DISGRACED_PRIOR_UPGRADES[level]?.maxActions ?? 1;
  const isAssigned = priorAssignedActions?.includes(actionId) ?? false;
  const atCapacity =
    !isAssigned && (priorAssignedActions?.length ?? 0) >= maxActions;

  const ringColor = isAssigned
    ? "rgba(255,255,255,0.9)"
    : atCapacity
      ? "rgba(255,255,255,0.15)"
      : "rgba(255,255,255,0.35)";

  const fillOffset = isAssigned
    ? `-${Math.round(BADGE_SIZE * 0.3)}px`
    : `-${FILL_SIZE + 2}px`;

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

  return (
    <TooltipProvider delayDuration={400}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            onClick={handleClick}
            onPointerDown={(e) => e.stopPropagation()}
            data-testid={`prior-badge-${actionId}`}
            style={{
              position: "absolute",
              bottom: "-5px",
              right: "-5px",
              width: `${BADGE_SIZE}px`,
              height: `${BADGE_SIZE}px`,
              borderRadius: "50%",
              boxShadow: `0 0 0 1px ${ringColor}`,
              overflow: "hidden",
              cursor: atCapacity ? "not-allowed" : "pointer",
              zIndex: 20,
              transition: "box-shadow 200ms",
            }}
          >
            <input
              type="checkbox"
              checked={isAssigned}
              readOnly
              style={{
                position: "absolute",
                left: "50px",
                visibility: "hidden",
              }}
            />
            <div
              style={{
                width: `${FILL_SIZE}px`,
                height: `${FILL_SIZE}px`,
                background: "rgba(255,255,255,0.82)",
                position: "absolute",
                top: fillOffset,
                left: fillOffset,
                transform: "rotateZ(45deg)",
                transition: "top 300ms ease, left 300ms ease",
              }}
            />
            {atCapacity && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg
                  width="8"
                  height="8"
                  viewBox="0 0 10 12"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <rect
                    x="1"
                    y="5"
                    width="8"
                    height="7"
                    rx="1"
                    fill="rgba(255,255,255,0.35)"
                  />
                  <path
                    d="M3 5V3.5a2 2 0 0 1 4 0V5"
                    stroke="rgba(255,255,255,0.35)"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            )}
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
