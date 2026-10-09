import { describe, expect, it } from "vitest";
import { gameStateSchema } from "@shared/schema";
import { EventManager, gameEvents } from "./events";
import { CARTOGRAPHER_SILVER_COST } from "./eventsCartographer";

function baseState(overrides: Record<string, unknown> = {}) {
  return gameStateSchema.parse({
    buildings: { woodenHut: 1 },
    flags: { forestUnlocked: true, mapUnlocked: false },
    ...overrides,
  });
}

function minutesUntil(state: ReturnType<typeof baseState>): number {
  const event = gameEvents.cartographer!;
  const probability = event.timeProbability;
  return typeof probability === "function" ? probability(state) : probability ?? 0;
}

describe("cartographer", () => {
  const event = gameEvents.cartographer!;

  it("asks for silver, and returns on a slower timer after a refusal", () => {
    expect(event.id).toBe("cartographer");
    expect(event.showAsTimedTab).toBeFalsy();
    expect(event.repeatable).toBe(true);
    expect(event.cooldownPercent).toBe(0.6);
    expect(minutesUntil(baseState())).toBe(15);
    expect(
      minutesUntil(
        baseState({ story: { seen: { cartographerDeclined: true } } }),
      ),
    ).toBe(30);
    expect(event.choices).toHaveLength(2);
    const choices = Array.isArray(event.choices) ? event.choices : [];
    expect(choices[0]?.id).toBe("accept");
    expect(choices[0]?.cost).toBe(`${CARTOGRAPHER_SILVER_COST} silver`);
    expect(choices[1]?.id).toBe("refuse");
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
    expect(
      event.condition(
        baseState({ story: { seen: { cartographerAccepted: true } } }),
      ),
    ).toBe(false);
  });

  it("accept spends 50 silver, unlocks the map, and records the visit", () => {
    const result = EventManager.applyEventChoice(
      baseState({ resources: { silver: 80 } }),
      "accept",
      "cartographer",
    );
    expect(result.resources?.silver).toBe(30);
    expect(result.flags?.mapUnlocked).toBe(true);
    expect(result.story?.seen?.cartographerAccepted).toBe(true);
    expect(result.triggeredEvents?.cartographer).toBe(true);
    expect(result._logMessageKey).toBe("outcome0");
  });

  it("refuses the payment when the player cannot afford it", () => {
    const result = EventManager.applyEventChoice(
      baseState({ resources: { silver: CARTOGRAPHER_SILVER_COST - 1 } }),
      "accept",
      "cartographer",
    );
    expect(result._choiceRejected).toBe(true);
    expect(result.flags?.mapUnlocked).toBeUndefined();
  });

  it("comes back after a refusal until the player pays", () => {
    const turnedAway = EventManager.applyEventChoice(
      baseState({ resources: { silver: 10 } }),
      "refuse",
      "cartographer",
    );
    expect(turnedAway._logMessageKey).toBe("outcome1");
    expect(turnedAway.story?.seen?.cartographerDeclined).toBe(true);
    expect(turnedAway.story?.seen?.cartographerAccepted).toBeUndefined();
    expect(turnedAway.triggeredEvents?.cartographer).toBeUndefined();
    expect(turnedAway.flags?.mapUnlocked).not.toBe(true);
    expect(turnedAway.resources).toBeUndefined();

    const waiting = baseState({
      resources: { silver: 10 },
      story: turnedAway.story,
    });
    expect(event.condition(waiting)).toBe(true);
    expect(minutesUntil(waiting)).toBe(30);

    const paid = EventManager.applyEventChoice(
      baseState({
        resources: { silver: CARTOGRAPHER_SILVER_COST },
        story: turnedAway.story,
      }),
      "accept",
      "cartographer",
    );
    expect(paid.resources?.silver).toBe(0);
    expect(paid.flags?.mapUnlocked).toBe(true);
    expect(
      event.condition(
        baseState({
          flags: { forestUnlocked: true, mapUnlocked: true },
          story: paid.story,
          triggeredEvents: paid.triggeredEvents,
        }),
      ),
    ).toBe(false);
  });
});
