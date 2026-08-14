import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { gameStateSchema } from "@shared/schema";
import {
  choiceEvents,
  getAbandonedCartSuccessChance,
} from "./eventsChoices";
import type { EventChoice } from "./eventTypes";

function baseState(overrides: Record<string, unknown> = {}) {
  return gameStateSchema.parse({
    buildings: { woodenHut: 3, supplyHut: 1 },
    villagers: { free: 5 },
    resources: { food: 500 },
    stats: { villagerDeathsLifetime: 0 },
    cruelMode: false,
    ...overrides,
  });
}

function takeFoodChoice(): EventChoice {
  const choices = choiceEvents.abandonedCart.choices;
  if (!Array.isArray(choices)) {
    throw new Error("abandonedCart choices should be an array");
  }
  const choice = choices.find((c) => c.id === "takeFood");
  if (!choice) {
    throw new Error("takeFood choice missing");
  }
  return choice;
}

function leaveCartChoice(): EventChoice {
  const choices = choiceEvents.abandonedCart.choices;
  if (!Array.isArray(choices)) {
    throw new Error("abandonedCart choices should be an array");
  }
  const choice = choices.find((c) => c.id === "leaveCart");
  if (!choice) {
    throw new Error("leaveCart choice missing");
  }
  return choice;
}

describe("abandonedCart", () => {
  const event = choiceEvents.abandonedCart;

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("is a blocking dialog event with a 10-minute average interval", () => {
    expect(event.showAsTimedTab).toBeFalsy();
    expect(event.timeProbability).toBe(10);
    expect(event.repeatable).toBe(false);
  });

  it("triggers at 5 villagers, 3 wooden huts, cap 1000, and 500 food", () => {
    expect(event.condition(baseState())).toBe(true);
  });

  it("does not trigger without enough villagers, huts, storage, or when food is high", () => {
    expect(event.condition(baseState({ villagers: { free: 4 } }))).toBe(false);
    expect(event.condition(baseState({ buildings: { woodenHut: 2, supplyHut: 1 } }))).toBe(
      false,
    );
    expect(event.condition(baseState({ buildings: { woodenHut: 3 } }))).toBe(
      false,
    );
    expect(event.condition(baseState({ resources: { food: 501 } }))).toBe(
      false,
    );
  });

  it("uses 50% + 4% luck in normal mode", () => {
    expect(getAbandonedCartSuccessChance(baseState())).toBe(0.5);
  });

  it("applies the default cruel-mode penalty", () => {
    expect(getAbandonedCartSuccessChance(baseState({ cruelMode: true }))).toBe(
      0.4,
    );
  });

  describe("takeFood", () => {
    beforeEach(() => {
      vi.spyOn(Math, "random").mockReturnValue(0);
    });

    it("grants 500 food on success", () => {
      const result = takeFoodChoice().effect(
        baseState({ resources: { food: 200 } }),
      );
      expect(result.resources?.food).toBe(700);
      expect(result._logMessageKey).toBe("outcome0");
      expect(result.villagers).toBeUndefined();
    });

    it("kills two villagers on failure", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.99);
      const result = takeFoodChoice().effect(baseState());
      expect(result.villagers?.free).toBe(3);
      expect(result.villagersKilled).toBe(2);
      expect(result.stats?.villagerDeathsLifetime).toBe(2);
      expect(result._logMessageKey).toBe("outcome1");
      expect(result.resources).toBeUndefined();
    });
  });

  it("leaveCart changes nothing", () => {
    const result = leaveCartChoice().effect(baseState());
    expect(result._logMessageKey).toBe("outcome2");
    expect(result.resources).toBeUndefined();
    expect(result.villagers).toBeUndefined();
  });
});
