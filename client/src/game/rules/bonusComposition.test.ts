import { describe, it, expect } from "vitest";
import type { GameState } from "@shared/schema";
import { createInitialState } from "../state";
import {
  getBonusComposition,
  getBonusCompositionTotalPercent,
} from "./bonusComposition";
import { getAllActionBonuses } from "./effectsCalculation";

function createMockState(overrides?: Partial<GameState>): GameState {
  const base = createInitialState();
  return {
    ...base,
    ...overrides,
    tools: { ...base.tools, ...overrides?.tools },
    books: { ...base.books, ...overrides?.books },
    buildings: { ...base.buildings, ...overrides?.buildings },
    buttonUpgrades: { ...base.buttonUpgrades, ...overrides?.buttonUpgrades },
    huntingSkills: overrides?.huntingSkills ?? base.huntingSkills,
    crowsEyeSkills: overrides?.crowsEyeSkills ?? base.crowsEyeSkills,
    chainmasterSkills: overrides?.chainmasterSkills ?? base.chainmasterSkills,
    clothing: { ...base.clothing, ...overrides?.clothing },
    relics: { ...base.relics, ...overrides?.relics },
  } as GameState;
}

describe("getBonusComposition", () => {
  it("breaks down chop wood from the equipped axe", () => {
    const state = createMockState({
      tools: { stone_axe: true },
    });
    const lines = getBonusComposition("chopWood", state);
    expect(lines).toEqual([
      expect.objectContaining({
        sourceId: "stone_axe",
        percent: 50,
      }),
    ]);
  });

  it("includes Book of Ascension button upgrade once for cave explore", () => {
    const state = createMockState({
      tools: { iron_lantern: true },
      books: { book_of_ascension: true },
      buttonUpgrades: { caveExplore: { clicks: 50, level: 2 } },
    });

    const lines = getBonusComposition("caveExplore", state);
    const upgradeLines = lines.filter((l) => l.sourceId === "book_of_ascension");
    expect(upgradeLines).toHaveLength(1);

    const sidebar = getAllActionBonuses(state).find((b) => b.id === "caveExplore");
    expect(sidebar).toBeDefined();
    const compositionTotal = lines.reduce((sum, l) => sum + l.percent, 0);
    expect(compositionTotal).toBe(Math.round((sidebar!.multiplier - 1) * 100));
  });

  it("includes Huntress Training on hunt", () => {
    const state = createMockState({
      huntingSkills: { level: 2 },
    });
    const lines = getBonusComposition("hunt", state);
    expect(lines.some((l) => l.sourceId === "huntressTraining")).toBe(true);
  });

  it("breaks down crafting cost reduction from items and buildings", () => {
    const state = createMockState({
      tools: { blacksmith_hammer: true },
      buildings: { storehouse: 1 },
    });
    const lines = getBonusComposition("craftingCostReduction", state);
    expect(lines.length).toBeGreaterThan(0);
    const total = lines.reduce((sum, l) => sum + l.percent, 0);
    expect(total).toBe(getBonusCompositionTotalPercent("craftingCostReduction", state));
  });

  it("breaks down double gain chance from Crow's Eye", () => {
    const state = createMockState({
      crowsEyeSkills: { level: 1 },
    });
    const lines = getBonusComposition("doubleGainChance", state);
    expect(lines).toEqual([
      expect.objectContaining({
        sourceId: "crowsEye",
        percent: expect.any(Number),
      }),
    ]);
    expect(lines[0].percent).toBeGreaterThan(0);
  });

  it("breaks down villager production from Chainmaster", () => {
    const state = createMockState({
      books: { book_of_chainmaster: true },
      chainmasterSkills: { level: 0 },
    });
    const lines = getBonusComposition("villagerProductionBonus", state);
    expect(lines).toEqual([
      expect.objectContaining({
        sourceId: "book_of_chainmaster",
        percent: 5,
      }),
    ]);
  });

  it("breaks down building time reduction from builder buildings", () => {
    const state = createMockState({
      buildings: { buildersLodge: 1 },
    });
    const lines = getBonusComposition("buildingTimeReduction", state);
    expect(lines).toEqual([
      expect.objectContaining({
        sourceId: "buildersLodge",
        percent: 5,
        isReduction: true,
      }),
    ]);
  });
});
