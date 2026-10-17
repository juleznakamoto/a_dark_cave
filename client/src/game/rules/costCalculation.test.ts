import { afterEach, describe, expect, it, vi } from "vitest";
import { gameStateSchema } from "@shared/schema";

vi.mock("@/lib/edition", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/edition")>();
  return {
    ...actual,
    isDemoEdition: vi.fn(() => false),
  };
});

import { isDemoEdition } from "@/lib/edition";
import {
  DEMO_DARK_ESTATE_RESOURCE_COST,
  FULL_DARK_ESTATE_RESOURCE_COST,
} from "@/game/demoLimit";
import { calculateAdjustedCost } from "./costCalculation";
import { applyActionCostsOnly } from "./actionEffects";
import { canExecuteAction, getActionCostBreakdown } from "./index";

const isDemoEditionMock = vi.mocked(isDemoEdition);

function emptyState() {
  return gameStateSchema.parse({});
}

describe("calculateAdjustedCost — Dark Estate", () => {
  afterEach(() => {
    isDemoEditionMock.mockReturnValue(false);
  });

  it("keeps 500 wood/stone outside demo editions", () => {
    expect(
      calculateAdjustedCost(
        "buildDarkEstate",
        FULL_DARK_ESTATE_RESOURCE_COST,
        true,
        emptyState(),
        "building",
      ),
    ).toBe(FULL_DARK_ESTATE_RESOURCE_COST);
  });

  it("uses 250 wood/stone in demo editions", () => {
    isDemoEditionMock.mockReturnValue(true);
    expect(
      calculateAdjustedCost(
        "buildDarkEstate",
        FULL_DARK_ESTATE_RESOURCE_COST,
        true,
        emptyState(),
        "building",
      ),
    ).toBe(DEMO_DARK_ESTATE_RESOURCE_COST);
  });

  it("does not rewrite other building costs in demo", () => {
    isDemoEditionMock.mockReturnValue(true);
    expect(
      calculateAdjustedCost("buildWoodenHut", 50, true, emptyState(), "building"),
    ).toBe(50);
  });
});

describe("lantern torch cost", () => {
  function miningState(
    lantern?: "iron_lantern" | "steel_lantern" | "obsidian_lantern" | "adamant_lantern" | "blacksteel_lantern" | "skull_lantern",
    torch = 10,
  ) {
    return gameStateSchema.parse({
      resources: { food: 100, torch },
      tools: {
        stone_pickaxe: true,
        ...(lantern ? { [lantern]: true } : {}),
      },
    });
  }

  function torchCost(actionId: string, base: number, lantern?: Parameters<typeof miningState>[0]) {
    return calculateAdjustedCost(
      actionId,
      base,
      true,
      miningState(lantern),
      undefined,
      "resources.torch",
    );
  }

  it("uses the raised mine bases before any lantern", () => {
    expect(torchCost("mineStone", 2)).toBe(2);
    expect(torchCost("mineIron", 4)).toBe(4);
    expect(torchCost("mineCoal", 4)).toBe(4);
    expect(torchCost("mineSulfur", 6)).toBe(6);
    expect(torchCost("mineObsidian", 9)).toBe(9);
    expect(torchCost("mineAdamant", 14)).toBe(14);
    expect(torchCost("mineMoonstone", 25)).toBe(25);
  });

  it("subtracts one torch per crafted lantern tier and clamps at 0", () => {
    expect(torchCost("mineStone", 2, "iron_lantern")).toBe(1);
    expect(torchCost("mineStone", 2, "steel_lantern")).toBe(0);
    expect(torchCost("mineStone", 2, "blacksteel_lantern")).toBe(0);
    expect(torchCost("mineIron", 4, "adamant_lantern")).toBe(0);
    expect(torchCost("mineCoal", 4, "obsidian_lantern")).toBe(1);
    expect(torchCost("mineSulfur", 6, "blacksteel_lantern")).toBe(1);
    expect(torchCost("mineObsidian", 9, "obsidian_lantern")).toBe(6);
    expect(torchCost("mineAdamant", 14, "adamant_lantern")).toBe(10);
    expect(torchCost("mineMoonstone", 25, "blacksteel_lantern")).toBe(20);
  });

  it("does not let the skull lantern change torch cost", () => {
    expect(torchCost("mineStone", 2, "skull_lantern")).toBe(2);
  });

  it("leaves food costs alone", () => {
    expect(
      calculateAdjustedCost("mineStone", 10, true, miningState("steel_lantern"), undefined, "resources.food"),
    ).toBe(10);
  });

  it("charges the discounted torch cost and skips a clamped cost", () => {
    const iron = applyActionCostsOnly("mineStone", miningState("iron_lantern", 5));
    expect(iron.resources?.torch).toBe(4);
    expect(iron.resources?.food).toBe(90);

    const steel = applyActionCostsOnly("mineStone", miningState("steel_lantern", 0));
    expect(steel.resources?.torch).toBe(0);
    expect(steel.resources?.food).toBe(90);
  });

  it("allows mining with no torches once the lantern covers the cost", () => {
    expect(canExecuteAction("mineStone", miningState(undefined, 0))).toBe(false);
    expect(canExecuteAction("mineStone", miningState("steel_lantern", 0))).toBe(true);
  });

  it("hides a torch line that the lantern reduced to 0", () => {
    const rows = getActionCostBreakdown("mineStone", miningState("steel_lantern", 0));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.satisfied).toBe(true);
  });
});
