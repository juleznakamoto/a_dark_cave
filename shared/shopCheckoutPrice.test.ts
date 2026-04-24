import { describe, it, expect } from "vitest";
import { getDiscountedShopPriceCents } from "./shopCheckoutPrice";

describe("getDiscountedShopPriceCents", () => {
  it("returns non-positive prices unchanged", () => {
    expect(getDiscountedShopPriceCents(0, { playlightFirstPurchase: true })).toBe(
      0,
    );
    expect(getDiscountedShopPriceCents(-10, { tradersGratitude: true })).toBe(
      -10,
    );
  });

  it("applies Playlight as 10% off catalog price (same pattern as Trader's Gratitude)", () => {
    expect(
      getDiscountedShopPriceCents(99, { playlightFirstPurchase: true }),
    ).toBe(89);
    expect(getDiscountedShopPriceCents(99, { tradersGratitude: true })).toBe(74);
  });

  it("uses the better price when both discounts apply", () => {
    expect(
      getDiscountedShopPriceCents(99, {
        playlightFirstPurchase: true,
        tradersGratitude: true,
      }),
    ).toBe(74);
  });

  it("applies Trader's Son as 20% off catalog price", () => {
    expect(getDiscountedShopPriceCents(99, { tradersSonGratitude: true })).toBe(
      79,
    );
  });

  it("uses the best price when Trader's Gratitude, Son, and Playlight all apply", () => {
    expect(
      getDiscountedShopPriceCents(99, {
        playlightFirstPurchase: true,
        tradersGratitude: true,
        tradersSonGratitude: true,
      }),
    ).toBe(74);
  });

  it("returns base price when no discount flags", () => {
    expect(getDiscountedShopPriceCents(99, {})).toBe(99);
  });
});
