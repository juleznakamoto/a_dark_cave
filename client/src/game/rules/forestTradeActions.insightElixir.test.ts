import { describe, it, expect } from "vitest";
import { gameStateSchema } from "@shared/schema";
import type { ActionResult } from "@/game/actions";
import "@/game/rules"; // register actions for applyActionEffects
import { getActionCostBreakdown } from "./index";
import {
  getInsightElixirGoldCost,
  getInsightElixirPurchaseCount,
  handleTradeAction,
  INSIGHT_ELIXIR_GOLD_BASE,
  INSIGHT_ELIXIR_GOLD_MAX,
  INSIGHT_ELIXIR_GOLD_MID,
} from "./forestTradeActions";

function stateWithPurchases(purchases: number) {
  return gameStateSchema.parse({
    resources: { gold: 5000, insight: 0 },
    buildings: { clerksHut: 1, tradePost: 1 },
    story: {
      seen: purchases > 0 ? { insightElixirPurchases: purchases } : {},
    },
  });
}

describe("Insight Elixir gold ladder", () => {
  it("starts at 250 and rises by 50 until 500", () => {
    const expected = [250, 300, 350, 400, 450, 500];
    for (let i = 0; i < expected.length; i++) {
      expect(getInsightElixirGoldCost(stateWithPurchases(i))).toBe(expected[i]);
    }
    expect(getInsightElixirGoldCost(stateWithPurchases(0))).toBe(
      INSIGHT_ELIXIR_GOLD_BASE,
    );
    expect(getInsightElixirGoldCost(stateWithPurchases(5))).toBe(
      INSIGHT_ELIXIR_GOLD_MID,
    );
  });

  it("then rises by 100 until 1000 and caps there", () => {
    expect(getInsightElixirGoldCost(stateWithPurchases(6))).toBe(600);
    expect(getInsightElixirGoldCost(stateWithPurchases(7))).toBe(700);
    expect(getInsightElixirGoldCost(stateWithPurchases(8))).toBe(800);
    expect(getInsightElixirGoldCost(stateWithPurchases(9))).toBe(900);
    expect(getInsightElixirGoldCost(stateWithPurchases(10))).toBe(1000);
    expect(getInsightElixirGoldCost(stateWithPurchases(11))).toBe(
      INSIGHT_ELIXIR_GOLD_MAX,
    );
    expect(getInsightElixirGoldCost(stateWithPurchases(50))).toBe(
      INSIGHT_ELIXIR_GOLD_MAX,
    );
  });

  it("increments purchase count on trade and charges ladder gold", () => {
    const state = stateWithPurchases(2);
    expect(getInsightElixirPurchaseCount(state)).toBe(2);
    expect(getInsightElixirGoldCost(state)).toBe(350);

    const result: ActionResult = {
      stateUpdates: {},
      logEntries: [],
      delayedEffects: [],
    };
    handleTradeAction("tradeGoldForInsightPotion", state, result);

    expect(result.stateUpdates.story?.seen?.insightElixirPurchases).toBe(3);
    expect(result.stateUpdates.resources?.gold).toBe(5000 - 350);
    expect(result.stateUpdates.resources?.insight).toBe(3000);
  });

  it("exposes the next gold cost for the purchase tooltip", () => {
    const state = stateWithPurchases(2);
    const breakdown = getActionCostBreakdown(
      "tradeGoldForInsightPotion",
      state,
    );
    expect(breakdown).toHaveLength(1);
    expect(breakdown[0].text).toContain("350");
    expect(breakdown[0].satisfied).toBe(true);

    const broke = stateWithPurchases(0);
    broke.resources.gold = 100;
    const unaffordable = getActionCostBreakdown(
      "tradeGoldForInsightPotion",
      broke,
    );
    expect(unaffordable[0].text).toContain("250");
    expect(unaffordable[0].satisfied).toBe(false);
  });
});
