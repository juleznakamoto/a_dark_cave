import { describe, expect, it } from "vitest";
import type { GameState } from "@shared/schema";
import { handleMakeFire } from "@/game/rules/caveExploreActions";
import { useGameStore } from "@/game/state";
import {
  areVillagerCapsEnabled,
  canUpgradeVillagerCap,
  getGroupForBuildingKey,
  getGroupForJob,
  getGroupsForBuildingKey,
  getConstructionQueueSlotUnlockCost,
  getNextCapUpgradeCost,
  getPresetSlotUnlockCost,
  GATHERER_CAP,
  getVillagerCapForJob,
  getVillagerCapForLevel,
  getVillagerCapLevel,
  getVillagerCapUpgradeGroupForBuilding,
  getVillagerCapUpgradeGroupForJob,
  MAX_VILLAGER_CAP_LEVEL,
  migrateVillagerCapFifteenStepOnLoad,
  migrateVillagerCapFiveStepOnLoad,
  migrateVillagerCapPerJobSplitOnLoad,
  VILLAGER_CAP_BY_LEVEL,
  VILLAGER_CAP_FIFTEEN_STEP_SEEN_KEY,
  VILLAGER_CAP_FIVE_STEP_SEEN_KEY,
  VILLAGER_CAP_GROUPS,
  VILLAGER_CAP_PER_JOB_SPLIT_SEEN_KEY,
} from "./villagerCapUpgrades";
import { createInitialState } from "@/game/store/createInitialState";
import { applyGameStateLoadMigrations } from "@/game/stateHelpers";

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
  it("maps each capped job to its own upgrade track", () => {
    expect(getGroupForJob("hunter")).toBe("hunter");
    expect(getGroupForJob("iron_miner")).toBe("iron_miner");
    expect(getGroupForJob("coal_miner")).toBe("coal_miner");
    expect(getGroupForJob("steel_forger")).toBe("steel_forger");
    expect(getGroupForJob("blacksteel_forger")).toBe("blacksteel_forger");
    expect(getGroupForJob("powder_maker")).toBe("powder_maker");
    expect(getGroupForJob("ashfire_dust_maker")).toBe("ashfire_dust_maker");
    expect(getGroupForJob("gatherer")).toBeUndefined();
    expect(getGroupForBuildingKey("cabin")).toBe("hunter");
    expect(getGroupsForBuildingKey("shallowPit")).toEqual([
      "iron_miner",
      "coal_miner",
    ]);
    expect(getGroupsForBuildingKey("bottomlessPit")).toEqual([
      "adamant_miner",
      "moonstone_miner",
    ]);
    expect(getGroupsForBuildingKey("alchemistHall")).toEqual([
      "powder_maker",
      "ashfire_dust_maker",
    ]);
    expect(getGroupForBuildingKey("woodenHut")).toBeUndefined();
  });

  it("uses explicit cap table including level 0 = 5 and level 7 = 100", () => {
    expect(VILLAGER_CAP_BY_LEVEL).toEqual([5, 10, 15, 20, 30, 40, 50, 100]);
    expect(getVillagerCapForLevel(0)).toBe(5);
    expect(getVillagerCapForLevel(1)).toBe(10);
    expect(getVillagerCapForLevel(7)).toBe(100);
  });

  it("returns Infinity when feature gate is off", () => {
    const state = baseState({
      flags: { villagerCapsEnabled: false } as GameState["flags"],
    });
    expect(areVillagerCapsEnabled(state)).toBe(false);
    expect(getVillagerCapForJob(state, "hunter")).toBe(Infinity);
  });

  it("always caps gatherers at GATHERER_CAP regardless of feature gate", () => {
    const gatedOff = baseState({
      flags: { villagerCapsEnabled: false } as GameState["flags"],
    });
    expect(getVillagerCapForJob(gatedOff, "gatherer")).toBe(GATHERER_CAP);
    expect(getVillagerCapForJob(baseState(), "gatherer")).toBe(GATHERER_CAP);
  });

  it("computes upgrade costs per cap step", () => {
    expect(getNextCapUpgradeCost(0)).toBe(25);
    expect(getNextCapUpgradeCost(1)).toBe(50);
    expect(getNextCapUpgradeCost(2)).toBe(100);
    expect(getNextCapUpgradeCost(3)).toBe(250);
    expect(getNextCapUpgradeCost(4)).toBe(500);
    expect(getNextCapUpgradeCost(5)).toBe(750);
    expect(getNextCapUpgradeCost(6)).toBe(1000);
  });

  it("defines construction queue slot unlock costs", () => {
    expect(getConstructionQueueSlotUnlockCost(0)).toBe(2500);
    expect(getConstructionQueueSlotUnlockCost(1)).toBe(5000);
  });

  it("defines preset slot unlock costs", () => {
    expect(getPresetSlotUnlockCost(0)).toBe(1000);
    expect(getPresetSlotUnlockCost(1)).toBe(2500);
    expect(getPresetSlotUnlockCost(4)).toBe(10000);
  });

  it("reads and clamps stored upgrade levels per job", () => {
    const state = baseState({
      villagerCapUpgrades: { hunter: 99, iron_miner: -2 },
    });
    expect(getVillagerCapLevel(state, "hunter")).toBe(MAX_VILLAGER_CAP_LEVEL);
    expect(getVillagerCapLevel(state, "iron_miner")).toBe(0);
    expect(getVillagerCapForJob(state, "hunter")).toBe(100);
    expect(getVillagerCapForJob(state, "iron_miner")).toBe(5);
    expect(getVillagerCapForJob(state, "coal_miner")).toBe(5);
  });

  it("getVillagerCapUpgradeGroupForBuilding gates on caps, insight, and max level", () => {
    expect(getVillagerCapUpgradeGroupForBuilding(baseState(), "cabin")).toBe(
      "hunter",
    );
    expect(getVillagerCapUpgradeGroupForBuilding(baseState(), "foundry")).toBe(
      "steel_forger",
    );
    expect(getVillagerCapUpgradeGroupForBuilding(baseState(), "storage")).toBe(
      null,
    );

    const gatedOff = baseState({
      flags: { villagerCapsEnabled: false } as GameState["flags"],
    });
    expect(getVillagerCapUpgradeGroupForBuilding(gatedOff, "cabin")).toBe(null);

    const noInsight = baseState({
      buildings: { clerksHut: 0 } as GameState["buildings"],
    });
    expect(getVillagerCapUpgradeGroupForBuilding(noInsight, "cabin")).toBe(
      null,
    );

    const maxed = baseState({
      villagerCapUpgrades: { hunter: MAX_VILLAGER_CAP_LEVEL },
    });
    expect(getVillagerCapUpgradeGroupForBuilding(maxed, "cabin")).toBe(null);
  });

  it("getVillagerCapUpgradeGroupForJob uses a distinct track per miner", () => {
    expect(getVillagerCapUpgradeGroupForJob(baseState(), "hunter")).toBe(
      "hunter",
    );
    expect(getVillagerCapUpgradeGroupForJob(baseState(), "iron_miner")).toBe(
      "iron_miner",
    );
    expect(getVillagerCapUpgradeGroupForJob(baseState(), "coal_miner")).toBe(
      "coal_miner",
    );
    expect(getVillagerCapUpgradeGroupForJob(baseState(), "gatherer")).toBe(
      null,
    );

    const gatedOff = baseState({
      flags: { villagerCapsEnabled: false } as GameState["flags"],
    });
    expect(getVillagerCapUpgradeGroupForJob(gatedOff, "hunter")).toBe(null);

    const maxedIron = baseState({
      villagerCapUpgrades: { iron_miner: MAX_VILLAGER_CAP_LEVEL },
    });
    expect(getVillagerCapUpgradeGroupForJob(maxedIron, "iron_miner")).toBe(
      null,
    );
    expect(getVillagerCapUpgradeGroupForJob(maxedIron, "coal_miner")).toBe(
      "coal_miner",
    );
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

  it("handleMakeFire enables villager caps for new games", () => {
    const state = baseState({
      flags: { gameStarted: false, villagerCapsEnabled: false } as GameState["flags"],
      story: { seen: {}, merchantPurchases: 0, heavySleeperHours: 0 },
    });
    const result = handleMakeFire(state, { stateUpdates: {}, logEntries: [] });
    expect(result.stateUpdates.flags?.gameStarted).toBe(true);
    expect(result.stateUpdates.flags?.villagerCapsEnabled).toBe(true);
  });

  it("upgradeVillagerCap spends insight and increments only that job level", () => {
    useGameStore.getState().initialize(
      baseState({
        villagerCapUpgrades: {},
        resources: { insight: 100 } as GameState["resources"],
      }) as Partial<GameState>,
    );

    const ok = useGameStore.getState().upgradeVillagerCap("iron_miner");
    expect(ok).toBe(true);

    const next = useGameStore.getState();
    expect(next.villagerCapUpgrades?.iron_miner).toBe(1);
    expect(next.villagerCapUpgrades?.coal_miner).toBeUndefined();
    expect(next.resources.insight).toBe(75);
    expect(getVillagerCapForJob(next, "iron_miner")).toBe(10);
    expect(getVillagerCapForJob(next, "coal_miner")).toBe(5);
  });

  it("shifts pre-15-step levels once so bought caps stay put", () => {
    const legacy = baseState({
      villagerCapUpgrades: { hunter: 1, miner: 5, scholar: 0 },
      story: { seen: {}, merchantPurchases: 0, heavySleeperHours: 0 },
    });
    const patch = migrateVillagerCapFifteenStepOnLoad(legacy);
    expect(patch?.villagerCapUpgrades).toEqual({
      hunter: 2,
      miner: 6,
      scholar: 0,
    });
    expect(patch?.story?.seen?.[VILLAGER_CAP_FIFTEEN_STEP_SEEN_KEY]).toBe(true);
    const withFive = migrateVillagerCapFiveStepOnLoad({
      villagerCapUpgrades: patch?.villagerCapUpgrades,
      story: patch?.story,
    });
    const fiveUpgrades = withFive?.villagerCapUpgrades ?? {};
    expect(fiveUpgrades.hunter).toBe(3);
    expect(fiveUpgrades.miner).toBe(7);
    expect(fiveUpgrades.scholar).toBe(1);
    for (const groupId of Object.keys(VILLAGER_CAP_GROUPS)) {
      expect(fiveUpgrades[groupId]).toBeGreaterThanOrEqual(1);
    }
    expect(getVillagerCapForLevel(3)).toBe(20);
    expect(getVillagerCapForLevel(7)).toBe(100);
    expect(getVillagerCapForLevel(1)).toBe(10);

    const already = baseState({
      villagerCapUpgrades: { hunter: 1 },
      story: {
        seen: { [VILLAGER_CAP_FIFTEEN_STEP_SEEN_KEY]: true },
        merchantPurchases: 0,
        heavySleeperHours: 0,
      },
    });
    expect(migrateVillagerCapFifteenStepOnLoad(already)).toBeNull();
  });

  it("shifts pre-5-step levels once so the old cap of 10 stays put", () => {
    const legacy = baseState({
      villagerCapUpgrades: { hunter: 0, miner: 2, scholar: 6 },
      story: {
        seen: { [VILLAGER_CAP_FIFTEEN_STEP_SEEN_KEY]: true },
        merchantPurchases: 0,
        heavySleeperHours: 0,
      },
    });
    const patch = migrateVillagerCapFiveStepOnLoad(legacy);
    const upgrades = patch?.villagerCapUpgrades ?? {};
    expect(upgrades.hunter).toBe(1);
    expect(upgrades.miner).toBe(3);
    expect(upgrades.scholar).toBe(7);
    expect(patch?.story?.seen?.[VILLAGER_CAP_FIVE_STEP_SEEN_KEY]).toBe(true);
    expect(getVillagerCapForLevel(1)).toBe(10);
    expect(getVillagerCapForLevel(3)).toBe(20);
    expect(getVillagerCapForLevel(7)).toBe(100);

    const already = baseState({
      villagerCapUpgrades: { hunter: 0 },
      story: {
        seen: { [VILLAGER_CAP_FIVE_STEP_SEEN_KEY]: true },
        merchantPurchases: 0,
        heavySleeperHours: 0,
      },
    });
    expect(migrateVillagerCapFiveStepOnLoad(already)).toBeNull();
  });

  it("splits legacy shared miner/forger/alchemist levels onto each job", () => {
    const legacy = baseState({
      villagerCapUpgrades: {
        hunter: 2,
        miner: 4,
        forger: 3,
        alchemist: 1,
        iron_miner: 1,
      },
      story: {
        seen: {
          [VILLAGER_CAP_FIFTEEN_STEP_SEEN_KEY]: true,
          [VILLAGER_CAP_FIVE_STEP_SEEN_KEY]: true,
        },
        merchantPurchases: 0,
        heavySleeperHours: 0,
      },
    });
    const patch = migrateVillagerCapPerJobSplitOnLoad(legacy);
    expect(patch?.villagerCapUpgrades).toEqual({
      hunter: 2,
      iron_miner: 4,
      coal_miner: 4,
      sulfur_miner: 4,
      obsidian_miner: 4,
      adamant_miner: 4,
      moonstone_miner: 4,
      steel_forger: 3,
      blacksteel_forger: 3,
      powder_maker: 1,
      ashfire_dust_maker: 1,
    });
    expect(patch?.story?.seen?.[VILLAGER_CAP_PER_JOB_SPLIT_SEEN_KEY]).toBe(
      true,
    );
    expect(
      migrateVillagerCapPerJobSplitOnLoad({
        villagerCapUpgrades: patch?.villagerCapUpgrades,
        story: patch?.story,
      }),
    ).toBeNull();
  });

  it("new games start at cap 5 and are not shifted on load", () => {
    const fresh = createInitialState();
    expect(fresh.story.seen[VILLAGER_CAP_FIVE_STEP_SEEN_KEY]).toBe(true);
    expect(fresh.story.seen[VILLAGER_CAP_PER_JOB_SPLIT_SEEN_KEY]).toBe(true);
    const started = {
      ...fresh,
      flags: { ...fresh.flags, villagerCapsEnabled: true },
    };
    const migrated = applyGameStateLoadMigrations(started);
    expect(migrated.villagerCapUpgrades?.hunter).toBeUndefined();
    expect(getVillagerCapForJob(migrated, "hunter")).toBe(5);
  });

  it("load migration keeps an old starting cap of 10 and splits shared keys", () => {
    const fresh = createInitialState();
    const seen = { ...fresh.story.seen };
    delete seen[VILLAGER_CAP_FIVE_STEP_SEEN_KEY];
    delete seen[VILLAGER_CAP_PER_JOB_SPLIT_SEEN_KEY];
    const legacy = {
      ...fresh,
      flags: { ...fresh.flags, villagerCapsEnabled: true },
      villagerCapUpgrades: { hunter: 1, miner: 0 },
      story: { ...fresh.story, seen },
    };
    const migrated = applyGameStateLoadMigrations(legacy);
    expect(migrated.villagerCapUpgrades?.hunter).toBe(2);
    expect(getVillagerCapForJob(migrated, "hunter")).toBe(15);
    expect(migrated.villagerCapUpgrades?.miner).toBeUndefined();
    expect(migrated.villagerCapUpgrades?.iron_miner).toBe(1);
    expect(getVillagerCapForJob(migrated, "iron_miner")).toBe(10);
    expect(getVillagerCapForJob(migrated, "coal_miner")).toBe(10);
    expect(migrated.story.seen[VILLAGER_CAP_FIVE_STEP_SEEN_KEY]).toBe(true);
    expect(migrated.story.seen[VILLAGER_CAP_PER_JOB_SPLIT_SEEN_KEY]).toBe(true);
  });

  it("enables caps when villagerCapsEnabled flag is set", () => {
    const state = baseState();
    expect(areVillagerCapsEnabled(state)).toBe(true);
    expect(getVillagerCapForJob(state, "hunter")).toBe(5);
    expect(canUpgradeVillagerCap(state, "hunter")).toBe(true);
  });
});
