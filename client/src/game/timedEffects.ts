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
  badDreamsState?: TimedEndSlice;
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
  "badDreamsState",
  "miningBoostState",
  "brimstoneFluxState",
  "staringDeerState",
  "forestFearState",
] as const;

export type TimedEffectKey = (typeof TIMED_EFFECT_KEYS)[number];

/**
 * Longest a single cast of each effect can run.
 * Sleep only pauses these clocks; it must not leave them longer than this.
 * Fog and disgust stack, so they are not listed.
 */
const TIMED_EFFECT_MAX_MS: Partial<Record<TimedEffectKey, number>> = {
  feastState: 15 * 60 * 1000,
  greatFeastState: 30 * 60 * 1000,
  solsticeState: 20 * 60 * 1000,
  curseState: 15 * 60 * 1000,
  frostfallState: 15 * 60 * 1000,
  focusState: 30 * 60 * 1000,
  badDreamsState: 10 * 60 * 1000,
  miningBoostState: 30 * 60 * 1000,
  brimstoneFluxState: 30 * 60 * 1000,
  staringDeerState: 15 * 60 * 1000,
  forestFearState: 20 * 60 * 1000,
};

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
 * Pull an active effect back to its real maximum length.
 * A wake that adds the sleep pause twice leaves these end times days ahead
 * while the ring still assumes the original few minutes.
 */
export function capOverlongTimedEffects<T>(
  state: T & TimedEffectsState,
  now = Date.now(),
): Partial<Pick<T & TimedEffectsState, TimedEffectKey>> | null {
  const patch: Partial<Pick<T & TimedEffectsState, TimedEffectKey>> = {};

  for (const key of TIMED_EFFECT_KEYS) {
    const maxMs = TIMED_EFFECT_MAX_MS[key];
    if (maxMs == null) continue;
    const slice = state[key];
    if (slice?.isActive !== true || slice.endTime == null) continue;
    if (slice.endTime <= now + maxMs) continue;
    patch[key] = { ...slice, endTime: now + maxMs } as (T & TimedEffectsState)[typeof key];
  }

  return Object.keys(patch).length > 0 ? patch : null;
}

/**
 * Build a patch that flips expired timed buffs/debuffs to inactive.
 * Also shortens active effects whose end time is past their maximum length.
 * Extra slice fields (feast level, focus points, fog duration) are preserved.
 * Returns null when nothing changed so the caller can skip a store write.
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

  const capped = capOverlongTimedEffects(state, now);
  if (capped) {
    for (const key of TIMED_EFFECT_KEYS) {
      if (patch[key] || !capped[key]) continue;
      patch[key] = capped[key];
    }
  }

  return Object.keys(patch).length > 0 ? patch : null;
}
