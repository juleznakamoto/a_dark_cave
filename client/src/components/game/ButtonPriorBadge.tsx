import React, { useMemo, useState } from "react";
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
import { TooltipWrapper } from "@/components/game/TooltipWrapper";
import { useUiTranslation } from "@/i18n/useUiTranslation";
import { playHaptic } from "@/lib/haptics";

/** Idle / assigned disc diameter. Hit host is 24px (`.button-prior-badge`). */
export const PRIOR_BADGE_SIZE_PX = 14;

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
      playHaptic("priorBadge");
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

  // Full slots: tip-only (no assign). Keep long-press + short-tap tip path.
  const tipOnly = atCapacity && !isAssigned;

  return (
    <TooltipWrapper
      tooltip={tooltipText}
      tooltipId={`prior-badge-${actionId}`}
      disabled={tipOnly}
      side="right"
      tooltipContentClassName="max-w-xs bg-popover text-white border text-xs"
      tooltipTriggerAsChild
      className={cn(
        "button-prior-badge z-[20]",
        tipOnly ? "cursor-default" : "cursor-pointer",
        isAssigned && "button-prior-badge--assigned",
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        onClick={tipOnly ? undefined : handleClick}
        onPointerDown={(e) => e.stopPropagation()}
        data-testid={`prior-badge-${actionId}`}
        data-prior-tone={tone}
        className="flex h-full w-full items-center justify-center"
      >
        <div
          className="button-prior-badge__disc"
          style={{
            borderRadius: "50%",
            background,
            boxShadow,
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
      </div>
    </TooltipWrapper>
  );
}
