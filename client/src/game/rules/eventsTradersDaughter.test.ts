import { describe, it, expect, beforeEach } from "vitest";
import { EventManager } from "./events";
import { GameState } from "@shared/schema";

function createMinimalState(overrides: Partial<GameState> = {}): GameState {
  return {
    resources: {},
    buildings: {},
    flags: {},
    villagers: { free: 0, gatherer: 0, hunter: 0 },
    events: {},
    log: [],
    story: { seen: {} },
    relics: {},
    weapons: {},
    tools: {},
    clothing: {},
    blessings: {},
    fellowship: {},
    schematics: {},
    books: {},
    feastState: { isActive: false, endTime: 0, lastAcceptedLevel: 0 },
    greatFeastState: { isActive: false, endTime: 0 },
    boneDevourerState: { lastAcceptedLevel: 0 },
    tradersGratitudeState: { accepted: false },
    triggeredEvents: {},
    ...overrides,
  } as GameState;
}

describe("Traders Gratitude Event", () => {
  describe("accept_traders_gratitude", () => {
    it("should set tradersGratitudeState.accepted to true", () => {
      const state = createMinimalState();
      const changes = EventManager.applyEventChoice(
        state,
        "accept_traders_gratitude",
        "traders_gratitude",
      );

      expect(changes.tradersGratitudeState).toEqual({ accepted: true });
    });
  });

  describe("decline_traders_gratitude", () => {
    it("should set tradersGratitudeState.accepted to false when declining", () => {
      const state = createMinimalState();
      const changes = EventManager.applyEventChoice(
        state,
        "decline_traders_gratitude",
        "traders_gratitude",
      );

      expect(changes.tradersGratitudeState).toEqual({ accepted: false });
      expect(changes.triggeredEvents?.traders_gratitude_used).toBe(true);
    });

    it("should clear discount when declining after having accepted", () => {
      // Simulate: user accepted first (opened shop), then declined to dismiss the event
      const state = createMinimalState({
        tradersGratitudeState: { accepted: true },
        triggeredEvents: {},
      });

      const changes = EventManager.applyEventChoice(
        state,
        "decline_traders_gratitude",
        "traders_gratitude",
      );

      expect(changes.tradersGratitudeState).toEqual({ accepted: false });
      expect(changes.triggeredEvents?.traders_gratitude_used).toBe(true);
    });
  });

  describe("fallback choice (timer expiry)", () => {
    it("should clear discount when fallback is applied (same choice id as decline)", () => {
      // When the timer expires, the fallback choice (decline_traders_gratitude) is applied.
      // It uses the same choice id, so EventManager applies the same effect.
      const state = createMinimalState({
        tradersGratitudeState: { accepted: true },
      });

      const changes = EventManager.applyEventChoice(
        state,
        "decline_traders_gratitude",
        "traders_gratitude",
      );

      expect(changes.tradersGratitudeState).toEqual({ accepted: false });
      expect(changes.triggeredEvents?.traders_gratitude_used).toBe(true);
    });
  });
});
