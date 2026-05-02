import { describe, it, expect } from "vitest";
import { EventManager } from "./events";
import type { GameState } from "@shared/schema";
import { loreEvents } from "./eventsLore";

function createMinimalState(overrides: Partial<GameState> = {}): GameState {
  return {
    resources: {},
    buildings: {},
    flags: {},
    villagers: {
      free: 0,
      gatherer: 0,
      hunter: 0,
      iron_miner: 0,
      coal_miner: 0,
      steel_forger: 0,
      blacksteel_forger: 0,
      sulfur_miner: 0,
      obsidian_miner: 0,
      adamant_miner: 0,
      moonstone_miner: 0,
      tanner: 0,
      powder_maker: 0,
      ashfire_dust_maker: 0,
    },
    events: {},
    log: [],
    story: { seen: {}, merchantPurchases: 0 },
    relics: {},
    weapons: {},
    tools: {},
    clothing: {},
    blessings: {},
    fellowship: {},
    schematics: {},
    books: {},
    stats: {
      strength: 0,
      knowledge: 0,
      luck: 0,
      madness: 0,
      madnessFromEvents: 0,
      villagerDeathsLifetime: 0,
    },
    cruelMode: false,
    feastState: { isActive: false, endTime: 0, lastAcceptedLevel: 0 },
    greatFeastState: { isActive: false, endTime: 0 },
    boneDevourerState: { lastAcceptedLevel: 0 },
    triggeredEvents: {},
    ...overrides,
  } as GameState;
}

describe("restlessKnightBurden", () => {
  const event = loreEvents.restlessKnightBurden;

  it("is not eligible when cruel mode is off", () => {
    const state = createMinimalState({
      cruelMode: false,
      fellowship: { restless_knight: true },
    });
    expect(event.condition!(state)).toBe(false);
  });

  it("is not eligible when the knight is not in the fellowship", () => {
    const state = createMinimalState({
      cruelMode: true,
      fellowship: {},
    });
    expect(event.condition!(state)).toBe(false);
  });

  it("is eligible in cruel mode with restless knight in fellowship", () => {
    const state = createMinimalState({
      cruelMode: true,
      fellowship: { restless_knight: true },
    });
    expect(event.condition!(state)).toBe(true);
  });

  it("accept grants knights_burden and does not change madnessFromEvents", () => {
    const state = createMinimalState({
      stats: {
        strength: 0,
        knowledge: 0,
        luck: 0,
        madness: 0,
        madnessFromEvents: 3,
        villagerDeathsLifetime: 0,
      },
    });
    const changes = EventManager.applyEventChoice(
      state,
      "accept",
      "restlessKnightBurden",
    );

    expect(changes.blessings?.knights_burden).toBe(true);
    expect(changes.stats?.madnessFromEvents).toBeUndefined();
  });

  it("decline applies -1 madnessFromEvents", () => {
    const state = createMinimalState({
      stats: {
        strength: 0,
        knowledge: 0,
        luck: 0,
        madness: 0,
        madnessFromEvents: 5,
        villagerDeathsLifetime: 0,
      },
    });
    const changes = EventManager.applyEventChoice(
      state,
      "decline",
      "restlessKnightBurden",
    );

    expect(changes.stats?.madnessFromEvents).toBe(4);
  });
});
