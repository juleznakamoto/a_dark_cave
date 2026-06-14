import { describe, it, expect, vi, afterEach } from "vitest";
import type { GameState } from "@shared/schema";
import { createInitialState } from "@/game/state";
import { getVillagersInVillage } from "@/game/population";
import {
  applyPresetAssignments,
  arePresetsVisible,
  canPurchasePresetSlot,
  getBuildingPresetSlotCount,
  getNextPresetUnlockCost,
  getNextPurchasablePresetSlotIndex,
  getPresetSlotUnlockActionId,
  getPresetSlotUnlockBuildingKey,
  getPresetUnlockCost,
  getPurchasedPresetCount,
  isPresetSlotUnlocked,
  countUsedPresetSlots,
  migrateVillagerPresetsPurchasedOnLoad,
  snapshotAssignments,
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
  it("counts each built archive building as one buyable slot", () => {
    expect(getBuildingPresetSlotCount(makeState())).toBe(0);
    expect(
      getBuildingPresetSlotCount(
        makeState({ buildings: { scribesOffice: 1 } as any }),
      ),
    ).toBe(1);
    expect(
      getBuildingPresetSlotCount(
        makeState({ buildings: { scribesOffice: 1, recordsHall: 1 } as any }),
      ),
    ).toBe(2);
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
    ).toBe(3);
  });

  it("presets become visible once the first archive building exists", () => {
    expect(arePresetsVisible(makeState())).toBe(false);
    expect(
      arePresetsVisible(makeState({ buildings: { scribesOffice: 1 } as any })),
    ).toBe(true);
  });
});

describe("villagerJobPresets - Insight unlock", () => {
  it("purchased count reflects bought slots and is clamped to the max", () => {
    expect(getPurchasedPresetCount(makeState())).toBe(0);
    expect(
      getPurchasedPresetCount(
        makeState({ villagerPresetsPurchased: 2 } as any),
      ),
    ).toBe(2);
    expect(
      getPurchasedPresetCount(
        makeState({ villagerPresetsPurchased: 99 } as any),
      ),
    ).toBe(3);
  });

  it("only counts purchased slots as unlocked (usable)", () => {
    const state = makeState({
      buildings: { scribesOffice: 1, recordsHall: 1 } as any,
      villagerPresetsPurchased: 1,
    } as any);
    expect(isPresetSlotUnlocked(state, 0)).toBe(true);
    expect(isPresetSlotUnlocked(state, 1)).toBe(false);
  });

  it("uses escalating Insight costs per slot index", () => {
    expect(getPresetUnlockCost(0)).toBe(2500);
    expect(getPresetUnlockCost(1)).toBe(5000);
    expect(getPresetUnlockCost(2)).toBe(7500);
  });

  it("offers the next slot only when a further archive building exists", () => {
    // building 1 built, nothing purchased -> next slot is index 0 (2500)
    const oneBuilding = makeState({
      buildings: { scribesOffice: 1 } as any,
    } as any);
    expect(getNextPurchasablePresetSlotIndex(oneBuilding)).toBe(0);
    expect(getNextPresetUnlockCost(oneBuilding)).toBe(2500);

    // building 1 built and slot 1 purchased -> no further building, nothing to buy
    const oneBuildingBought = makeState({
      buildings: { scribesOffice: 1 } as any,
      villagerPresetsPurchased: 1,
    } as any);
    expect(getNextPurchasablePresetSlotIndex(oneBuildingBought)).toBeNull();
    expect(getNextPresetUnlockCost(oneBuildingBought)).toBeNull();

    // building 2 built and slot 1 purchased -> next slot is index 1 (5000)
    const twoBuildingsOneBought = makeState({
      buildings: { scribesOffice: 1, recordsHall: 1 } as any,
      villagerPresetsPurchased: 1,
    } as any);
    expect(getNextPurchasablePresetSlotIndex(twoBuildingsOneBought)).toBe(1);
    expect(getNextPresetUnlockCost(twoBuildingsOneBought)).toBe(5000);
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

    // Without the Insight-unlocking building, purchase is blocked.
    const noInsight = makeState({
      buildings: { scribesOffice: 1 } as any,
      resources: { insight: 99999 } as any,
    } as any);
    expect(canPurchasePresetSlot(noInsight)).toBe(false);
  });

  it("blocks purchase while preset unlock animation is in progress", () => {
    const ready = makeState({
      buildings: { clerksHut: 1, scribesOffice: 1 } as any,
      resources: { insight: 2500 } as any,
    } as any);
    expect(
      canPurchasePresetSlot(ready, {
        villagerPresetUnlock: Date.now() + 3000,
      }),
    ).toBe(false);
  });
});

describe("villagerJobPresets - load migration", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
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
    expect(
      countUsedPresetSlots(
        makeState({
          villagerJobPresets: [
            { assignments: { gatherer: 2 }, savedAt: 1 },
            { assignments: { hunter: 1 }, savedAt: 2 },
          ],
        } as any),
      ),
    ).toBe(2);
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

  it("does not grandfather used slots in dev builds", () => {
    vi.stubEnv("DEV", true);
    const state = makeState({
      buildings: { scribesOffice: 1 } as any,
      villagerJobPresets: [
        { assignments: { gatherer: 2 }, savedAt: 1 },
      ],
    } as any);

    expect(migrateVillagerPresetsPurchasedOnLoad(state)).toBeNull();
  });

  it("does not exceed building-available slot count when grandfathering", () => {
    vi.stubEnv("DEV", false);
    const state = makeState({
      buildings: { scribesOffice: 1 } as any,
      villagerJobPresets: [
        { assignments: { gatherer: 2 }, savedAt: 1 },
        { assignments: { hunter: 1 }, savedAt: 2 },
      ],
    } as any);

    expect(migrateVillagerPresetsPurchasedOnLoad(state)).toEqual({
      villagerPresetsPurchased: 1,
    });
  });
});

describe("villagerJobPresets - slot unlock mapping", () => {
  it("maps building-gated slots to their unlock buildings", () => {
    expect(getPresetSlotUnlockBuildingKey(0)).toBe("scribesOffice");
    expect(getPresetSlotUnlockBuildingKey(1)).toBe("recordsHall");
    expect(getPresetSlotUnlockBuildingKey(2)).toBe("grandArchive");
    expect(getPresetSlotUnlockActionId(1)).toBe("buildRecordsHall");
    expect(getPresetSlotUnlockActionId(2)).toBe("buildGrandArchive");
  });

  it("returns null for purchase-only slots", () => {
    expect(getPresetSlotUnlockBuildingKey(3)).toBeNull();
    expect(getPresetSlotUnlockActionId(4)).toBeNull();
  });
});

describe("villagerJobPresets - snapshot", () => {
  it("captures job counts and excludes free and zero entries", () => {
    const state = makeState({
      villagers: { free: 3, gatherer: 4, hunter: 0, iron_miner: 2 } as any,
    });
    const snap = snapshotAssignments(state.villagers);
    expect(snap).toEqual({ gatherer: 4, iron_miner: 2 });
    expect(snap.free).toBeUndefined();
    expect(snap.hunter).toBeUndefined();
  });
});

describe("villagerJobPresets - apply", () => {
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

  it("divides villagers proportionally when the workforce shrank below the preset", () => {
    const state = makeState({
      villagers: { free: 2, gatherer: 0, hunter: 0 } as any,
    });
    // preset wants 2 + 2 = 4 but only 2 villagers exist
    const updates = applyPresetAssignments(state, { gatherer: 2, hunter: 2 });
    expect(updates.villagers?.gatherer).toBe(1);
    expect(updates.villagers?.hunter).toBe(1);
    expect(updates.villagers?.free).toBe(0);
  });

  it("clamps assignments to the per-profession cap when caps are enabled", () => {
    const state = makeState({
      flags: { villagerCapsEnabled: true } as any,
      villagerCapUpgrades: {},
      villagers: { free: 30, hunter: 0 } as any,
    });
    // hunter cap at level 0 is 10
    const updates = applyPresetAssignments(state, { hunter: 25 });
    expect(updates.villagers?.hunter).toBe(10);
    expect(updates.villagers?.free).toBe(20);
  });

  it("leaves expedition villagers untouched", () => {
    const state = makeState({
      villagers: { free: 6, gatherer: 0 } as any,
      expeditionVillagers: { exploreCave: 4 },
    });
    const updates = applyPresetAssignments(state, { gatherer: 2 });
    // applyPresetAssignments never returns expeditionVillagers
    expect(updates.expeditionVillagers).toBeUndefined();
    // only in-village villagers are redistributed
    expect(updates.villagers?.gatherer).toBe(2);
    expect(updates.villagers?.free).toBe(4);
  });

  it("sets first-assign story flags when a preset introduces hunters/gatherers", () => {
    const state = makeState({
      villagers: { free: 5, hunter: 0, gatherer: 0 } as any,
    });
    const updates = applyPresetAssignments(state, { hunter: 2, gatherer: 1 });
    expect(updates.story?.seen?.hashunter).toBe(true);
    expect(updates.story?.seen?.hasgatherer).toBe(true);
  });
});
