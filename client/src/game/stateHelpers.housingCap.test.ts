import { describe, expect, it } from "vitest";
import type { GameState } from "@shared/schema";
import {
  applyGameStateLoadMigrations,
  clampVillagersToHousingCap,
  reconcileInFlightExecutionsOnLoad,
} from "./stateHelpers";
import { getCurrentPopulation, getMaxPopulation } from "./population";

const NOW = 1_700_000_000_000;

function housingState(
  overrides: Partial<GameState> & {
    villagers?: Partial<GameState["villagers"]>;
    buildings?: Partial<GameState["buildings"]>;
  } = {},
): GameState {
  return {
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
      scholar: 0,
      ...overrides.villagers,
    },
    buildings: {
      woodenHut: 0,
      stoneHut: 0,
      longhouse: 0,
      furTents: 0,
      blackEstate: 0,
      ...overrides.buildings,
    },
    blessings: {},
    expeditionVillagers: {},
    executionStartTimes: {},
    executionDurations: {},
    story: { seen: {}, merchantPurchases: 0, heavySleeperHours: 0 },
    stats: {},
    resources: {},
    ...overrides,
  } as GameState;
}

describe("clampVillagersToHousingCap", () => {
  it("returns null when population fits housing", () => {
    const state = housingState({
      villagers: { free: 2, gatherer: 2 },
      buildings: { woodenHut: 3 }, // max 6
    });
    expect(clampVillagersToHousingCap(state)).toBeNull();
  });

  it("removes excess from free first", () => {
    const state = housingState({
      villagers: { free: 10, gatherer: 2 },
      buildings: { woodenHut: 3 }, // max 6
    });
    const patch = clampVillagersToHousingCap(state);
    expect(patch?.villagers?.free).toBe(4);
    expect(patch?.villagers?.gatherer).toBe(2);
    expect(getCurrentPopulation({ ...state, ...patch })).toBe(6);
  });

  it("cuts assigned jobs in stable order after free is exhausted", () => {
    const state = housingState({
      villagers: { free: 0, adamant_miner: 3, gatherer: 5, hunter: 4 },
      buildings: { woodenHut: 3 }, // max 6
    });
    const patch = clampVillagersToHousingCap(state);
    // Remove 6 excess: adamant_miner (3) then gatherer (3) — alphabetical
    expect(patch?.villagers?.adamant_miner).toBe(0);
    expect(patch?.villagers?.gatherer).toBe(2);
    expect(patch?.villagers?.hunter).toBe(4);
    expect(getCurrentPopulation({ ...state, ...patch })).toBe(6);
  });

  it("keeps active expedition villagers and only trims the village pool", () => {
    const state = housingState({
      villagers: { free: 8, gatherer: 0 },
      buildings: { woodenHut: 2 }, // max 4
      expeditionVillagers: { exploreCave: 2 },
      executionStartTimes: { exploreCave: NOW - 1000 },
      executionDurations: { exploreCave: 60 },
    });
    const patch = clampVillagersToHousingCap(state, NOW);
    // max 4, 2 on expedition → in-village room 2
    expect(patch?.villagers?.free).toBe(2);
    expect(getCurrentPopulation({ ...state, ...patch }, NOW)).toBe(4);
    expect(getMaxPopulation({ ...state, ...patch } as GameState)).toBe(4);
  });

  it("does not increment villager death stats", () => {
    const state = housingState({
      villagers: { free: 20 },
      buildings: { woodenHut: 1 },
      stats: { villagerDeathsLifetime: 7 },
    });
    const patch = clampVillagersToHousingCap(state);
    expect(patch?.stats).toBeUndefined();
    expect(patch?.villagers?.free).toBe(2);
  });
});

describe("applyGameStateLoadMigrations housing clamp", () => {
  it("clamps over-cap villagers on load after expedition reconcile", () => {
    const state = housingState({
      villagers: { free: 50, gatherer: 10 },
      buildings: { woodenHut: 3 }, // max 6
      boostApplied: true,
    });
    const migrated = applyGameStateLoadMigrations(state);
    expect(getCurrentPopulation(migrated)).toBe(6);
    expect(getCurrentPopulation(migrated)).toBeLessThanOrEqual(
      getMaxPopulation(migrated),
    );
  });
});

describe("reconcileInFlightExecutionsOnLoad ghost expedition", () => {
  it("does not refund stranded expedition locks when village is already at cap", () => {
    const state = housingState({
      villagers: { free: 0, gatherer: 12 },
      buildings: { woodenHut: 6 }, // max 12
      expeditionVillagers: { exploreCave: 4 },
    });
    const reconciled = reconcileInFlightExecutionsOnLoad(state, NOW);
    expect(reconciled.expeditionVillagers).toEqual({});
    expect(reconciled.villagers?.free).toBe(0);
    expect(reconciled.villagers?.gatherer).toBe(12);
  });

  it("refunds stranded expedition villagers when there is housing room", () => {
    const state = housingState({
      villagers: { free: 2, gatherer: 0 },
      buildings: { woodenHut: 6 }, // max 12
      executionStartTimes: { staleExpedition: NOW - 1000 },
      executionDurations: { staleExpedition: 60 },
      expeditionVillagers: { staleExpedition: 2, exploreCave: 1 },
    });
    const reconciled = reconcileInFlightExecutionsOnLoad(state, NOW);
    expect(reconciled.expeditionVillagers).toEqual({});
    expect(reconciled.villagers?.free).toBe(5);
  });
});
