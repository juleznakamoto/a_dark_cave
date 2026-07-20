import { describe, expect, it } from "vitest";
import type { GameState } from "@shared/schema";
import {
  applyGameStateLoadMigrations,
  isCompletedOneShotExecutionGhost,
  reconcileInFlightExecutionsOnLoad,
} from "./stateHelpers";
import { canExecuteAction } from "./rules";

const NOW = 1_700_000_000_000;

function baseState(): GameState {
  return {
    villagers: { free: 2, gatherer: 0 },
    resources: { wood: 100 },
    buildings: {},
    cooldowns: {},
    buttonUpgrades: {},
    story: { seen: {} },
  } as GameState;
}

describe("reconcileInFlightExecutionsOnLoad", () => {
  it("resumes a valid in-flight gather with remaining time", () => {
    const state = {
      ...baseState(),
      executionStartTimes: { chopWood: NOW - 1000 },
      executionDurations: { chopWood: 4 },
    } as GameState;

    const reconciled = reconcileInFlightExecutionsOnLoad(state, NOW);
    expect(reconciled.executionStartTimes?.chopWood).toBe(NOW - 1000);
    expect(reconciled.executionDurations?.chopWood).toBe(4);
    expect(canExecuteAction("chopWood", reconciled)).toBe(false);
  });

  it("repairs a missing duration from the action definition instead of blocking forever", () => {
    const state = {
      ...baseState(),
      executionStartTimes: { chopWood: NOW - 1000 },
    } as GameState;

    const reconciled = reconcileInFlightExecutionsOnLoad(state, NOW);
    expect(reconciled.executionDurations?.chopWood).toBe(4);
    expect(canExecuteAction("chopWood", reconciled)).toBe(false);
  });

  it("drops orphan execution entries that cannot be resumed", () => {
    const state = {
      ...baseState(),
      executionStartTimes: { unknownAction: NOW - 1000 },
      executionDurations: { unknownAction: 10 },
    } as GameState;

    const reconciled = reconcileInFlightExecutionsOnLoad(state, NOW);
    expect(reconciled.executionStartTimes).toEqual({});
    expect(canExecuteAction("chopWood", reconciled)).toBe(true);
  });

  it("returns expedition villagers stranded on dropped executions to the free pool", () => {
    const state = {
      ...baseState(),
      // Housing room required — at/over cap stranded locks are treated as ghosts.
      buildings: { woodenHut: 6 },
      executionStartTimes: { staleExpedition: NOW - 1000 },
      executionDurations: { staleExpedition: 60 },
      expeditionVillagers: { staleExpedition: 2, exploreCave: 1 },
    } as GameState;

    const reconciled = reconcileInFlightExecutionsOnLoad(state, NOW);
    expect(reconciled.expeditionVillagers).toEqual({});
    expect(reconciled.villagers?.free).toBe(5);
  });

  it("drops ghost expedition locks without duplicating villagers on load", () => {
    const state = {
      ...baseState(),
      villagers: {
        free: 0,
        gatherer: 20,
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
      },
      buildings: { woodenHut: 2 },
      expeditionVillagers: { exploreCave: 8 },
    } as GameState;

    const reconciled = reconcileInFlightExecutionsOnLoad(state, NOW);
    expect(reconciled.expeditionVillagers).toEqual({});
    expect(reconciled.villagers?.free).toBe(0);
    expect(reconciled.villagers?.gatherer).toBe(20);
  });

  it("drops completed one-shot expedition ghosts without refunding villagers", () => {
    const state = {
      ...baseState(),
      villagers: { free: 10, gatherer: 0 },
      story: {
        seen: {
          swampSanctuaryExplored: true,
          occultistChamberExplored: true,
        },
      },
      executionStartTimes: {
        swampSanctuary: NOW - 200_000,
        occultistChamber: NOW - 100_000,
        chopWood: NOW - 1000,
      },
      executionDurations: {
        swampSanctuary: 180,
        occultistChamber: 60,
        chopWood: 4,
      },
      expeditionVillagers: {
        swampSanctuary: 20,
        occultistChamber: 6,
      },
    } as GameState;

    expect(isCompletedOneShotExecutionGhost("swampSanctuary", state)).toBe(true);
    expect(isCompletedOneShotExecutionGhost("occultistChamber", state)).toBe(
      true,
    );
    expect(isCompletedOneShotExecutionGhost("chopWood", state)).toBe(false);

    const reconciled = reconcileInFlightExecutionsOnLoad(state, NOW);
    expect(reconciled.executionStartTimes).toEqual({ chopWood: NOW - 1000 });
    expect(reconciled.executionDurations).toEqual({ chopWood: 4 });
    expect(reconciled.expeditionVillagers).toEqual({});
    // Ghosts already returned villagers on real completion — do not double-count.
    expect(reconciled.villagers?.free).toBe(10);
  });
});

describe("applyGameStateLoadMigrations", () => {
  it("reconciles execution state instead of wiping progress on load", () => {
    const state = {
      ...baseState(),
      executionStartTimes: { chopWood: NOW - 1000 },
      executionDurations: { chopWood: 4 },
    } as GameState;

    const migrated = applyGameStateLoadMigrations(state);
    expect(migrated.executionStartTimes?.chopWood).toBe(NOW - 1000);
    expect(migrated.executionDurations?.chopWood).toBe(4);
  });
});
