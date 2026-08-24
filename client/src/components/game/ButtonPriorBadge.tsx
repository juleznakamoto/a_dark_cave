import React, { useEffect, useMemo, useState } from "react";
import { useGameStore } from "@/game/state";
import { DISGRACED_PRIOR_UPGRADES } from "@/game/rules/skillUpgrades";
import { useTextScale } from "@/i18n/useTextScale";
import {
  getPriorDiscFillMetrics,
  getPriorDiscInnerFillStyle,
  getPriorDiscSurfaceColors,
  PRIOR_DISC_OUTER_TRANSITION,
} from "@/lib/priorDiscStyles";
import { getControlScaleFactor } from "@/lib/textScale";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTranslation } from "react-i18next";
import { isGameTabHidden, subscribeGameTabHidden } from "@/lib/tabVisibility";

/** Base diameter; CSS `.button-prior-badge` scales with `--adc-control-scale`. */
const BADGE_SIZE = 10;

interface ButtonPriorBadgeProps {
  actionId: string;
}

export function ButtonPriorBadge({ actionId }: ButtonPriorBadgeProps) {
  const { t } = useTranslation("ui");
  const { textScale } = useTextScale();
  const fellowship = useGameStore((s) => s.fellowship);
  const priorAssignedActions = useGameStore((s) => s.priorAssignedActions);
  const disgracedPriorSkills = useGameStore((s) => s.disgracedPriorSkills);
  const togglePriorAction = useGameStore((s) => s.togglePriorAction);
  const [hovered, setHovered] = useState(false);
  const [tabHidden, setTabHidden] = useState(false);

  useEffect(() => {
    return subscribeGameTabHidden(() => {
      const hidden = isGameTabHidden();
      setTabHidden(hidden);
      if (hidden) setHovered(false);
    });
  }, []);
  const badgeFillMetrics = useMemo(
    () => getPriorDiscFillMetrics(BADGE_SIZE * getControlScaleFactor(textScale)),
    [textScale],
  );

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
    ? t("badges.priorUpgradeRequired")
    : isAssigned
      ? t("badges.priorRemove")
      : t("badges.priorAssign");

  const { background, boxShadow } = getPriorDiscSurfaceColors({
    active: isAssigned,
    surfaceLocked: atCapacity,
    hovered,
  });

  return (
    <TooltipProvider delayDuration={400}>
      <Tooltip open={tabHidden ? false : undefined}>
        <TooltipTrigger asChild>
          <div
            onClick={handleClick}
            onPointerDown={(e) => e.stopPropagation()}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            data-testid={`prior-badge-${actionId}`}
            className={cn(
              "button-prior-badge",
              isAssigned && "button-prior-badge--assigned",
            )}
            style={{
              borderRadius: "50%",
              background,
              boxShadow,
              cursor: atCapacity ? "default" : "pointer",
              zIndex: 20,
              transition: PRIOR_DISC_OUTER_TRANSITION,
            }}
          >
            <div className="absolute inset-0 overflow-hidden rounded-full pointer-events-none">
              <div
                style={getPriorDiscInnerFillStyle({
                  active: isAssigned,
                  fillSize: badgeFillMetrics.fillSize,
                  fillOffsetInPx: badgeFillMetrics.fillOffsetInPx,
                  fillOffsetOutPx: badgeFillMetrics.fillOffsetOutPx,
                })}
              />
            </div>
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
