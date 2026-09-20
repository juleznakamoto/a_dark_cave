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
