import { useCallback, useEffect, useRef } from "react";
import { useGameStore } from "@/game/state";
import { useGlobalTooltip } from "@/hooks/useGlobalTooltip";
import { cn } from "@/lib/utils";

const HOVER_DISMISS_MS = 500;

/**
 * First-time "new item" pulse for tooltip triggers. Glow stops after hover (desktop:
 * 500ms) or when the tooltip opens (mobile long-press). Dismissal is persisted in
 * `hoveredTooltips` so indicators do not re-pulse when they reappear later.
 */
export function useNewItemPulseTooltips(knownTooltipIds?: readonly string[]) {
  const hoveredTooltips = useGameStore((s) => s.hoveredTooltips || {});
  const setHoveredTooltip = useGameStore((s) => s.setHoveredTooltip);
  const hoverTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );
  const globalTooltip = useGlobalTooltip();

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
    const openId = globalTooltip.openTooltipId;
    if (!openId) return;
    if (knownTooltipIds && !knownTooltipIds.includes(openId)) return;
    dismissPulse(openId);
  }, [globalTooltip.openTooltipId, knownTooltipIds, dismissPulse]);

  useEffect(
    () => () => {
      hoverTimersRef.current.forEach((timer) => clearTimeout(timer));
      hoverTimersRef.current.clear();
    },
    [],
  );

  const pulseClassName = useCallback(
    (tooltipId: string, className?: string) =>
      cn(className, !hoveredTooltips[tooltipId] && "new-item-pulse"),
    [hoveredTooltips],
  );

  return { pulseClassName, onMouseEnter, onMouseLeave };
}
