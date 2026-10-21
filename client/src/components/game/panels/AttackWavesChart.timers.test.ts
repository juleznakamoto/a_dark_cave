import { describe, expect, it } from "vitest";
import { selectAttackWaveTimersForChart } from "./AttackWavesChart";

const liveTimers = {
  firstWave: {
    startTime: 1,
    duration: 60_000,
    defeated: false,
    provoked: false,
    elapsedTime: 10,
  },
};

describe("selectAttackWaveTimersForChart", () => {
  it("returns the same empty object for every hidden call so Zustand can skip", () => {
    const a = selectAttackWaveTimersForChart(false, liveTimers);
    const b = selectAttackWaveTimersForChart(false, {
      firstWave: { ...liveTimers.firstWave, elapsedTime: 999 },
    });
    expect(a).toBe(b);
    expect(a).toEqual({});
  });

  it("returns the live timer map when visible", () => {
    expect(selectAttackWaveTimersForChart(true, liveTimers)).toBe(liveTimers);
  });
});
