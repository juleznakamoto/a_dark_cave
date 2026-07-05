import { describe, it, expect, vi, afterEach } from "vitest";
import type { GameState } from "@shared/schema";
import { createInitialState } from "@/game/state";
import { getVillagersInVillage } from "@/game/population";
import {
  applyPresetAssignments,
  arePresetsVisible,
  canPurchasePresetSlot,
  getBuildingPresetSlotCount,
  getInsightPurchasedPresetCount,
  getNextPresetUnlockCost,
  getNextPurchasablePresetSlotIndex,
  getPresetSlotUnlockActionId,
  getPresetSlotUnlockBuildingKey,
  getPresetUnlockCost,
  getVisiblePresetSlotCount,
  isPresetSlotBuildingLocked,
  isPresetSlotUnlocked,
  countUsedPresetSlots,
  migrateVillagerPresetsPurchasedOnLoad,
  snapshotAssignments,
  MAX_PRESET_SLOTS,
  PRESET_SLOTS_BY_BUILDING_TIER,
} from "@/game/villagerJobPresets";

function makeState(overrides?: Partial<GameState>): GameState {
  const base = createInitialState();
  return {
    ...base,
    ...overrides,
    villagers: { ...base.villagers, ...(overrides?.villagers ?? {}) },
    buildings: { ...base.buildings, ...(overrides?.buildings ?? {}) },
    flags: { ...base.flags, ...(overrides?.flags ?? {}) },
  };
}

describe("villagerJobPresets - building slot count", () => {
  it("unlocks 2 + 1 + 2 preset slots across archive building tiers", () => {
    expect(getBuildingPresetSlotCount(makeState())).toBe(0);
    expect(
      getBuildingPresetSlotCount(
        makeState({ buildings: { scribesOffice: 1 } as any }),
      ),
    ).toBe(PRESET_SLOTS_BY_BUILDING_TIER[0]);
    expect(
      getBuildingPresetSlotCount(
        makeState({ buildings: { scribesOffice: 1, recordsHall: 1 } as any }),
      ),
    ).toBe(PRESET_SLOTS_BY_BUILDING_TIER[0] + PRESET_SLOTS_BY_BUILDING_TIER[1]);
    expect(
      getBuildingPresetSlotCount(
        makeState({
          buildings: {
            scribesOffice: 1,
            recordsHall: 1,
            grandArchive: 1,
          } as any,
        }),
      ),
    ).toBe(MAX_PRESET_SLOTS);
  });

  it("presets become visible once the first archive building exists", () => {
    expect(arePresetsVisible(makeState())).toBe(false);
    expect(
      arePresetsVisible(makeState({ buildings: { scribesOffice: 1 } as any })),
    ).toBe(true);
  });

  it("shows all preset slots in the UI", () => {
    expect(getVisiblePresetSlotCount()).toBe(MAX_PRESET_SLOTS);
  });
});

describe("villagerJobPresets - Insight unlock", () => {
  it("purchased count reflects bought slots and is clamped to the max", () => {
    expect(getInsightPurchasedPresetCount(makeState())).toBe(0);
    expect(
      getInsightPurchasedPresetCount(
        makeState({ villagerPresetsPurchased: 2 } as any),
      ),
    ).toBe(2);
    expect(
      getInsightPurchasedPresetCount(
        makeState({ villagerPresetsPurchased: 99 } as any),
      ),
    ).toBe(MAX_PRESET_SLOTS);
  });

  it("tracks building locks per preset slot index", () => {
    const scribesOnly = makeState({
      buildings: { scribesOffice: 1 } as any,
    } as any);
    expect(isPresetSlotBuildingLocked(scribesOnly, 0)).toBe(false);
    expect(isPresetSlotBuildingLocked(scribesOnly, 1)).toBe(false);
    expect(isPresetSlotBuildingLocked(scribesOnly, 2)).toBe(true);
    expect(isPresetSlotBuildingLocked(scribesOnly, 3)).toBe(true);
  });

  it("only counts purchased slots as unlocked (usable)", () => {
    const state = makeState({
      buildings: { scribesOffice: 1, recordsHall: 1 } as any,
      villagerPresetsPurchased: 1,
    } as any);
    expect(isPresetSlotUnlocked(state, 0)).toBe(true);
    expect(isPresetSlotUnlocked(state, 1)).toBe(false);
  });

  it("grandfathers legacy shop-purchased slots", () => {
    const state = makeState({
      buildings: { scribesOffice: 1 } as any,
      villagerPresetsPurchased: 0,
      villagerPresetSlotsFromShop: 2,
    } as any);
    expect(isPresetSlotUnlocked(state, 3)).toBe(true);
    expect(isPresetSlotUnlocked(state, 4)).toBe(true);
  });

  it("uses escalating Insight costs per slot index", () => {
    expect(getPresetUnlockCost(0)).toBe(2500);
    expect(getPresetUnlockCost(1)).toBe(5000);
    expect(getPresetUnlockCost(2)).toBe(7500);
    expect(getPresetUnlockCost(4)).toBe(12500);
  });

  it("offers the next slot only when a further archive building exists", () => {
    const oneBuilding = makeState({
      buildings: { scribesOffice: 1 } as any,
    } as any);
    expect(getNextPurchasablePresetSlotIndex(oneBuilding)).toBe(0);
    expect(getNextPresetUnlockCost(oneBuilding)).toBe(2500);

    const oneBuildingBought = makeState({
      buildings: { scribesOffice: 1 } as any,
      villagerPresetsPurchased: 2,
    } as any);
    expect(getNextPurchasablePresetSlotIndex(oneBuildingBought)).toBeNull();
    expect(getNextPresetUnlockCost(oneBuildingBought)).toBeNull();

    const twoBuildingsOneBought = makeState({
      buildings: { scribesOffice: 1, recordsHall: 1 } as any,
      villagerPresetsPurchased: 2,
    } as any);
    expect(getNextPurchasablePresetSlotIndex(twoBuildingsOneBought)).toBe(2);
    expect(getNextPresetUnlockCost(twoBuildingsOneBought)).toBe(7500);
  });

  it("can purchase only with Insight unlocked and enough Insight", () => {
    const base = {
      buildings: { clerksHut: 1, scribesOffice: 1 } as any,
    };
    const broke = makeState({
      ...base,
      resources: { insight: 2499 } as any,
    } as any);
    expect(canPurchasePresetSlot(broke)).toBe(false);

    const ready = makeState({
      ...base,
      resources: { insight: 2500 } as any,
    } as any);
    expect(canPurchasePresetSlot(ready)).toBe(true);
  });
});

describe("villagerJobPresets - load migration", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("grandfathers used slots on load outside dev builds", () => {
    vi.stubEnv("DEV", false);
    const state = makeState({
      buildings: { scribesOffice: 1, recordsHall: 1 } as any,
      villagerJobPresets: [
        { assignments: { gatherer: 2 }, savedAt: 1 },
        { assignments: { hunter: 1 }, savedAt: 2 },
      ],
    } as any);

    expect(migrateVillagerPresetsPurchasedOnLoad(state)).toEqual({
      villagerPresetsPurchased: 2,
    });
  });
});

describe("villagerJobPresets - slot unlock mapping", () => {
  it("maps building-gated slots to their unlock buildings", () => {
    expect(getPresetSlotUnlockBuildingKey(0)).toBe("scribesOffice");
    expect(getPresetSlotUnlockBuildingKey(1)).toBe("scribesOffice");
    expect(getPresetSlotUnlockBuildingKey(2)).toBe("recordsHall");
    expect(getPresetSlotUnlockBuildingKey(3)).toBe("grandArchive");
    expect(getPresetSlotUnlockActionId(2)).toBe("buildRecordsHall");
  });
});

describe("villagerJobPresets - snapshot and apply", () => {
  it("captures job counts and excludes free and zero entries", () => {
    const state = makeState({
      villagers: { free: 3, gatherer: 4, hunter: 0, iron_miner: 2 } as any,
    });
    const snap = snapshotAssignments(state.villagers);
    expect(snap).toEqual({ gatherer: 4, iron_miner: 2 });
  });

  it("assigns the preset exactly and puts surplus into free", () => {
    const state = makeState({
      villagers: { free: 10, gatherer: 0, hunter: 0 } as any,
    });
    const updates = applyPresetAssignments(state, { gatherer: 3 });
    expect(updates.villagers?.gatherer).toBe(3);
    expect(updates.villagers?.free).toBe(7);
  });

  it("preserves the total village workforce", () => {
    const state = makeState({
      villagers: { free: 2, gatherer: 5, hunter: 3 } as any,
    });
    const workforce = getVillagersInVillage(state);
    const updates = applyPresetAssignments(state, { gatherer: 4, hunter: 4 });
    const total = getVillagersInVillage({
      villagers: updates.villagers!,
    } as GameState);
    expect(total).toBe(workforce);
  });

  it("counts used slots from highest saved preset index", () => {
    expect(countUsedPresetSlots(makeState())).toBe(0);
    expect(
      countUsedPresetSlots(
        makeState({
          villagerJobPresets: [
            { assignments: { gatherer: 2 }, savedAt: 1 },
            null,
          ],
        } as any),
      ),
    ).toBe(1);
  });
});
