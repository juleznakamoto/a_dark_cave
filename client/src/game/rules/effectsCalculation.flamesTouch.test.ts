import { describe, expect, it } from "vitest";
import { gameStateSchema } from "@shared/schema";
import { getMaxPopulation } from "@/game/population";
import { getBonusComposition } from "./bonusComposition";
import { getTotalCraftingCostReduction } from "./effectsCalculation";

describe("Flame's Touch", () => {
  it("adds 4 housing and a 5% crafting discount", () => {
    const state = gameStateSchema.parse({
      buildings: { woodenHut: 3 },
      blessings: { flames_touch: true },
    });

    expect(getMaxPopulation(state)).toBe(6 + 4);
    expect(getTotalCraftingCostReduction(state)).toBeCloseTo(0.05);
    expect(getBonusComposition("craftingCostReduction", state)).toEqual([
      expect.objectContaining({ sourceId: "flames_touch", percent: 5 }),
    ]);
  });

  it("adds 8 housing and a 15% crafting discount once deepened", () => {
    // Deepening keeps flames_touch set next to flames_touch_enhanced.
    const state = gameStateSchema.parse({
      buildings: { woodenHut: 3 },
      blessings: { flames_touch: true, flames_touch_enhanced: true },
    });

    expect(getMaxPopulation(state)).toBe(6 + 8);
    expect(getTotalCraftingCostReduction(state)).toBeCloseTo(0.15);
    expect(getBonusComposition("craftingCostReduction", state)).toEqual([
      expect.objectContaining({
        sourceId: "flames_touch_enhanced",
        percent: 15,
      }),
    ]);
  });
});
