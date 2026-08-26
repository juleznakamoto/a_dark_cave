import { describe, expect, it } from "vitest";
import {
  processTimedEffects,
  TIMED_EFFECT_KEYS,
  type TimedEffectsState,
} from "./timedEffects";

const now = 1_000_000;

const inactiveSlice = { isActive: false, endTime: 0 };

function baseState(): TimedEffectsState {
  return {
    feastState: { ...inactiveSlice, lastAcceptedLevel: 0 },
    greatFeastState: { ...inactiveSlice },
    solsticeState: { ...inactiveSlice, tier: 1, activationsCount: 0 },
    curseState: { ...inactiveSlice },
    frostfallState: { ...inactiveSlice },
    fogState: { ...inactiveSlice, duration: 0 },
    disgustState: { ...inactiveSlice, duration: 0 },
    focusState: { ...inactiveSlice, startTime: 0, duration: 0, points: 0 },
    miningBoostState: { ...inactiveSlice },
    brimstoneFluxState: { ...inactiveSlice },
    staringDeerState: { ...inactiveSlice },
    forestFearState: { ...inactiveSlice },
  };
}

describe("processTimedEffects", () => {
  it("returns null when every slice is inactive", () => {
    expect(processTimedEffects(baseState(), now)).toBeNull();
  });

  it("returns null when an active slice still has time left", () => {
    const patch = processTimedEffects(
      {
        ...baseState(),
        curseState: { isActive: true, endTime: now + 1 },
      },
      now,
    );
    expect(patch).toBeNull();
  });

  it("expires an active slice at endTime", () => {
    const patch = processTimedEffects(
      {
        ...baseState(),
        curseState: { isActive: true, endTime: now },
      },
      now,
    );
    expect(patch).toEqual({
      curseState: { isActive: false, endTime: now },
    });
  });

  it("preserves extra fields when flipping isActive", () => {
    const feast = {
      isActive: true,
      endTime: now - 1,
      lastAcceptedLevel: 3,
    };
    const focus = {
      isActive: true,
      endTime: now - 5,
      startTime: now - 60_000,
      duration: 60_000,
      points: 4,
    };
    const fog = {
      isActive: true,
      endTime: now - 2,
      duration: 120_000,
    };

    const patch = processTimedEffects(
      {
        ...baseState(),
        feastState: feast,
        focusState: focus,
        fogState: fog,
      },
      now,
    );

    expect(patch).toEqual({
      feastState: { ...feast, isActive: false },
      focusState: { ...focus, isActive: false },
      fogState: { ...fog, isActive: false },
    });
  });

  it("combines every expired slice into one patch", () => {
    const expired = { isActive: true, endTime: now - 1 };
    const state = Object.fromEntries(
      TIMED_EFFECT_KEYS.map((key) => [key, { ...expired }]),
    ) as TimedEffectsState;

    const patch = processTimedEffects(state, now);

    expect(patch).not.toBeNull();
    expect(Object.keys(patch!)).toEqual([...TIMED_EFFECT_KEYS]);
    for (const key of TIMED_EFFECT_KEYS) {
      expect(patch![key]).toEqual({ isActive: false, endTime: now - 1 });
    }
  });

  it("ignores missing slices and slices without endTime", () => {
    const patch = processTimedEffects(
      {
        feastState: { isActive: true },
        curseState: undefined,
      },
      now,
    );
    expect(patch).toBeNull();
  });

  it("does not expire an inactive slice even if endTime is in the past", () => {
    const patch = processTimedEffects(
      {
        ...baseState(),
        miningBoostState: { isActive: false, endTime: now - 10_000 },
      },
      now,
    );
    expect(patch).toBeNull();
  });
});
