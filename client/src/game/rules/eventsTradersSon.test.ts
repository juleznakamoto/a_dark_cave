import { describe, it, expect } from "vitest";
import { EventManager } from "./events";
import { GameState } from "@shared/schema";
import { tradersSonEvents } from "./eventsTradersSon";

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
    tradersSonGratitudeState: { accepted: false },
    triggeredEvents: {},
    ...overrides,
  } as GameState;
}

describe("Trader's Son intro (traders_son)", () => {
  it("is eligible when forest is unlocked, dialog gates are met, and the trader's daughter search party was not sent", () => {
    const state = createMinimalState({
      flags: { forestUnlocked: true },
      traderDialogOpens: 10,
    });
    expect(tradersSonEvents.traders_son.condition!(state)).toBe(true);
  });

  it("is not eligible if the trader's daughter was helped (search party already sent)", () => {
    const state = createMinimalState({
      flags: { forestUnlocked: true },
      traderDialogOpens: 10,
      triggeredEvents: { traders_daughter_helped: true },
    });
    expect(tradersSonEvents.traders_son.condition!(state)).toBe(false);
  });
});

describe("Trader's Son Gratitude Event", () => {
  describe("accept_traders_son_gratitude", () => {
    it("should set tradersSonGratitudeState.accepted to true", () => {
      const state = createMinimalState();
      const changes = EventManager.applyEventChoice(
        state,
        "accept_traders_son_gratitude",
        "traders_son_gratitude",
      );

      expect(changes.tradersSonGratitudeState).toEqual({ accepted: true });
    });
  });

  describe("decline_traders_son_gratitude", () => {
    it("should set tradersSonGratitudeState.accepted to false when declining", () => {
      const state = createMinimalState();
      const changes = EventManager.applyEventChoice(
        state,
        "decline_traders_son_gratitude",
        "traders_son_gratitude",
      );

      expect(changes.tradersSonGratitudeState).toEqual({ accepted: false });
      expect(changes.triggeredEvents?.traders_son_gratitude_used).toBe(true);
    });
  });
});
