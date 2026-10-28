import { useCallback, useEffect, useRef } from "react";
import { useGameStore } from "@/game/state";
import { useOpenGlobalTooltipId } from "@/hooks/useGlobalTooltip";
import { cn } from "@/lib/utils";

const HOVER_DISMISS_MS = 500;

/**
 * How long a new side-panel item, and an unread event-log line, keeps pulsing.
 * After this the glow stops on its own. Hover still dismisses a side-panel
 * item sooner.
 */
export const NEW_ITEM_PULSE_DURATION_MS = 15 * 60 * 1000;

/**
 * True while a side-panel new-item glow should still run.
 * A missing start time counts as active so the first paint glows; the panel
 * records `Date.now()` immediately after that.
 */
export function isNewItemPulseActive(
  startedAt: number | undefined,
  now: number,
): boolean {
  if (typeof startedAt !== "number" || !Number.isFinite(startedAt)) return true;
  return now - startedAt < NEW_ITEM_PULSE_DURATION_MS;
}

/** Shadow pulse for glyphs and rings (insight badges, header marks). */
export const NEW_ITEM_PULSE_CLASS = "new-item-pulse";
/** Text labels: the element's own color fades to white. No shadow. */
export const NEW_ITEM_PULSE_TEXT_CLASS = "new-item-pulse-text";
/** Opacity fade for redacted game-tab bars. No shadow. */
export const NEW_ITEM_PULSE_REDACTED_CLASS = "new-item-pulse-redacted";
/**
 * Same pulse, tinted by `--new-item-pulse-color`. Claim buttons keep this until
 * click (the button unmounts when claimed). Do not dismiss it on hover.
 */
export const NEW_ITEM_PULSE_COLORED_CLASS = "new-item-pulse-colored";

/**
 * First-time "new item" pulse for tooltip triggers. Glow stops after hover (desktop:
 * 500ms) or when the tooltip opens (mobile long-press). Dismissal is persisted in
 * `hoveredTooltips` so indicators do not re-pulse when they reappear later.
 */
export function useNewItemPulseTooltips(
  knownTooltipIds?: readonly string[],
  pulseClass: string = NEW_ITEM_PULSE_CLASS,
) {
  const hoveredTooltips = useGameStore((s) => s.hoveredTooltips || {});
  const setHoveredTooltip = useGameStore((s) => s.setHoveredTooltip);
  const hoverTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );
  const openTooltipId = useOpenGlobalTooltipId();

  const dismissPulse = useCallback(
    (tooltipId: string) => {
      if (!hoveredTooltips[tooltipId]) {
        setHoveredTooltip(tooltipId, true);
      }
    },
    [hoveredTooltips, setHoveredTooltip],
  );

  const onMouseEnter = useCallback(
    (tooltipId: string) => {
      const existing = hoverTimersRef.current.get(tooltipId);
      if (existing) clearTimeout(existing);
      const timer = setTimeout(() => {
        dismissPulse(tooltipId);
        hoverTimersRef.current.delete(tooltipId);
      }, HOVER_DISMISS_MS);
      hoverTimersRef.current.set(tooltipId, timer);
    },
    [dismissPulse],
  );

  const onMouseLeave = useCallback((tooltipId: string) => {
    const timer = hoverTimersRef.current.get(tooltipId);
    if (timer) {
      clearTimeout(timer);
      hoverTimersRef.current.delete(tooltipId);
    }
  }, []);

  useEffect(() => {
    if (!openTooltipId) return;
    if (knownTooltipIds && !knownTooltipIds.includes(openTooltipId)) return;
    dismissPulse(openTooltipId);
  }, [openTooltipId, knownTooltipIds, dismissPulse]);

  useEffect(
    () => () => {
      hoverTimersRef.current.forEach((timer) => clearTimeout(timer));
      hoverTimersRef.current.clear();
    },
    [],
  );

  const pulseClassName = useCallback(
    (tooltipId: string, className?: string) =>
      cn(className, !hoveredTooltips[tooltipId] && pulseClass),
    [hoveredTooltips, pulseClass],
  );

  return { pulseClassName, onMouseEnter, onMouseLeave };
}
