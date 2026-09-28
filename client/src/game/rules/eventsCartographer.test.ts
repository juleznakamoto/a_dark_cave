import { describe, expect, it } from "vitest";
import { gameStateSchema } from "@shared/schema";
import { EventManager, gameEvents } from "./events";

function baseState(overrides: Record<string, unknown> = {}) {
  return gameStateSchema.parse({
    buildings: { woodenHut: 1 },
    flags: { forestUnlocked: true, mapUnlocked: false },
    ...overrides,
  });
}

describe("cartographer", () => {
  const event = gameEvents.cartographer!;

  it("is a dialog event with one Accept choice, not a timed tab", () => {
    expect(event.id).toBe("cartographer");
    expect(event.showAsTimedTab).toBeFalsy();
    expect(event.timeProbability).toBe(15);
    expect(event.repeatable).toBe(false);
    expect(event.choices).toHaveLength(1);
    expect(Array.isArray(event.choices) && event.choices[0]?.id).toBe("accept");
  });

  it("waits until a wooden hut stands and the forest is unlocked", () => {
    expect(event.condition(baseState())).toBe(true);
    expect(event.condition(baseState({ buildings: { woodenHut: 0 } }))).toBe(
      false,
    );
    expect(
      event.condition(baseState({ flags: { forestUnlocked: false } })),
    ).toBe(false);
  });

  it("does not return after the map is unlocked or the visit was accepted", () => {
    expect(
      event.condition(baseState({ flags: { forestUnlocked: true, mapUnlocked: true } })),
    ).toBe(false);
    expect(
      event.condition(baseState({ triggeredEvents: { cartographer: true } })),
    ).toBe(false);
  });

  it("accept unlocks the map tab and records the visit", () => {
    const result = EventManager.applyEventChoice(
      baseState(),
      "accept",
      "cartographer",
    );
    expect(result.flags?.mapUnlocked).toBe(true);
    expect(result.story?.seen?.cartographerAccepted).toBe(true);
    expect(result.triggeredEvents?.cartographer).toBe(true);
    expect(result._logMessageKey).toBe("outcome0");
  });
});
