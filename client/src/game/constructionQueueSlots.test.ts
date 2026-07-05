import { describe, expect, it } from "vitest";
import type { GameState } from "@shared/schema";
import { handleLightFire } from "@/game/rules/caveExploreActions";
import { useGameStore } from "@/game/state";
import {
  BASE_QUEUE_SLOTS,
  canBoostConstruction,
  canPurchaseQueueSlot,
  constructionBoostWillFinishBuild,
  getActiveBuildCount,
  getBuilderBuildCostReduction,
  getBuilderBuildTimeReduction,
  getBuildingQueueSlotCount,
  getConstructionBoostCost,
  getConstructionBoostReductionSeconds,
  getNextPurchasableUiSlotIndex,
  getNextQueueSlotUnlockCost,
  getPurchasedQueueSlots,
  getShopQueueSlotCount,
  getTotalQueueSlots,
  getVisibleQueueSlotCount,
  hasFreeQueueSlot,
  isConstructionBoostAvailable,
  isConstructionBoostUnlocked,
  isConstructionQueueEnabled,
  isQueueSlotActive,
  isQueueSlotBuildingLocked,
  isQueueSlotInUse,
  isQueueSlotLockedForUi,
  isQueueSlotNextPurchasable,
  LEGACY_SHOP_QUEUE_SLOT_START,
  MAX_QUEUE_SLOTS,
} from "@/game/constructionQueueSlots";

function baseState(
  overrides: Partial<GameState> = {},
): GameState {
  return {
    flags: {
      constructionQueueEnabled: true,
      villagerCapsEnabled: true,
    } as GameState["flags"],
    buildings: {
      woodenHut: 4,
      buildersLodge: 0,
      clerksHut: 1,
    } as GameState["buildings"],
    resources: { insight: 10000 } as GameState["resources"],
    constructionQueueSlotsPurchased: 0,
    constructionBoostsUsed: {},
    executionStartTimes: {},
    executionDurations: {},
    ...overrides,
  } as GameState;
}

describe("constructionQueueSlots", () => {
  it("handleLightFire enables construction queue for new games", () => {
    const state = baseState({
      flags: {
        gameStarted: false,
        constructionQueueEnabled: false,
      } as GameState["flags"],
      story: { seen: {}, merchantPurchases: 0, heavySleeperHours: 0 },
    });
    const result = handleLightFire(state, { stateUpdates: {}, logEntries: [] });
    expect(result.stateUpdates.flags?.constructionQueueEnabled).toBe(true);
  });

  it("computes builder tier reductions (highest tier only)", () => {
    expect(getBuilderBuildTimeReduction(0)).toBe(0);
    expect(getBuilderBuildTimeReduction(1)).toBe(0.05);
    expect(getBuilderBuildTimeReduction(2)).toBe(0.1);
    expect(getBuilderBuildTimeReduction(3)).toBe(0.2);
    expect(getBuilderBuildCostReduction(1)).toBe(0);
    expect(getBuilderBuildCostReduction(2)).toBe(0.05);
    expect(getBuilderBuildCostReduction(3)).toBe(0.1);
  });

  it("tracks purchasable queue slots by builder buildings", () => {
    expect(getBuildingQueueSlotCount(baseState())).toBe(0);
    expect(
      getBuildingQueueSlotCount(
        baseState({
          buildings: {
            ...baseState().buildings,
            buildersLodge: 1,
          } as GameState["buildings"],
        }),
      ),
    ).toBe(1);
    expect(
      getBuildingQueueSlotCount(
        baseState({
          buildings: {
            ...baseState().buildings,
            buildersLodge: 1,
            buildersHall: 1,
          } as GameState["buildings"],
        }),
      ),
    ).toBe(1);
    expect(
      getBuildingQueueSlotCount(
        baseState({
          buildings: {
            ...baseState().buildings,
            buildersLodge: 1,
            buildersHall: 1,
            buildersGuild: 1,
          } as GameState["buildings"],
        }),
      ),
    ).toBe(2);
  });

  it("shows three queue slots in the UI", () => {
    expect(getVisibleQueueSlotCount()).toBe(MAX_QUEUE_SLOTS);
    expect(getVisibleQueueSlotCount()).toBe(BASE_QUEUE_SLOTS + 2);
  });

  it("Lodge unlocks first extra slot purchase; Guild unlocks second at 5000 Insight", () => {
    const lodgeState = baseState({
      buildings: {
        ...baseState().buildings,
        buildersLodge: 1,
      } as GameState["buildings"],
    });
    expect(getTotalQueueSlots(lodgeState)).toBe(BASE_QUEUE_SLOTS);
    expect(getNextQueueSlotUnlockCost(lodgeState)).toBe(2500);
    expect(canPurchaseQueueSlot(lodgeState)).toBe(true);

    const lodgePurchased = baseState({
      buildings: {
        ...baseState().buildings,
        buildersLodge: 1,
      } as GameState["buildings"],
      constructionQueueSlotsPurchased: 1,
    });
    expect(getTotalQueueSlots(lodgePurchased)).toBe(BASE_QUEUE_SLOTS + 1);
    expect(getNextQueueSlotUnlockCost(lodgePurchased)).toBeNull();

    const guildState = baseState({
      buildings: {
        ...baseState().buildings,
        buildersLodge: 1,
        buildersHall: 1,
        buildersGuild: 1,
      } as GameState["buildings"],
      constructionQueueSlotsPurchased: 1,
    });
    expect(getNextQueueSlotUnlockCost(guildState)).toBe(5000);
    expect(canPurchaseQueueSlot(guildState)).toBe(true);

    const guildFullyPurchased = baseState({
      buildings: {
        ...baseState().buildings,
        buildersLodge: 1,
        buildersHall: 1,
        buildersGuild: 1,
      } as GameState["buildings"],
      constructionQueueSlotsPurchased: 2,
    });
    expect(getTotalQueueSlots(guildFullyPurchased)).toBe(BASE_QUEUE_SLOTS + 2);
    expect(getNextQueueSlotUnlockCost(guildFullyPurchased)).toBeNull();
  });

  it("derives UI slot state from building tiers and Insight purchases separately", () => {
    const noBuilder = baseState();
    expect(isQueueSlotActive(noBuilder, 0)).toBe(true);
    expect(isQueueSlotLockedForUi(noBuilder, 1)).toBe(true);
    expect(isQueueSlotBuildingLocked(noBuilder, 1)).toBe(true);
    expect(isQueueSlotBuildingLocked(noBuilder, 2)).toBe(true);

    const lodgeOnly = baseState({
      buildings: {
        ...baseState().buildings,
        buildersLodge: 1,
      } as GameState["buildings"],
    });
    expect(isQueueSlotBuildingLocked(lodgeOnly, 1)).toBe(false);
    expect(isQueueSlotLockedForUi(lodgeOnly, 1)).toBe(true);
    expect(isQueueSlotNextPurchasable(lodgeOnly, 0)).toBe(false);
    expect(getNextPurchasableUiSlotIndex(lodgeOnly)).toBe(1);
    expect(isQueueSlotNextPurchasable(lodgeOnly, 1)).toBe(true);
    expect(isQueueSlotBuildingLocked(lodgeOnly, 2)).toBe(true);

    const lodgePurchased = baseState({
      buildings: {
        ...baseState().buildings,
        buildersLodge: 1,
      } as GameState["buildings"],
      constructionQueueSlotsPurchased: 1,
    });
    expect(isQueueSlotActive(lodgePurchased, 1)).toBe(true);
    expect(isQueueSlotLockedForUi(lodgePurchased, 1)).toBe(false);
    expect(isQueueSlotNextPurchasable(lodgePurchased, 2)).toBe(false);

    const guildOnePurchased = baseState({
      buildings: {
        ...baseState().buildings,
        buildersLodge: 1,
        buildersHall: 1,
        buildersGuild: 1,
      } as GameState["buildings"],
      constructionQueueSlotsPurchased: 1,
    });
    expect(isQueueSlotNextPurchasable(guildOnePurchased, 2)).toBe(true);
    expect(getNextPurchasableUiSlotIndex(guildOnePurchased)).toBe(2);
    expect(isQueueSlotLockedForUi(guildOnePurchased, 2)).toBe(true);
    expect(getTotalQueueSlots(guildOnePurchased)).toBe(2);
  });

  it("does not grant a parallel build slot from Builder buildings alone", () => {
    const state = baseState({
      buildings: {
        ...baseState().buildings,
        buildersLodge: 1,
      } as GameState["buildings"],
      executionStartTimes: {
        buildWoodenHut: Date.now(),
      },
      executionDurations: {
        buildWoodenHut: 30,
      },
    });
    expect(getTotalQueueSlots(state)).toBe(BASE_QUEUE_SLOTS);
    expect(hasFreeQueueSlot(state)).toBe(false);
  });

  it("allows parallel builds when extra slots are purchased", () => {
    const state = baseState({
      buildings: {
        ...baseState().buildings,
        buildersLodge: 1,
      } as GameState["buildings"],
      constructionQueueSlotsPurchased: 1,
      executionStartTimes: {
        buildWoodenHut: Date.now(),
      },
      executionDurations: {
        buildWoodenHut: 30,
      },
    });
    expect(getTotalQueueSlots(state)).toBe(2);
    expect(hasFreeQueueSlot(state)).toBe(true);
  });

  it("blocks builds when all queue slots are busy", () => {
    const state = baseState({
      executionStartTimes: {
        buildWoodenHut: Date.now(),
      },
      executionDurations: {
        buildWoodenHut: 30,
      },
    });
    expect(getActiveBuildCount(state)).toBe(1);
    expect(hasFreeQueueSlot(state)).toBe(false);
  });

  it("computes construction boost cost from saved minutes", () => {
    const state = baseState({
      buildings: {
        ...baseState().buildings,
        buildersLodge: 1,
        buildersHall: 1,
      } as GameState["buildings"],
      executionStartTimes: { buildWoodenHut: Date.now() },
      executionDurations: { buildWoodenHut: 360 },
    });
    expect(getConstructionBoostReductionSeconds(state, "buildWoodenHut")).toBe(
      180,
    );
    expect(getConstructionBoostCost(state, "buildWoodenHut")).toBe(750);
    expect(isConstructionBoostUnlocked(state)).toBe(true);
    expect(isConstructionBoostAvailable(state, "buildWoodenHut")).toBe(true);
    expect(canBoostConstruction(state, "buildWoodenHut")).toBe(true);
  });

  it("boostConstruction spends insight and shifts execution start time", () => {
    const startTime = Date.now();
    useGameStore.getState().initialize(
      baseState({
        executionStartTimes: { buildWoodenHut: startTime },
        executionDurations: { buildWoodenHut: 360 },
        buildings: {
          ...baseState().buildings,
          buildersLodge: 1,
          buildersHall: 1,
        } as GameState["buildings"],
        resources: { insight: 1000 } as GameState["resources"],
      }) as Partial<GameState>,
    );

    const ok = useGameStore.getState().boostConstruction("buildWoodenHut");
    expect(ok).toBe(true);

    const next = useGameStore.getState();
    expect(next.resources.insight).toBe(250);
    expect(next.constructionBoostsUsed?.buildWoodenHut).toBe(true);
    expect(next.executionStartTimes?.buildWoodenHut).toBe(
      startTime - 180 * 1000,
    );
    expect(canBoostConstruction(next as GameState, "buildWoodenHut")).toBe(
      false,
    );
  });

  it("is disabled when feature flag is off", () => {
    const state = baseState({
      flags: { constructionQueueEnabled: false } as GameState["flags"],
    });
    expect(isConstructionQueueEnabled(state)).toBe(false);
    expect(hasFreeQueueSlot(state)).toBe(true);
    expect(getPurchasedQueueSlots(state)).toBe(0);
  });

  it("grandfathers legacy shop-purchased queue slots beyond the normal cap", () => {
    const base = baseState();
    expect(getShopQueueSlotCount(base)).toBe(0);
    expect(isQueueSlotActive(base, LEGACY_SHOP_QUEUE_SLOT_START)).toBe(false);
    expect(getTotalQueueSlots(base)).toBe(BASE_QUEUE_SLOTS);

    const withShop = baseState({ constructionQueueSlotsFromShop: 2 });
    expect(getShopQueueSlotCount(withShop)).toBe(2);
    expect(
      isQueueSlotActive(withShop, LEGACY_SHOP_QUEUE_SLOT_START),
    ).toBe(true);
    expect(
      isQueueSlotActive(withShop, LEGACY_SHOP_QUEUE_SLOT_START + 1),
    ).toBe(true);
    expect(getTotalQueueSlots(withShop)).toBe(BASE_QUEUE_SLOTS + 2);
  });

  it("marks used queue slots by active-slot rank, not raw slot index", () => {
    const now = Date.now();
    const state = baseState({
      constructionQueueSlotsFromShop: 2,
      executionStartTimes: {
        buildAlchemistsHall: now,
        buildGrandBlacksmith: now,
        buildImprovedTraps: now,
      },
      executionDurations: {
        buildAlchemistsHall: 60,
        buildGrandBlacksmith: 60,
        buildImprovedTraps: 60,
      },
    });
    expect(getActiveBuildCount(state)).toBe(3);
    expect(getTotalQueueSlots(state)).toBe(BASE_QUEUE_SLOTS + 2);
    expect(isQueueSlotInUse(state, 0)).toBe(true);
    expect(isQueueSlotInUse(state, 1)).toBe(false);
    expect(isQueueSlotInUse(state, 2)).toBe(false);
    expect(isQueueSlotInUse(state, LEGACY_SHOP_QUEUE_SLOT_START)).toBe(true);
    expect(isQueueSlotInUse(state, LEGACY_SHOP_QUEUE_SLOT_START + 1)).toBe(
      true,
    );
  });
});
