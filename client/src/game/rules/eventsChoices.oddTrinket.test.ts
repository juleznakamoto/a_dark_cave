import { describe, expect, it } from "vitest";
import { gameStateSchema, type GameState } from "@shared/schema";
import { choiceEvents } from "./eventsChoices";

function state(overrides: Record<string, unknown> = {}): GameState {
  return gameStateSchema.parse({
    buildings: { woodenHut: 4 },
    weapons: { crude_bow: true },
    ...overrides,
  });
}

describe("oddTrinket", () => {
  const event = choiceEvents.oddTrinket;

  it("opens at 4 wooden huts once you have the crude bow, and stays open after that", () => {
    expect(event.condition(state())).toBe(true);
    expect(event.condition(state({ buildings: { woodenHut: 8 } }))).toBe(true);
    expect(event.condition(state({ buildings: { woodenHut: 3 } }))).toBe(false);
    expect(event.condition(state({ weapons: { crude_bow: false } }))).toBe(false);
    expect(
      event.condition(state({ relics: { odd_trinket: true } })),
    ).toBe(false);
  });
});
