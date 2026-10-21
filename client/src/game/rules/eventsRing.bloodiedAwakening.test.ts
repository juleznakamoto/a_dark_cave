import { describe, expect, it } from "vitest";
import { gameStateSchema } from "@shared/schema";
import type { EventChoice } from "./eventTypes";
import { ringEvents } from "./eventsRing";

function baseState(overrides: Record<string, unknown> = {}) {
  return gameStateSchema.parse({
    villagers: { free: 40 },
    cruelMode: false,
    ...overrides,
  });
}

function investigateMurders(): EventChoice {
  const choices = ringEvents.bloodiedAwakening.choices;
  if (!Array.isArray(choices)) {
    throw new Error("bloodiedAwakening choices should be an array");
  }
  const choice = choices.find((c) => c.id === "investigateMurders");
  if (!choice) {
    throw new Error("investigateMurders choice missing");
  }
  return choice;
}

describe("bloodiedAwakening investigateMurders", () => {
  it("names the villagers who actually flee", () => {
    const result = investigateMurders().effect(baseState());
    expect(result.villagers?.free).toBe(28);
    expect(result._logMessageVars).toEqual({ deaths: 12 });
  });

  it("names the larger cruel-mode loss", () => {
    const result = investigateMurders().effect(
      baseState({ cruelMode: true }),
    );
    expect(result.villagers?.free).toBe(20);
    expect(result._logMessageVars).toEqual({ deaths: 20 });
  });

  it("does not claim more fled than were present", () => {
    const result = investigateMurders().effect(
      baseState({ villagers: { free: 5 } }),
    );
    expect(result.villagers?.free).toBe(0);
    expect(result._logMessageVars).toEqual({ deaths: 5 });
  });
});
