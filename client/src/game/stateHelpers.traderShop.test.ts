import { describe, expect, it } from "vitest";
import type { GameState } from "@shared/schema";
import {
  isTraderShopUnlocked,
  migrateTraderShopUnlockOnLoad,
} from "./stateHelpers";

describe("isTraderShopUnlocked", () => {
  it("is false before the trader settles story beat", () => {
    expect(
      isTraderShopUnlocked({
        story: { seen: {} },
        traderDialogOpens: 0,
      }),
    ).toBe(false);
  });

  it("is true after traderSettled", () => {
    expect(
      isTraderShopUnlocked({
        story: { seen: { traderSettled: true } },
        traderDialogOpens: 0,
      }),
    ).toBe(true);
  });

  it("is true when the shop was opened this session before traderSettled is saved", () => {
    expect(
      isTraderShopUnlocked({
        story: { seen: {} },
        traderDialogOpens: 1,
      }),
    ).toBe(true);
  });
});

describe("migrateTraderShopUnlockOnLoad", () => {
  it("grandfathers legacy saves that already had a trade post", () => {
    const patch = migrateTraderShopUnlockOnLoad({
      buildings: { tradePost: 1 } as GameState["buildings"],
      story: { seen: {}, merchantPurchases: 0 },
      traderDialogOpens: 0,
    });

    expect(patch?.story?.seen?.traderSettled).toBe(true);
    expect(patch?.story?.seen?.traderShopUnlockV2Applied).toBe(true);
  });

  it("grandfathers saves that opened the shop before traderSettled existed", () => {
    const patch = migrateTraderShopUnlockOnLoad({
      buildings: { tradePost: 0 } as GameState["buildings"],
      story: { seen: {}, merchantPurchases: 0 },
      traderDialogOpens: 2,
    });

    expect(patch?.story?.seen?.traderSettled).toBe(true);
  });

  it("marks new games on first load without unlocking the trader early", () => {
    const patch = migrateTraderShopUnlockOnLoad({
      buildings: { tradePost: 0 } as GameState["buildings"],
      story: { seen: {}, merchantPurchases: 0 },
      traderDialogOpens: 0,
    });

    expect(patch?.story?.seen?.traderSettled).toBeUndefined();
    expect(patch?.story?.seen?.traderShopUnlockV2Applied).toBe(true);
  });

  it("does not unlock after migration when a new game later builds a trade post", () => {
    const firstLoad = migrateTraderShopUnlockOnLoad({
      buildings: { tradePost: 0 } as GameState["buildings"],
      story: { seen: {}, merchantPurchases: 0 },
      traderDialogOpens: 0,
    });

    const secondLoad = migrateTraderShopUnlockOnLoad({
      buildings: { tradePost: 1 } as GameState["buildings"],
      story: firstLoad!.story!,
      traderDialogOpens: 0,
    });

    expect(secondLoad).toBeNull();
    expect(
      isTraderShopUnlocked({
        story: firstLoad!.story,
        traderDialogOpens: 0,
      }),
    ).toBe(false);
  });

  it("is a no-op once migration has already run", () => {
    expect(
      migrateTraderShopUnlockOnLoad({
        buildings: { tradePost: 1 } as GameState["buildings"],
        story: {
          seen: { traderShopUnlockV2Applied: true, traderSettled: true },
          merchantPurchases: 0,
        },
        traderDialogOpens: 0,
      }),
    ).toBeNull();
  });
});
