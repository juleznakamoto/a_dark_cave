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
