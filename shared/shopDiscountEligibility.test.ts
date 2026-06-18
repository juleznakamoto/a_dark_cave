import { describe, expect, it } from "vitest";
import {
  consumeShopDiscountsInGameState,
  getEligibleShopDiscountOptions,
  resolveAppliedShopDiscountOptions,
} from "./shopDiscountEligibility";
import { userOwnsShopItemFromPurchaseRows } from "./shopPurchaseEligibility";

describe("shopDiscountEligibility", () => {
  it("allows Trader's Gratitude when accepted and not yet used", () => {
    expect(
      getEligibleShopDiscountOptions(
        {
          tradersGratitudeState: { accepted: true },
          triggeredEvents: {},
        },
        "skull_lantern",
      ).tradersGratitude,
    ).toBe(true);
  });

  it("blocks Trader's Gratitude after it was consumed", () => {
    expect(
      getEligibleShopDiscountOptions(
        {
          tradersGratitudeState: { accepted: false },
          triggeredEvents: { traders_gratitude_used: true },
        },
        "skull_lantern",
      ).tradersGratitude,
    ).toBeUndefined();
  });

  it("consumes Trader's Gratitude in game state", () => {
    const next = consumeShopDiscountsInGameState(
      {
        tradersGratitudeState: { accepted: true },
        triggeredEvents: {},
      },
      { tradersGratitude: true },
    );
    expect(next.tradersGratitudeState).toEqual({ accepted: false });
    expect(next.triggeredEvents?.traders_gratitude_used).toBe(true);
  });

  it("ignores client-requested discount flags that are not eligible", () => {
    expect(
      resolveAppliedShopDiscountOptions(
        {
          tradersGratitudeState: { accepted: false },
          triggeredEvents: { traders_gratitude_used: true },
        },
        "skull_lantern",
        { tradersGratitude: true },
      ).tradersGratitude,
    ).toBeUndefined();
  });
});

describe("shopPurchaseEligibility", () => {
  it("detects owned non-repeatable shop items", () => {
    expect(
      userOwnsShopItemFromPurchaseRows("skull_lantern", [
        { item_id: "gold_250" },
      ]),
    ).toBe(false);
    expect(
      userOwnsShopItemFromPurchaseRows("skull_lantern", [
        { item_id: "skull_lantern" },
      ]),
    ).toBe(true);
  });

  it("allows repeat purchases for multi-buy items", () => {
    expect(
      userOwnsShopItemFromPurchaseRows("gold_250", [
        { item_id: "gold_250" },
      ]),
    ).toBe(false);
  });
});
