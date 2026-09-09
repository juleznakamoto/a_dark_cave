import { describe, expect, it } from "vitest";
import { CRUEL_MODE } from "../cruelMode";
import { bloodMoonEvents } from "./eventsBloodMoon";

describe("bloodMoonAttack", () => {
  const moon = bloodMoonEvents.bloodMoonAttack;

  function state(overrides: {
    woodenHut?: number;
    hasWon?: boolean;
    occurrenceCount?: number;
    free?: number;
    cruelMode?: boolean;
  }) {
    return {
      buildings: { woodenHut: overrides.woodenHut ?? 8 },
      bloodMoonState: {
        hasWon: overrides.hasWon ?? false,
        occurrenceCount: overrides.occurrenceCount ?? 0,
      },
      villagers: { free: overrides.free ?? 0 },
      cruelMode: overrides.cruelMode ?? false,
    } as never;
  }

  it("unlocks the first moon at 8 wooden huts with no population floor", () => {
    expect(moon.condition(state({ woodenHut: 8, free: 0 }))).toBe(true);
    expect(moon.condition(state({ woodenHut: 7, free: 30 }))).toBe(false);
  });

  it("stops after a win", () => {
    expect(
      moon.condition(state({ occurrenceCount: 0, hasWon: true, free: 30 })),
    ).toBe(false);
  });

  it("requires more than 20 villagers for a subsequent moon", () => {
    const minPop = CRUEL_MODE.bloodMoon.subsequentMinPopulation.normal;
    expect(
      moon.condition(state({ occurrenceCount: 1, free: minPop })),
    ).toBe(false);
    expect(
      moon.condition(state({ occurrenceCount: 1, free: minPop + 1 })),
    ).toBe(true);
  });

  it("requires more than 15 villagers for a subsequent moon in cruel mode", () => {
    const minPop = CRUEL_MODE.bloodMoon.subsequentMinPopulation.cruel;
    expect(
      moon.condition(state({ occurrenceCount: 1, free: minPop, cruelMode: true })),
    ).toBe(false);
    expect(
      moon.condition(
        state({ occurrenceCount: 1, free: minPop + 1, cruelMode: true }),
      ),
    ).toBe(true);
  });

  it("uses 45 then 75 minute cadence and 0.6 cooldown", () => {
    expect(moon.timeProbability(state({ occurrenceCount: 0 }))).toBe(45);
    expect(moon.timeProbability(state({ occurrenceCount: 1 }))).toBe(75);
    expect(moon.cooldownPercent).toBe(0.6);
  });
});
