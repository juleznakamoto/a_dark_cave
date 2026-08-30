import type { ReactNode } from "react";
import { TooltipWrapper } from "@/components/game/TooltipWrapper";
import { getRedactedWidthCh, RedactedBar } from "@/components/game/RedactedHint";
import {
  shouldShowDemoLockedTab,
  type DemoTeaserTabId,
} from "@/game/demoTeaserTabs";
import { useGameStore } from "@/game/state";
import {
  NEW_ITEM_PULSE_REDACTED_CLASS,
  useNewItemPulseTooltips,
} from "@/hooks/useNewItemPulseTooltip";
import { useDemoEndCatalogActive } from "@/hooks/useSteamEditionActive";
import { useUiTranslation } from "@/i18n/useUiTranslation";
import { cn } from "@/lib/utils";

export function DemoLockedTabButton({
  tabId,
  label,
  tabButtonClass,
  tabInactiveTextClass,
  className,
  onClick,
  onPointerEnter,
}: {
  tabId: DemoTeaserTabId;
  label: string;
  tabButtonClass: string;
  tabInactiveTextClass: string;
  className?: string;
  onClick?: () => void;
  onPointerEnter?: () => void;
}) {
  const { t } = useUiTranslation();
  const hint = t("demoTabs.notYetUnlocked", {
    defaultValue: "Not yet unlocked.",
  });
  const redactedWidthCh = getRedactedWidthCh(label);
  const tooltipId = `tab-${tabId}-locked`;
  const catalogActive = useDemoEndCatalogActive();
  const setHoveredTooltip = useGameStore((s) => s.setHoveredTooltip);
  const { pulseClassName, onMouseEnter, onMouseLeave } = useNewItemPulseTooltips(
    [tooltipId],
    NEW_ITEM_PULSE_REDACTED_CLASS,
  );

  return (
    <TooltipWrapper
      tooltip={<div className="text-xs">{hint}</div>}
      disabled={true}
      tooltipId={tooltipId}
      className="inline-flex"
      tooltipTriggerAsChild
    >
      <button
        type="button"
        className={cn(
          tabButtonClass,
          className ?? tabInactiveTextClass,
          "overflow-visible",
        )}
        onClick={() => {
          if (catalogActive) setHoveredTooltip(tooltipId, true);
          onClick?.();
        }}
        onPointerEnter={() => {
          if (catalogActive) onMouseEnter(tooltipId);
          onPointerEnter?.();
        }}
        onPointerLeave={() => {
          if (catalogActive) onMouseLeave(tooltipId);
        }}
        aria-label={hint}
        data-testid={`tab-${tabId}-locked`}
      >
        <RedactedBar
          widthCh={redactedWidthCh}
          className={catalogActive ? pulseClassName(tooltipId) : undefined}
        />
      </button>
    </TooltipWrapper>
  );
}

/** Unlocked location tab, or a demo redacted placeholder while locked. */
export function GameLocationTabButton({
  tabId,
  unlocked,
  demoTease,
  label,
  className,
  tabButtonClass,
  tabInactiveTextClass,
  onClick,
  onPointerEnter,
  children,
}: {
  tabId: DemoTeaserTabId;
  unlocked: boolean;
  demoTease: boolean;
  label: string;
  className: string;
  tabButtonClass: string;
  tabInactiveTextClass: string;
  onClick: () => void;
  onPointerEnter?: () => void;
  children: ReactNode;
}) {
  if (unlocked) {
    return (
      <button
        className={`${tabButtonClass} ${className}`}
        onPointerEnter={onPointerEnter}
        onClick={onClick}
        data-testid={`tab-${tabId}`}
      >
        {children}
      </button>
    );
  }

  if (shouldShowDemoLockedTab({ demoEditionActive: demoTease, unlocked })) {
    return (
      <DemoLockedTabButton
        tabId={tabId}
        label={label}
        tabButtonClass={tabButtonClass}
        tabInactiveTextClass={tabInactiveTextClass}
        className={className}
        onClick={onClick}
        onPointerEnter={onPointerEnter}
      />
    );
  }

  return null;
}
