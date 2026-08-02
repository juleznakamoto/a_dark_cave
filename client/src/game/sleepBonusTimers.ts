type TimedEndSlice = {
  isActive?: boolean;
  endTime?: number;
};

type HeartfireSlice = {
  level?: number;
  lastLevelDecrease?: number;
};

type FocusSlice = {
  isActive?: boolean;
  endTime?: number;
  startTime?: number;
  duration?: number;
  points?: number;
};

type ObsidianOrbSlice = {
  nextFocusGainTime?: number;
};

/** Minimal shape needed to freeze production/buff timers across sleep. */
export type SleepBonusTimerState = {
  feastState?: TimedEndSlice;
  greatFeastState?: TimedEndSlice;
  solsticeState?: TimedEndSlice;
  curseState?: TimedEndSlice;
  frostfallState?: TimedEndSlice;
  fogState?: TimedEndSlice;
  disgustState?: TimedEndSlice;
  miningBoostState?: TimedEndSlice;
  woodcutterState?: TimedEndSlice;
  focusState?: FocusSlice;
  heartfireState?: HeartfireSlice;
  obsidianOrbState?: ObsidianOrbSlice;
};

const TIMED_END_KEYS = [
  "feastState",
  "greatFeastState",
  "solsticeState",
  "curseState",
  "frostfallState",
  "fogState",
  "disgustState",
  "miningBoostState",
  "woodcutterState",
] as const;

function wasActiveAtSleepStart(
  slice: TimedEndSlice | undefined,
  sleepStartedAt: number,
): boolean {
  return slice?.isActive === true && (slice.endTime ?? 0) > sleepStartedAt;
}

/**
 * Build a state patch that freezes wall-clock bonus/debuff timers for a sleep session.
 * Call on wake with pauseMs = now - sleepStartedAt so remaining effect time is unchanged.
 *
 * Only shifts effects that were still running when sleep began (avoids reviving expired ones).
 */
export function buildSleepBonusTimerFreezePatch(
  state: SleepBonusTimerState,
  pauseMs: number,
  sleepStartedAt: number,
): Partial<SleepBonusTimerState> {
  if (pauseMs <= 0 || sleepStartedAt <= 0) return {};

  const patch: Partial<SleepBonusTimerState> = {};

  for (const key of TIMED_END_KEYS) {
    const slice = state[key];
    if (!wasActiveAtSleepStart(slice, sleepStartedAt)) continue;
    patch[key] = {
      ...slice,
      endTime: (slice!.endTime ?? 0) + pauseMs,
    };
  }

  const focus = state.focusState;
  if (wasActiveAtSleepStart(focus, sleepStartedAt)) {
    const startTime = focus!.startTime ?? 0;
    patch.focusState = {
      ...focus,
      endTime: (focus!.endTime ?? 0) + pauseMs,
      // Keep progress UI in sync: elapsed = now - startTime uses wall clock too.
      startTime: startTime > 0 ? startTime + pauseMs : startTime,
    };
  }

  if ((state.heartfireState?.level ?? 0) > 0) {
    patch.heartfireState = {
      ...state.heartfireState,
      level: state.heartfireState!.level,
      lastLevelDecrease:
        (state.heartfireState!.lastLevelDecrease || 0) + pauseMs,
    };
  }

  const nextFocusGain = state.obsidianOrbState?.nextFocusGainTime ?? 0;
  if (nextFocusGain > sleepStartedAt) {
    patch.obsidianOrbState = {
      ...state.obsidianOrbState,
      nextFocusGainTime: nextFocusGain + pauseMs,
    };
  }

  return patch;
}
