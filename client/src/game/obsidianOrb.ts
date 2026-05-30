import type { GameState } from "@shared/schema";
import type { FocusState } from "@/game/types";

export const OBSIDIAN_ORB_FOCUS_INTERVAL_MS = 15 * 60 * 1000;
export const MAX_FOCUS_POINTS = 30;

/** Passive focus from Obsidian Orb; returns state patch or null if unchanged. */
export function tickObsidianOrbFocus(
  state: Pick<
    GameState,
    "relics" | "obsidianOrbState" | "focusState" | "idleModeState"
  >,
): {
  focusState: FocusState;
  obsidianOrbState: GameState["obsidianOrbState"];
  totalFocusEarned: number;
} | null {
  if (!state.relics?.obsidian_orb || state.idleModeState?.isActive) {
    return null;
  }

  const now = Date.now();
  let next = state.obsidianOrbState?.nextFocusGainTime ?? 0;
  if (next <= 0) {
    next = now + OBSIDIAN_ORB_FOCUS_INTERVAL_MS;
  }

  if (now < next) {
    return null;
  }

  const fs = state.focusState as FocusState | undefined;
  const currentPoints = fs?.points ?? 0;

  /** At cap, discard elapsed intervals — do not bank cooldowns while full. */
  const scheduleNextGainFromNow = () => now + OBSIDIAN_ORB_FOCUS_INTERVAL_MS;

  if (currentPoints >= MAX_FOCUS_POINTS) {
    const alignedNext = scheduleNextGainFromNow();
    if (alignedNext === next) {
      return null;
    }
    return {
      focusState: {
        isActive: fs?.isActive ?? false,
        endTime: fs?.endTime ?? 0,
        duration: fs?.duration,
        startTime: fs?.startTime,
        points: currentPoints,
      },
      obsidianOrbState: { nextFocusGainTime: alignedNext },
      totalFocusEarned: 0,
    };
  }

  const roomToMax = MAX_FOCUS_POINTS - currentPoints;
  const intervalsDue =
    now >= next
      ? Math.min(
        roomToMax,
        Math.floor((now - next) / OBSIDIAN_ORB_FOCUS_INTERVAL_MS) || 1,
      )
      : 0;
  const gained = intervalsDue;
  next = next + gained * OBSIDIAN_ORB_FOCUS_INTERVAL_MS;

  const newPoints = currentPoints + gained;
  if (newPoints >= MAX_FOCUS_POINTS) {
    next = scheduleNextGainFromNow();
  }

  if (gained === 0) {
    return null;
  }

  return {
    focusState: {
      isActive: fs?.isActive ?? false,
      endTime: fs?.endTime ?? 0,
      duration: fs?.duration,
      startTime: fs?.startTime,
      points: newPoints,
    },
    obsidianOrbState: { nextFocusGainTime: next },
    totalFocusEarned: gained,
  };
}

export function formatObsidianOrbFocusCountdown(remainingMs: number): string {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
