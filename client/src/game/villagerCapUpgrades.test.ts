import { describe, expect, it } from "vitest";
import type { GameState } from "@shared/schema";
import { handleLightFire } from "@/game/rules/caveExploreActions";
import { useGameStore } from "@/game/state";
import {
  areVillagerCapsEnabled,
  canUpgradeVillagerCap,
  getGroupForBuildingKey,
  getGroupForJob,
  getNextCapUpgradeCost,
  getVillagerCapForJob,
  getVillagerCapForLevel,
  getVillagerCapLevel,
  MAX_VILLAGER_CAP_LEVEL,
  VILLAGER_CAP_BY_LEVEL,
} from "./villagerCapUpgrades";

function baseState(
  overrides: Partial<GameState> = {},
): GameState {
  return {
    flags: { villagerCapsEnabled: true },
    villagerCapUpgrades: {},
    buildings: { clerksHut: 1 },
    resources: { insight: 500 },
    villagers: {
      free: 5,
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
    },
    ...overrides,
  } as GameState;
}

describe("villagerCapUpgrades", () => {
  it("maps jobs and buildings to upgrade groups", () => {
    expect(getGroupForJob("hunter")).toBe("hunter");
    expect(getGroupForJob("gatherer")).toBeUndefined();
    expect(getGroupForBuildingKey("cabin")).toBe("hunter");
    expect(getGroupForBuildingKey("bottomlessPit")).toBe("miner");
    expect(getGroupForBuildingKey("alchemistHall")).toBe("alchemist");
    expect(getGroupForBuildingKey("woodenHut")).toBeUndefined();
  });

  it("uses explicit cap table including level 5 = 100", () => {
    expect(VILLAGER_CAP_BY_LEVEL).toEqual([10, 20, 30, 40, 50, 100]);
    expect(getVillagerCapForLevel(0)).toBe(10);
    expect(getVillagerCapForLevel(5)).toBe(100);
  });

  it("returns Infinity when feature gate is off", () => {
    const state = baseState({
      flags: { villagerCapsEnabled: false } as GameState["flags"],
    });
    expect(areVillagerCapsEnabled(state)).toBe(false);
    expect(getVillagerCapForJob(state, "hunter")).toBe(Infinity);
  });

  it("computes upgrade costs per cap step", () => {
    expect(getNextCapUpgradeCost(0)).toBe(100);
    expect(getNextCapUpgradeCost(1)).toBe(250);
    expect(getNextCapUpgradeCost(2)).toBe(500);
    expect(getNextCapUpgradeCost(3)).toBe(750);
    expect(getNextCapUpgradeCost(4)).toBe(1000);
  });

  it("reads and clamps stored upgrade levels", () => {
    const state = baseState({
      villagerCapUpgrades: { hunter: 99, miner: -2 },
    });
    expect(getVillagerCapLevel(state, "hunter")).toBe(MAX_VILLAGER_CAP_LEVEL);
    expect(getVillagerCapLevel(state, "miner")).toBe(0);
    expect(getVillagerCapForJob(state, "hunter")).toBe(100);
    expect(getVillagerCapForJob(state, "iron_miner")).toBe(10);
  });

  it("canUpgradeVillagerCap requires gate, insight unlock, and affordability", () => {
    const gatedOff = baseState({
      flags: { villagerCapsEnabled: false } as GameState["flags"],
    });
    expect(canUpgradeVillagerCap(gatedOff, "hunter")).toBe(false);

    const noInsightBuilding = baseState({
      buildings: { clerksHut: 0 } as GameState["buildings"],
    });
    expect(canUpgradeVillagerCap(noInsightBuilding, "hunter")).toBe(false);

    const poor = baseState({ resources: { insight: 10 } as GameState["resources"] });
    expect(canUpgradeVillagerCap(poor, "hunter")).toBe(false);

    const ready = baseState();
    expect(canUpgradeVillagerCap(ready, "hunter")).toBe(true);

    const maxed = baseState({
      villagerCapUpgrades: { hunter: MAX_VILLAGER_CAP_LEVEL },
    });
    expect(canUpgradeVillagerCap(maxed, "hunter")).toBe(false);
  });

  it("handleLightFire enables villager caps for new games", () => {
    const state = baseState({
      flags: { gameStarted: false, villagerCapsEnabled: false } as GameState["flags"],
      story: { seen: {}, merchantPurchases: 0, heavySleeperHours: 0 },
    });
    const result = handleLightFire(state, { stateUpdates: {}, logEntries: [] });
    expect(result.stateUpdates.flags?.gameStarted).toBe(true);
    expect(result.stateUpdates.flags?.villagerCapsEnabled).toBe(true);
    expect(result.stateUpdates.flags?.constructionQueueEnabled).toBe(true);
  });

  it("upgradeVillagerCap spends insight and increments group level", () => {
    useGameStore.getState().initialize(
      baseState({
        villagerCapUpgrades: {},
        resources: { insight: 100 } as GameState["resources"],
      }) as Partial<GameState>,
    );

    const ok = useGameStore.getState().upgradeVillagerCap("hunter");
    expect(ok).toBe(true);

    const next = useGameStore.getState();
    expect(next.villagerCapUpgrades?.hunter).toBe(1);
    expect(next.resources.insight).toBe(0);
    expect(getVillagerCapForJob(next, "hunter")).toBe(20);
  });

  it("enables caps when villagerCapsEnabled flag is set", () => {
    const state = baseState();
    expect(areVillagerCapsEnabled(state)).toBe(true);
    expect(getVillagerCapForJob(state, "hunter")).toBe(10);
    expect(canUpgradeVillagerCap(state, "hunter")).toBe(true);
  });
});
