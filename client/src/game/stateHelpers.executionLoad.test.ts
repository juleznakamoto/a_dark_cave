import { describe, expect, it } from "vitest";
import type { GameState } from "@shared/schema";
import {
  applyGameStateLoadMigrations,
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
      executionStartTimes: { staleExpedition: NOW - 1000 },
      executionDurations: { staleExpedition: 60 },
      expeditionVillagers: { staleExpedition: 2, exploreCave: 1 },
    } as GameState;

    const reconciled = reconcileInFlightExecutionsOnLoad(state, NOW);
    expect(reconciled.expeditionVillagers).toEqual({});
    expect(reconciled.villagers?.free).toBe(5);
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
