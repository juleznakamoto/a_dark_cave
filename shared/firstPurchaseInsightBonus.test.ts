import { describe, expect, it } from "vitest";
import {
  FIRST_PURCHASE_INSIGHT_BONUS,
  PLAYLIGHT_FIRST_PURCHASE_INSIGHT_BONUS,
  firstPurchaseInsightBannerBefore,
  getFirstPurchaseInsightBonus,
  isPlaylightFirstPurchaseBonusActive,
} from "./firstPurchaseInsightBonus";

describe("firstPurchaseInsightBonus", () => {
  it("uses the Playlight amount while the first-purchase bonus is active", () => {
    const state = {
      hasMadeNonFreePurchase: false,
      story: { seen: { playlightFirstPurchaseDiscountActive: true } },
    };
    expect(isPlaylightFirstPurchaseBonusActive(state)).toBe(true);
    expect(getFirstPurchaseInsightBonus(state)).toBe(
      PLAYLIGHT_FIRST_PURCHASE_INSIGHT_BONUS,
    );
  });

  it("uses the Playlight amount for itch, Bored, and Incremental DB referrals", () => {
    for (const seenKey of [
      "itchFirstPurchaseInsightActive",
      "boredFirstPurchaseInsightActive",
      "incrementaldbFirstPurchaseInsightActive",
    ]) {
      const state = {
        hasMadeNonFreePurchase: false,
        story: { seen: { [seenKey]: true } },
      };
      expect(getFirstPurchaseInsightBonus(state)).toBe(
        PLAYLIGHT_FIRST_PURCHASE_INSIGHT_BONUS,
      );
    }
    expect(
      firstPurchaseInsightBannerBefore({
        hasMadeNonFreePurchase: false,
        story: { seen: { itchFirstPurchaseInsightActive: true } },
      }).defaultValue,
    ).toBe("As an itch.io user you receive");
  });

  it("uses the standard amount after a paid purchase or without Playlight", () => {
    expect(
      getFirstPurchaseInsightBonus({
        hasMadeNonFreePurchase: false,
        story: { seen: {} },
      }),
    ).toBe(FIRST_PURCHASE_INSIGHT_BONUS);
    expect(
      isPlaylightFirstPurchaseBonusActive({
        hasMadeNonFreePurchase: true,
        story: { seen: { playlightFirstPurchaseDiscountActive: true } },
      }),
    ).toBe(false);
  });
});
