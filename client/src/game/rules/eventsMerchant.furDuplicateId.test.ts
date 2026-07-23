import { describe, it, expect } from "vitest";
import { gameStateSchema } from "@shared/schema";
import { EventManager } from "./events";
import {
  generateMerchantChoices,
  isMerchantTradeCurrentlyAvailable,
} from "./eventsMerchant";

describe("merchant fur sell trade ids", () => {
  const stateAtHut8 = gameStateSchema.parse({
    buildings: { woodenHut: 8, stoneHut: 0, tradePost: 1 },
    resources: {
      fur: 500,
      food: 5000,
      wood: 5000,
      stone: 5000,
      gold: 5000,
    },
    story: { seen: {} },
  });

  it("allows early-tier fur sell at wooden hut 8", () => {
    expect(isMerchantTradeCurrentlyAvailable("sell_fur_100_early", stateAtHut8)).toBe(
      true,
    );
  });

  it("executes early-tier fur sell when offered at wooden hut 8", () => {
    const manualFurTrade = {
      id: "sell_fur_100_early",
      label: "10 Gold",
      cost: "110 Fur",
      buyResource: "gold",
      buyAmount: 10,
      sellResource: "fur",
      sellAmount: 110,
      executed: false,
    };

    const result = EventManager.applyEventChoice(
      {
        ...stateAtHut8,
        merchantTrades: { choices: [manualFurTrade], purchasedIds: [] },
      },
      "sell_fur_100_early",
      "merchant",
    );

    expect(result.resources?.fur).toBe(390);
    expect(result.merchantTrades?.purchasedIds).toContain("sell_fur_100_early");
  });

  it("keeps very-early fur sell separate at wooden hut 5", () => {
    const stateAtHut5 = gameStateSchema.parse({
      buildings: { woodenHut: 5, stoneHut: 0, tradePost: 1 },
      resources: { fur: 500 },
      story: { seen: {} },
    });
    expect(
      isMerchantTradeCurrentlyAvailable("sell_fur_100_very_early", stateAtHut5),
    ).toBe(true);
    expect(
      isMerchantTradeCurrentlyAvailable("sell_fur_100_early", stateAtHut5),
    ).toBe(true);
  });

  it("can generate early-tier fur sell offers at wooden hut 8", () => {
    let sawFurTrade = false;
    for (let i = 0; i < 50; i++) {
      const choices = generateMerchantChoices(stateAtHut8);
      if (choices.some((c) => c.id === "sell_fur_100_early")) {
        sawFurTrade = true;
        break;
      }
    }
    expect(sawFurTrade).toBe(true);
  });
});

describe("merchant post-last-wave totem buys", () => {
  it("does not offer bone/leather totems before wave 10 victory", () => {
    const state = gameStateSchema.parse({
      buildings: { woodenHut: 10, stoneHut: 8, tradePost: 1 },
      resources: { gold: 50_000 },
      story: { seen: {} },
    });

    expect(
      isMerchantTradeCurrentlyAvailable(
        "buy_bone_totem_500_post_wave",
        state,
      ),
    ).toBe(false);
    expect(
      isMerchantTradeCurrentlyAvailable(
        "buy_leather_totem_500_post_wave",
        state,
      ),
    ).toBe(false);

    const choices = generateMerchantChoices(state);
    expect(choices.some((c) => c.id === "buy_bone_totem_500_post_wave")).toBe(
      false,
    );
    expect(
      choices.some((c) => c.id === "buy_leather_totem_500_post_wave"),
    ).toBe(false);
  });

  it("offers one or both bone/leather totems after wave 10 victory", () => {
    const state = gameStateSchema.parse({
      buildings: { woodenHut: 10, stoneHut: 8, tradePost: 1 },
      resources: { gold: 50_000 },
      story: { seen: { tenthWaveVictory: true } },
    });

    expect(
      isMerchantTradeCurrentlyAvailable(
        "buy_bone_totem_500_post_wave",
        state,
      ),
    ).toBe(true);
    expect(
      isMerchantTradeCurrentlyAvailable(
        "buy_leather_totem_500_post_wave",
        state,
      ),
    ).toBe(true);

    const seenCounts = new Set<number>();
    const seenIds = new Set<string>();
    for (let i = 0; i < 60; i++) {
      const choices = generateMerchantChoices(state);
      const totemOffers = choices.filter(
        (c) =>
          c.id === "buy_bone_totem_500_post_wave" ||
          c.id === "buy_leather_totem_500_post_wave",
      );
      expect(totemOffers.length).toBeGreaterThanOrEqual(1);
      expect(totemOffers.length).toBeLessThanOrEqual(2);
      seenCounts.add(totemOffers.length);
      for (const offer of totemOffers) {
        seenIds.add(offer.id);
        expect(offer.buyAmount).toBe(550);
        expect(["steel", "blacksteel"]).toContain(offer.sellResource);
        if (offer.id === "buy_bone_totem_500_post_wave") {
          expect(offer.buyResource).toBe("bone_totem");
        } else {
          expect(offer.buyResource).toBe("leather_totem");
        }
      }
    }
    expect(seenCounts.has(1)).toBe(true);
    expect(seenCounts.has(2)).toBe(true);
    expect(seenIds.has("buy_bone_totem_500_post_wave")).toBe(true);
    expect(seenIds.has("buy_leather_totem_500_post_wave")).toBe(true);
  });

  it("grants 500 bone totems when the post-wave trade is bought", () => {
    const state = gameStateSchema.parse({
      buildings: { woodenHut: 10, stoneHut: 8, tradePost: 1 },
      resources: { gold: 50_000, bone_totem: 0 },
      story: { seen: { tenthWaveVictory: true } },
    });

    const trade = {
      id: "buy_bone_totem_500_post_wave",
      label: "500 Bone Totem",
      cost: "2750 Gold",
      buyResource: "bone_totem",
      buyAmount: 500,
      sellResource: "gold",
      sellAmount: 2750,
      executed: false,
    };

    const result = EventManager.applyEventChoice(
      {
        ...state,
        merchantTrades: { choices: [trade], purchasedIds: [] },
      },
      "buy_bone_totem_500_post_wave",
      "merchant",
    );

    expect(result.resources?.bone_totem).toBe(500);
    expect(result.resources?.gold).toBe(50_000 - 2750);
    expect(result.merchantTrades?.purchasedIds).toContain(
      "buy_bone_totem_500_post_wave",
    );
  });
});
