import { describe, expect, it } from "vitest";
import { buildSleepBonusTimerFreezePatch } from "./sleepBonusTimers";

describe("buildSleepBonusTimerFreezePatch", () => {
  const sleepStartedAt = 1_000_000;
  const pauseMs = 60 * 60 * 1000; // 1 hour sleep

  const baseState = {
    feastState: { isActive: false, endTime: 0, lastAcceptedLevel: 0 },
    greatFeastState: { isActive: false, endTime: 0 },
    solsticeState: {
      isActive: false,
      endTime: 0,
      tier: 1,
      activationsCount: 0,
    },
    curseState: { isActive: false, endTime: 0 },
    frostfallState: { isActive: false, endTime: 0 },
    fogState: { isActive: false, endTime: 0, duration: 0 },
    disgustState: { isActive: false, endTime: 0, duration: 0 },
    miningBoostState: { isActive: false, endTime: 0 },
    brimstoneFluxState: { isActive: false, endTime: 0 },
    woodcutterState: { isActive: false, endTime: 0 },
    focusState: { isActive: false, endTime: 0, startTime: 0, duration: 0 },
    heartfireState: { level: 0, lastLevelDecrease: 0 },
    obsidianOrbState: { nextFocusGainTime: 0 },
  };

  it("returns empty patch for non-positive pause", () => {
    expect(
      buildSleepBonusTimerFreezePatch(baseState, 0, sleepStartedAt),
    ).toEqual({});
    expect(
      buildSleepBonusTimerFreezePatch(baseState, -1, sleepStartedAt),
    ).toEqual({});
  });

  it("extends active feast endTime by pause duration", () => {
    const remainingAtSleepStart = 10 * 60 * 1000;
    const feastEnd = sleepStartedAt + remainingAtSleepStart;
    const patch = buildSleepBonusTimerFreezePatch(
      {
        ...baseState,
        feastState: {
          isActive: true,
          endTime: feastEnd,
          lastAcceptedLevel: 2,
        },
      },
      pauseMs,
      sleepStartedAt,
    );

    expect(patch.feastState?.endTime).toBe(feastEnd + pauseMs);
    expect(patch.feastState?.isActive).toBe(true);
    // Remaining after wake equals remaining at sleep start
    const wakeAt = sleepStartedAt + pauseMs;
    expect(patch.feastState!.endTime - wakeAt).toBe(remainingAtSleepStart);
  });

  it("does not revive effects that already expired before sleep", () => {
    const patch = buildSleepBonusTimerFreezePatch(
      {
        ...baseState,
        curseState: {
          isActive: true,
          endTime: sleepStartedAt - 1,
        },
      },
      pauseMs,
      sleepStartedAt,
    );
    expect(patch.curseState).toBeUndefined();
  });

  it("shifts focus startTime and endTime together", () => {
    const focusStart = sleepStartedAt - 30_000;
    const focusEnd = sleepStartedAt + 90_000;
    const patch = buildSleepBonusTimerFreezePatch(
      {
        ...baseState,
        focusState: {
          isActive: true,
          startTime: focusStart,
          endTime: focusEnd,
          duration: focusEnd - focusStart,
        },
      },
      pauseMs,
      sleepStartedAt,
    );

    expect(patch.focusState?.startTime).toBe(focusStart + pauseMs);
    expect(patch.focusState?.endTime).toBe(focusEnd + pauseMs);
    expect(patch.focusState?.duration).toBe(focusEnd - focusStart);
  });

  it("freezes heartfire decay clock while level > 0", () => {
    const lastDecrease = sleepStartedAt - 40_000;
    const patch = buildSleepBonusTimerFreezePatch(
      {
        ...baseState,
        heartfireState: { level: 3, lastLevelDecrease: lastDecrease },
      },
      pauseMs,
      sleepStartedAt,
    );

    expect(patch.heartfireState?.level).toBe(3);
    expect(patch.heartfireState?.lastLevelDecrease).toBe(
      lastDecrease + pauseMs,
    );
  });

  it("shifts obsidian orb next focus gain when scheduled after sleep start", () => {
    const next = sleepStartedAt + 5 * 60 * 1000;
    const patch = buildSleepBonusTimerFreezePatch(
      {
        ...baseState,
        obsidianOrbState: { nextFocusGainTime: next },
      },
      pauseMs,
      sleepStartedAt,
    );
    expect(patch.obsidianOrbState?.nextFocusGainTime).toBe(next + pauseMs);
  });

  it("extends several active production timers in one patch", () => {
    const patch = buildSleepBonusTimerFreezePatch(
      {
        ...baseState,
        greatFeastState: {
          isActive: true,
          endTime: sleepStartedAt + 60_000,
        },
        solsticeState: {
          isActive: true,
          endTime: sleepStartedAt + 120_000,
          tier: 2,
          activationsCount: 1,
        },
        miningBoostState: {
          isActive: true,
          endTime: sleepStartedAt + 30_000,
        },
        disgustState: {
          isActive: true,
          endTime: sleepStartedAt + 45_000,
          duration: 45_000,
        },
      },
      pauseMs,
      sleepStartedAt,
    );

    expect(patch.greatFeastState?.endTime).toBe(
      sleepStartedAt + 60_000 + pauseMs,
    );
    expect(patch.solsticeState?.endTime).toBe(
      sleepStartedAt + 120_000 + pauseMs,
    );
    expect(patch.miningBoostState?.endTime).toBe(
      sleepStartedAt + 30_000 + pauseMs,
    );
    expect(patch.disgustState?.endTime).toBe(
      sleepStartedAt + 45_000 + pauseMs,
    );
  });
});
