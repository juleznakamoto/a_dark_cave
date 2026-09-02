import { describe, expect, it } from "vitest";
import {
  shouldShowForestGoldShopPlus,
  shouldShowGoldShopPlus,
} from "./GoldShopBadge";

describe("shouldShowGoldShopPlus", () => {
  it("shows only when gold is short, the trader shop is unlocked, and this is not Steam", () => {
    expect(
      shouldShowGoldShopPlus({
        goldUnaffordable: true,
        traderUnlocked: true,
        steamEditionActive: false,
      }),
    ).toBe(true);
  });

  it("hides when the player can afford the gold cost", () => {
    expect(
      shouldShowGoldShopPlus({
        goldUnaffordable: false,
        traderUnlocked: true,
        steamEditionActive: false,
      }),
    ).toBe(false);
  });

  it("hides before the trader has settled", () => {
    expect(
      shouldShowGoldShopPlus({
        goldUnaffordable: true,
        traderUnlocked: false,
        steamEditionActive: false,
      }),
    ).toBe(false);
  });

  it("hides on Steam edition", () => {
    expect(
      shouldShowGoldShopPlus({
        goldUnaffordable: true,
        traderUnlocked: true,
        steamEditionActive: true,
      }),
    ).toBe(false);
  });
});

describe("shouldShowForestGoldShopPlus", () => {
  const shortGold = {
    goldUnaffordable: true,
    traderUnlocked: true,
    steamEditionActive: false,
  };

  it("shows on bombs and elixirs only", () => {
    expect(shouldShowForestGoldShopPlus("tradeGoldForEmberBomb", shortGold)).toBe(
      true,
    );
    expect(shouldShowForestGoldShopPlus("tradeGoldForAshfireBomb", shortGold)).toBe(
      true,
    );
    expect(shouldShowForestGoldShopPlus("tradeGoldForVoidBomb", shortGold)).toBe(
      true,
    );
    expect(
      shouldShowForestGoldShopPlus("tradeGoldForVeinfireElixir", shortGold),
    ).toBe(true);
    expect(
      shouldShowForestGoldShopPlus("tradeGoldForInsightPotion", shortGold),
    ).toBe(true);
    expect(shouldShowForestGoldShopPlus("tradeGoldForFood", shortGold)).toBe(false);
    expect(shouldShowForestGoldShopPlus("tradeGoldForTorch", shortGold)).toBe(
      false,
    );
    expect(shouldShowForestGoldShopPlus("tradeSilverForGold", shortGold)).toBe(
      false,
    );
  });
});
