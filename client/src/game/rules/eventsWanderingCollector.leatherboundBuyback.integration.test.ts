import { describe, expect, it } from "vitest";
import { createInitialState } from "@/game/state";
import type { GameState } from "@shared/schema";
import { EventManager } from "./events";
import {
  COLLECTOR_MAX_VISITS,
  LEATHERBOUND_BOOK_BUY_CHOICE_ID,
  LEATHERBOUND_BOOK_RESELL_GOLD,
  shouldOfferLeatherboundBookResell,
  wanderingCollectorEvents,
} from "./eventsWanderingCollector";

function stateWith(overrides: Partial<GameState> = {}): GameState {
  const initial = createInitialState() as GameState;
  return {
    ...initial,
    ...overrides,
    buildings: { ...initial.buildings, ...(overrides.buildings || {}) },
    resources: { ...initial.resources, ...(overrides.resources || {}) },
    books: { ...initial.books, ...(overrides.books || {}) },
    events: { ...initial.events, ...(overrides.events || {}) },
    stats: { ...initial.stats, ...(overrides.stats || {}) },
    story: {
      ...initial.story,
      ...(overrides.story || {}),
      seen: {
        ...initial.story.seen,
        ...(overrides.story?.seen || {}),
      },
    },
  };
}

describe("leatherbound buyback integration", () => {
  const event = wanderingCollectorEvents.wandering_collector;

  it("EventManager.applyEventChoice unlocks Chainmaster when buying the book", () => {
    const before = stateWith({
      buildings: { woodenHut: 6 } as GameState["buildings"],
      resources: { gold: 2000 } as GameState["resources"],
      stats: { madnessFromEvents: 0 } as GameState["stats"],
      story: {
        seen: {
          leatherboundBookSoldToCollector: true,
          collectorVisitCount: 0,
        },
        merchantPurchases: 0,
        heavySleeperHours: 0,
      },
    });

    expect(shouldOfferLeatherboundBookResell(before)).toBe(true);
    expect(event.condition(before)).toBe(true);

    const changes = EventManager.applyEventChoice(
      before,
      LEATHERBOUND_BOOK_BUY_CHOICE_ID,
      "wandering_collector",
    );

    expect(changes.books?.book_of_chainmaster).toBe(true);
    expect(changes.chainmasterSkills?.level).toBe(0);
    expect(changes.stats?.madnessFromEvents).toBe(2);
    expect(changes.resources?.gold).toBe(2000 - LEATHERBOUND_BOOK_RESELL_GOLD);
    expect(changes.story?.seen?.leatherboundBookSoldToCollector).toBe(false);
  });

  it("after story ending, collector condition stays true past the visit cap until buyback", () => {
    const awaiting = stateWith({
      buildings: { woodenHut: 10, stoneHut: 10 } as GameState["buildings"],
      events: { cube15b: true } as GameState["events"],
      story: {
        seen: {
          leatherboundBookSoldToCollector: true,
          collectorVisitCount: COLLECTOR_MAX_VISITS + 3,
          fourthWaveVictory: true,
          eighthWaveVictory: true,
        },
        merchantPurchases: 0,
        heavySleeperHours: 0,
      },
    });

    expect(event.condition(awaiting)).toBe(true);
    expect(shouldOfferLeatherboundBookResell(awaiting)).toBe(true);

    const choices =
      typeof event.choices === "function" ? event.choices(awaiting) : [];
    expect(choices.some((c) => c.id === LEATHERBOUND_BOOK_BUY_CHOICE_ID)).toBe(
      true,
    );

    const afterBuy = EventManager.applyEventChoice(
      { ...awaiting, resources: { ...awaiting.resources, gold: 5000 } },
      LEATHERBOUND_BOOK_BUY_CHOICE_ID,
      "wandering_collector",
    );

    // Mirror mergeStateUpdates seen spread used by the live store.
    const merged: GameState = {
      ...awaiting,
      ...afterBuy,
      books: { ...awaiting.books, ...afterBuy.books },
      story: {
        ...awaiting.story,
        ...afterBuy.story,
        seen: {
          ...awaiting.story.seen,
          ...(afterBuy.story?.seen || {}),
        },
      },
    };
    expect(merged.story.seen.leatherboundBookSoldToCollector).toBe(false);
    expect(merged.books.book_of_chainmaster).toBe(true);
    expect(event.condition(merged)).toBe(false);
  });
});
