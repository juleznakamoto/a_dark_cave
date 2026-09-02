import { describe, expect, it } from "vitest";
import type { GameState } from "@shared/schema";
import {
  applyGameStateLoadMigrations,
  ATTACK_WAVE_OVERDUE_RESET_SLACK_MS,
  isCompletedOneShotExecutionGhost,
  migrateBossWavesOnLoad,
  reconcileInFlightExecutionsOnLoad,
  repairOverdueAttackWaveTimersOnLoad,
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
          // Sanctuary completion is the dialog choice, not expedition return.
          swampSanctuaryChoiceMade: true,
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
      events: {},
      executionStartTimes: { chopWood: NOW - 1000 },
      executionDurations: { chopWood: 4 },
    } as GameState;

    const migrated = applyGameStateLoadMigrations(state);
    expect(migrated.executionStartTimes?.chopWood).toBe(NOW - 1000);
    expect(migrated.executionDurations?.chopWood).toBe(4);
  });

  it("rewinds a leftover-clock inflated wave timer", () => {
    const state = {
      ...baseState(),
      events: {},
      attackWaveTimers: {
        ninthWave: {
          startTime: NOW - 2_000_000,
          duration: 1_200_000,
          elapsedTime: 1_974_328,
          defeated: false,
          provoked: false,
        },
      },
    } as GameState;

    const migrated = applyGameStateLoadMigrations(state);
    expect(migrated.attackWaveTimers?.ninthWave?.elapsedTime).toBe(0);
    expect(migrated.attackWaveTimers?.ninthWave?.duration).toBe(1_200_000);
  });
});

describe("repairOverdueAttackWaveTimersOnLoad", () => {
  const running = {
    startTime: NOW,
    duration: 1_200_000,
    elapsedTime: 0,
    defeated: false,
    provoked: false,
  };

  it("leaves a just-due wave so the pending fight still starts", () => {
    const patch = repairOverdueAttackWaveTimersOnLoad(
      {
        attackWaveTimers: {
          firstWave: {
            ...running,
            duration: 600_000,
            elapsedTime: 600_000 + 30_000,
          },
        },
      },
      NOW,
    );
    expect(patch).toBeNull();
  });

  it("does not rewind a provoked wave", () => {
    const patch = repairOverdueAttackWaveTimersOnLoad(
      {
        attackWaveTimers: {
          ninthWave: {
            ...running,
            elapsedTime: running.duration + ATTACK_WAVE_OVERDUE_RESET_SLACK_MS + 1,
            provoked: true,
          },
        },
      },
      NOW,
    );
    expect(patch).toBeNull();
  });

  it("resets a clearly inflated unprovoked rematch timer", () => {
    const patch = repairOverdueAttackWaveTimersOnLoad(
      {
        attackWaveTimers: {
          ninthWave: {
            ...running,
            elapsedTime: 1_974_328,
          },
        },
      },
      NOW,
    );
    expect(patch?.attackWaveTimers?.ninthWave).toMatchObject({
      elapsedTime: 0,
      startTime: NOW,
      duration: 1_200_000,
      defeated: false,
    });
  });
});

describe("migrateBossWavesOnLoad", () => {
  it("does not auto-complete final boss wave when waiting after tenth", () => {
    const state = {
      ...baseState(),
      story: {
        seen: {
          tenthWaveVictory: true,
        },
      },
      attackWaveTimers: {
        secondBossWave: {
          startTime: NOW,
          duration: 600_000,
          elapsedTime: 120_000,
          defeated: false,
          provoked: false,
        },
      },
      postCompletionAttackWaveCount: 0,
      events: {},
    } as GameState;

    const patch = migrateBossWavesOnLoad(state);
    expect(patch?.story?.seen?.secondBossWaveVictory).toBeFalsy();
    expect(patch?.attackWaveTimers?.secondBossWave).toBeUndefined();
    // First boss may still be implied from tenth; final boss must not.
    expect(patch?.story?.seen?.firstBossWaveVictory).toBe(true);
  });
});
