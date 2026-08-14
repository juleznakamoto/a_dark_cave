import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { gameStateSchema } from "@shared/schema";
import { getDeerHerdSuccessChance, huntEvents } from "./eventsHunt";
import type { EventChoice } from "./eventTypes";

function baseState(overrides: Record<string, unknown> = {}) {
  return gameStateSchema.parse({
    buildings: { woodenHut: 2 },
    villagers: { hunter: 2 },
    resources: { food: 250 },
    stats: { villagerDeathsLifetime: 0 },
    cruelMode: false,
    ...overrides,
  });
}

function sendChoice(): EventChoice {
  const choices = huntEvents.deerHerd.choices;
  if (!Array.isArray(choices)) {
    throw new Error("deerHerd choices should be an array");
  }
  const choice = choices.find((c) => c.id === "sendThem");
  if (!choice) {
    throw new Error("sendThem choice missing");
  }
  return choice;
}

describe("deerHerd", () => {
  const event = huntEvents.deerHerd;

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("is a blocking dialog event, not a timed tab", () => {
    expect(event.showAsTimedTab).toBeFalsy();
    expect(event.timeProbability).toBe(5);
    expect(event.repeatable).toBe(true);
  });

  it("triggers at 250 food with 2 hunters and 2 wooden huts", () => {
    expect(event.condition(baseState())).toBe(true);
  });

  it("does not trigger above 250 food, or without hunters or huts", () => {
    expect(event.condition(baseState({ resources: { food: 251 } }))).toBe(
      false,
    );
    expect(event.condition(baseState({ villagers: { hunter: 1 } }))).toBe(
      false,
    );
    expect(event.condition(baseState({ buildings: { woodenHut: 1 } }))).toBe(
      false,
    );
  });

  it("uses 50% + 2% strength + 4% luck in normal mode", () => {
    expect(getDeerHerdSuccessChance(baseState())).toBe(0.5);
  });

  it("uses 40% + 2% strength and ignores luck in cruel mode", () => {
    expect(
      getDeerHerdSuccessChance(baseState({ cruelMode: true })),
    ).toBe(0.4);
  });

  describe("sendThem", () => {
    beforeEach(() => {
      vi.spyOn(Math, "random").mockReturnValue(0);
    });

    it("grants 250 food on success", () => {
      const result = sendChoice().effect(baseState({ resources: { food: 200 } }));
      expect(result.resources?.food).toBe(450);
      expect(result._logMessageKey).toBe("outcome0");
      expect(result.villagers).toBeUndefined();
    });

    it("kills one hunter on failure", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.99);
      const result = sendChoice().effect(baseState());
      expect(result.villagers?.hunter).toBe(1);
      expect(result.villagersKilled).toBe(1);
      expect(result.stats?.villagerDeathsLifetime).toBe(1);
      expect(result._logMessageKey).toBe("outcome1");
      expect(result.resources).toBeUndefined();
    });
  });

  it("keepThemHere changes nothing", () => {
    const choices = huntEvents.deerHerd.choices;
    if (!Array.isArray(choices)) {
      throw new Error("deerHerd choices should be an array");
    }
    const result = choices.find((c) => c.id === "keepThemHere")!.effect(
      baseState(),
    );
    expect(result._logMessageKey).toBe("outcome2");
    expect(result.resources).toBeUndefined();
    expect(result.villagers).toBeUndefined();
  });
});
