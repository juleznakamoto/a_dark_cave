import React, { useEffect, useMemo, useState } from "react";
import { useGameStore } from "@/game/state";
import {
  canAssignAnotherPriorAction,
  hasHuntressPriorSlot,
  HUNTRESS_PRIOR_ACTION_ID,
} from "@/game/rules/pacts";
import { DISGRACED_PRIOR_UPGRADES } from "@/game/rules/skillUpgrades";
import { useTextScale } from "@/i18n/useTextScale";
import {
  getPriorDiscFillMetrics,
  getPriorDiscInnerFillStyle,
  getPriorDiscSurfaceColors,
  PRIOR_DISC_OUTER_TRANSITION,
} from "@/lib/priorDiscStyles";
import { getRenderedControlScaleFactor } from "@/lib/textScale";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useUiTranslation } from "@/i18n/useUiTranslation";
import { isGameTabHidden, subscribeGameTabHidden } from "@/lib/tabVisibility";

/** Idle / assigned diameter. CSS `.button-prior-badge` scales with `--adc-control-scale`. */
export const PRIOR_BADGE_SIZE_PX = 12;

interface ButtonPriorBadgeProps {
  actionId: string;
}

export function ButtonPriorBadge({ actionId }: ButtonPriorBadgeProps) {
  const { t } = useUiTranslation();
  const { textScale } = useTextScale();
  const fellowship = useGameStore((s) => s.fellowship);
  const chosenPacts = useGameStore((s) => s.chosenPacts);
  const huntressHunts = useGameStore((s) => s.story.seen.huntressHunts);
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
  const isAssigned = priorAssignedActions?.includes(actionId) ?? false;
  const badgeFillMetrics = useMemo(
    () =>
      getPriorDiscFillMetrics(
        PRIOR_BADGE_SIZE_PX * getRenderedControlScaleFactor(textScale),
      ),
    [textScale],
  );

  const huntressSlot = hasHuntressPriorSlot({
    chosenPacts,
    fellowship,
    story: { seen: { huntressHunts } },
  });
  const isHuntressBadge =
    huntressSlot && actionId === HUNTRESS_PRIOR_ACTION_ID;
  if (!fellowship?.disgraced_prior && !isHuntressBadge) return null;

  const level = disgracedPriorSkills?.level ?? 0;
  const maxActions = DISGRACED_PRIOR_UPGRADES[level]?.maxActions ?? 1;
  const atCapacity =
    !isAssigned &&
    !isHuntressBadge &&
    !canAssignAnotherPriorAction(
      actionId,
      priorAssignedActions,
      maxActions,
      huntressSlot,
    );

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
      ? t(isHuntressBadge ? "badges.huntressRemove" : "badges.priorRemove")
      : t(isHuntressBadge ? "badges.huntressAssign" : "badges.priorAssign");

  const tone = isHuntressBadge ? "bronze" : "silver";
  const { background, boxShadow } = getPriorDiscSurfaceColors({
    active: isAssigned,
    surfaceLocked: atCapacity,
    hovered,
    tone,
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
            data-prior-tone={tone}
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
                  tone,
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
