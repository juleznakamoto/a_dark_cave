import { describe, expect, it } from "vitest";
import { POST_COMPLETION_ATTACK_WAVE_ID } from "./rules/attackWaveOrder";
import { advanceAttackWaveElapsed } from "./loop";

const countingTimer = {
  startTime: 1,
  duration: 60_000,
  defeated: false,
  provoked: false,
  elapsedTime: 1000,
};

describe("advanceAttackWaveElapsed", () => {
  it("returns null when no timer is counting", () => {
    expect(advanceAttackWaveElapsed({}, 250)).toBeNull();
    expect(
      advanceAttackWaveElapsed(
        {
          firstWave: { ...countingTimer, defeated: true },
          [POST_COMPLETION_ATTACK_WAVE_ID]: {
            ...countingTimer,
            provoked: false,
          },
        },
        250,
      ),
    ).toBeNull();
  });

  it("advances only active timers and copies the rest", () => {
    const next = advanceAttackWaveElapsed(
      {
        firstWave: countingTimer,
        secondWave: { ...countingTimer, defeated: true, elapsedTime: 50 },
      },
      250,
    );
    expect(next?.firstWave.elapsedTime).toBe(1250);
    expect(next?.secondWave).toEqual({
      ...countingTimer,
      defeated: true,
      elapsedTime: 50,
    });
  });
});
