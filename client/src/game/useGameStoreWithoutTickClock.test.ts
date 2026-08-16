import { describe, expect, it } from "vitest";
import { storeEqualsIgnoringTickClock } from "./useGameStoreWithoutTickClock";

describe("storeEqualsIgnoringTickClock", () => {
  it("treats tick-clock-only changes as equal", () => {
    const action = () => { };
    const buildings = { woodenHut: 1 };
    const a = {
      playTime: 1000,
      lifetimePlayTimeMs: 1000,
      loopProgress: 10,
      attackWaveTimers: { wave1: { elapsedTime: 1 } },
      buildings,
      executeAction: action,
    };
    const b = {
      playTime: 1250,
      lifetimePlayTimeMs: 1250,
      loopProgress: 12,
      attackWaveTimers: { wave1: { elapsedTime: 251 } },
      buildings,
      executeAction: action,
    };
    expect(storeEqualsIgnoringTickClock(a, b)).toBe(true);
  });

  it("treats a gameplay slice change as unequal", () => {
    const a = { playTime: 1000, buildings: { woodenHut: 1 } };
    const b = { playTime: 1000, buildings: { woodenHut: 2 } };
    expect(storeEqualsIgnoringTickClock(a, b)).toBe(false);
  });
});
