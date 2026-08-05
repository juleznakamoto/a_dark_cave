import { describe, expect, it } from "vitest";
import {
  implyBossWaveVictoriesInSeen,
  migrateBossWaveTimers,
  migrateBossWaveVictoriesInSeen,
} from "./bossWaveMigration";

describe("migrateBossWaveVictoriesInSeen", () => {
  it("does not grant first boss from fifth alone", () => {
    expect(
      migrateBossWaveVictoriesInSeen({ fifthWaveVictory: true }),
    ).toBeNull();
  });

  it("grants first boss when sixth or later is won", () => {
    expect(
      migrateBossWaveVictoriesInSeen({ sixthWaveVictory: true }),
    ).toEqual({
      sixthWaveVictory: true,
      firstBossWaveVictory: true,
    });
  });

  it("grants both bosses when tenth is won", () => {
    expect(
      migrateBossWaveVictoriesInSeen({ tenthWaveVictory: true }),
    ).toEqual({
      tenthWaveVictory: true,
      firstBossWaveVictory: true,
      secondBossWaveVictory: true,
    });
  });

  it("no-ops when boss flags already present", () => {
    expect(
      migrateBossWaveVictoriesInSeen({
        sixthWaveVictory: true,
        firstBossWaveVictory: true,
        tenthWaveVictory: true,
        secondBossWaveVictory: true,
      }),
    ).toBeNull();
  });
});

describe("migrateBossWaveTimers", () => {
  it("clears stale sixthWave timer when stuck after fifth before first boss", () => {
    const next = migrateBossWaveTimers(
      {
        sixthWave: {
          startTime: 1,
          duration: 1000,
          elapsedTime: 999,
          defeated: false,
        },
      },
      { fifthWaveVictory: true },
    );
    expect(next).toEqual({});
  });

  it("clears postCompletion timer when tenth won but second boss not", () => {
    const next = migrateBossWaveTimers(
      {
        postCompletionWave: {
          startTime: 1,
          duration: 1000,
          elapsedTime: 0,
          defeated: false,
          provoked: true,
        },
      },
      { tenthWaveVictory: true },
    );
    expect(next?.postCompletionWave).toBeUndefined();
  });

  it("clears orphan boss timers when boss victories already granted", () => {
    const next = migrateBossWaveTimers(
      {
        firstBossWave: { startTime: 1, duration: 1, defeated: false },
        secondBossWave: { startTime: 1, duration: 1, defeated: false },
      },
      {
        firstBossWaveVictory: true,
        secondBossWaveVictory: true,
      },
    );
    expect(next).toEqual({});
  });
});

describe("implyBossWaveVictoriesInSeen", () => {
  it("returns implied seen for metrics without mutating null", () => {
    expect(implyBossWaveVictoriesInSeen(undefined)).toEqual({});
    expect(
      implyBossWaveVictoriesInSeen({ tenthWaveVictory: true })
        .secondBossWaveVictory,
    ).toBe(true);
  });
});
