import { describe, expect, it } from "vitest";
import {
  cooldownActiveSetEqual,
  storeEqualsIgnoringTickClock,
} from "./useGameStoreWithoutTickClock";

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

  it("treats remaining-time-only cooldown ticks as equal", () => {
    const buildings = { woodenHut: 1 };
    const a = {
      playTime: 1000,
      buildings,
      cooldowns: { chopWood: 5, hunt: 2.5 },
      initialCooldowns: { chopWood: 5, hunt: 8 },
    };
    const b = {
      playTime: 1250,
      buildings,
      cooldowns: { chopWood: 4.75, hunt: 2.25 },
      initialCooldowns: { chopWood: 5, hunt: 8 },
    };
    expect(storeEqualsIgnoringTickClock(a, b)).toBe(true);
  });

  it("treats a cooldown completing as unequal", () => {
    const buildings = { woodenHut: 1 };
    const a = {
      playTime: 1000,
      buildings,
      cooldowns: { chopWood: 0.25 },
      initialCooldowns: { chopWood: 5 },
    };
    const b = {
      playTime: 1250,
      buildings,
      cooldowns: { chopWood: 0 },
      initialCooldowns: {},
    };
    expect(storeEqualsIgnoringTickClock(a, b)).toBe(false);
  });

  it("treats a new cooldown starting as unequal", () => {
    const buildings = { woodenHut: 1 };
    const a = {
      playTime: 1000,
      buildings,
      cooldowns: { chopWood: 4 },
      initialCooldowns: { chopWood: 5 },
    };
    const b = {
      playTime: 1000,
      buildings,
      cooldowns: { chopWood: 4, hunt: 8 },
      initialCooldowns: { chopWood: 5, hunt: 8 },
    };
    expect(storeEqualsIgnoringTickClock(a, b)).toBe(false);
  });

  it("treats a gameplay slice change as unequal", () => {
    const a = { playTime: 1000, buildings: { woodenHut: 1 } };
    const b = { playTime: 1000, buildings: { woodenHut: 2 } };
    expect(storeEqualsIgnoringTickClock(a, b)).toBe(false);
  });
});

describe("cooldownActiveSetEqual", () => {
  it("treats the same cooling actions as equal", () => {
    expect(
      cooldownActiveSetEqual({ chopWood: 5 }, { chopWood: 4.75 }),
    ).toBe(true);
  });

  it("treats a finished cooldown as unequal", () => {
    expect(cooldownActiveSetEqual({ chopWood: 0.25 }, { chopWood: 0 })).toBe(
      false,
    );
  });
});
