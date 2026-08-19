import { useEffect, useRef, useState } from "react";
import { useGameStore } from "@/game/state";

export const PERIODIC_PLAY_TIME_TOOLTIP_SHOW_MS = 20 * 1000;

/** Latest first-show-or-interval milestone at or before `playTimeMs`, or 0 if none yet. */
export function getLatestTooltipMilestonePlayMs(
  playTimeMs: number,
  firstShowPlayMs: number,
  intervalMs: number,
): number {
  if (playTimeMs < firstShowPlayMs) {
    return 0;
  }

  const elapsed = playTimeMs - firstShowPlayMs;
  const steps = Math.floor(elapsed / intervalMs);
  return firstShowPlayMs + steps * intervalMs;
}

/**
 * Auto-shows a footer callout at `firstShowPlayMs`, then every `intervalMs` of
 * active play. Each appearance lasts `showMs`. Reloading mid-milestone waits
 * for the next one. Set `enabled` false to hide immediately and skip future
 * auto-shows (hover can still be handled by the caller).
 */
export function usePeriodicPlayTimeTooltip({
  firstShowPlayMs,
  intervalMs,
  showMs = PERIODIC_PLAY_TIME_TOOLTIP_SHOW_MS,
  enabled = true,
}: {
  firstShowPlayMs: number;
  intervalMs: number;
  showMs?: number;
  enabled?: boolean;
}): boolean {
  const playTime = useGameStore((state) => state.playTime ?? 0);
  const [visible, setVisible] = useState(false);
  const lastShownMilestoneRef = useRef(
    getLatestTooltipMilestonePlayMs(playTime, firstShowPlayMs, intervalMs),
  );
  const hideTimeoutRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!enabled) {
      if (hideTimeoutRef.current !== undefined) {
        window.clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = undefined;
      }
      setVisible(false);
      return;
    }

    const latestMilestone = getLatestTooltipMilestonePlayMs(
      playTime,
      firstShowPlayMs,
      intervalMs,
    );
    if (latestMilestone <= lastShownMilestoneRef.current) {
      return;
    }

    lastShownMilestoneRef.current = latestMilestone;
    if (hideTimeoutRef.current !== undefined) {
      window.clearTimeout(hideTimeoutRef.current);
    }
    setVisible(true);
    hideTimeoutRef.current = window.setTimeout(() => {
      setVisible(false);
      hideTimeoutRef.current = undefined;
    }, showMs);
  }, [playTime, enabled, firstShowPlayMs, intervalMs, showMs]);

  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current !== undefined) {
        window.clearTimeout(hideTimeoutRef.current);
      }
    };
  }, []);

  return visible;
}
