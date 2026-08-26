type TimedEndSlice = {
  isActive?: boolean;
  endTime?: number;
};

/** Minimal shape needed to expire wall-clock village/estate buffs and debuffs. */
export type TimedEffectsState = {
  feastState?: TimedEndSlice;
  greatFeastState?: TimedEndSlice;
  solsticeState?: TimedEndSlice;
  curseState?: TimedEndSlice;
  frostfallState?: TimedEndSlice;
  fogState?: TimedEndSlice;
  disgustState?: TimedEndSlice;
  focusState?: TimedEndSlice;
  miningBoostState?: TimedEndSlice;
  brimstoneFluxState?: TimedEndSlice;
  staringDeerState?: TimedEndSlice;
  forestFearState?: TimedEndSlice;
};

export const TIMED_EFFECT_KEYS = [
  "feastState",
  "greatFeastState",
  "solsticeState",
  "curseState",
  "frostfallState",
  "fogState",
  "disgustState",
  "focusState",
  "miningBoostState",
  "brimstoneFluxState",
  "staringDeerState",
  "forestFearState",
] as const;

export type TimedEffectKey = (typeof TIMED_EFFECT_KEYS)[number];

function isExpiredSlice(
  slice: TimedEndSlice | undefined,
  now: number,
): slice is TimedEndSlice {
  return (
    slice?.isActive === true &&
    slice.endTime != null &&
    slice.endTime <= now
  );
}

/**
 * Build a patch that flips expired timed buffs/debuffs to inactive.
 * Extra slice fields (feast level, focus points, fog duration) are preserved.
 * Returns null when nothing expired so the caller can skip a store write.
 */
export function processTimedEffects<T>(
  state: T & TimedEffectsState,
  now = Date.now(),
): Partial<Pick<T & TimedEffectsState, TimedEffectKey>> | null {
  const patch: Partial<Pick<T & TimedEffectsState, TimedEffectKey>> = {};

  for (const key of TIMED_EFFECT_KEYS) {
    const slice = state[key];
    if (!isExpiredSlice(slice, now)) continue;
    patch[key] = { ...slice, isActive: false } as (T & TimedEffectsState)[typeof key];
  }

  return Object.keys(patch).length > 0 ? patch : null;
}
