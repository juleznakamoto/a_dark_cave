import { describe, it, expect } from "vitest";
import type { GameState } from "@shared/schema";
import { createInitialState } from "@/game/state";
import {
  GAMBLER_EVENT_SEEN_KEY,
  hasGamblerAppearedOnce,
} from "@/game/gamblerSession";

function stateWith(overrides: Partial<GameState>): GameState {
  return { ...createInitialState(), ...overrides };
}

describe("hasGamblerAppearedOnce", () => {
  it("is false before the gambler event has appeared", () => {
    const state = stateWith({
      eventCooldowns: { gambler: Date.now() },
      story: { seen: {}, merchantPurchases: 0 },
    });
    expect(hasGamblerAppearedOnce(state)).toBe(false);
  });

  it("is true when the gambler timed tab has appeared without playing a round", () => {
    const state = stateWith({
      story: {
        seen: { [GAMBLER_EVENT_SEEN_KEY]: true },
        merchantPurchases: 0,
      },
    });
    expect(hasGamblerAppearedOnce(state)).toBe(true);
  });
});
