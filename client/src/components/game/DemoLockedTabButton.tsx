import type { ReactNode } from "react";
import { getRedactedWidthCh, RedactedBar } from "@/components/game/RedactedHint";
import {
  shouldShowDemoLockedTab,
  type DemoTeaserTabId,
} from "@/game/demoTeaserTabs";
import {
  NEW_ITEM_PULSE_REDACTED_CLASS,
  useNewItemPulseTooltips,
} from "@/hooks/useNewItemPulseTooltip";
import { useDemoEndCatalogActive } from "@/hooks/useSteamEditionActive";
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
  const redactedWidthCh = getRedactedWidthCh(label);
  const pulseId = `tab-${tabId}-locked`;
  const catalogActive = useDemoEndCatalogActive();
  const { pulseClassName, onMouseEnter, onMouseLeave } = useNewItemPulseTooltips(
    [pulseId],
    NEW_ITEM_PULSE_REDACTED_CLASS,
  );

  return (
    <button
      type="button"
      className={cn(
        tabButtonClass,
        className ?? tabInactiveTextClass,
        "overflow-visible",
      )}
      onClick={onClick}
      onPointerEnter={() => {
        if (catalogActive) onMouseEnter(pulseId);
        onPointerEnter?.();
      }}
      onPointerLeave={() => {
        if (catalogActive) onMouseLeave(pulseId);
      }}
      aria-label={label}
      data-testid={`tab-${tabId}-locked`}
    >
      <RedactedBar
        widthCh={redactedWidthCh}
        className={catalogActive ? pulseClassName(pulseId) : undefined}
      />
    </button>
  );
}

/** Unlocked location tab, or a demo-end redacted placeholder while locked. */
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

  if (shouldShowDemoLockedTab({ demoEndCatalogActive: demoTease, unlocked })) {
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
