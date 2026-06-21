import { describe, it, expect } from "vitest";
import { gameStateSchema } from "@shared/schema";
import { getPopulationProduction } from "./population";

function baseState(level: number) {
  return gameStateSchema.parse({
    books: { book_of_chainmaster: true },
    chainmasterSkills: { level },
    villagers: { gatherer: 1 },
  });
}

describe("Chainmaster production bonus", () => {
  it("applies +5% at level 0", () => {
    const production = getPopulationProduction("gatherer", 1, baseState(0));
    const wood = production.find((p) => p.resource === "wood");
    expect(wood?.totalAmount).toBe(11);
  });

  it("applies +30% at level 5", () => {
    const production = getPopulationProduction("gatherer", 1, baseState(5));
    const wood = production.find((p) => p.resource === "wood");
    expect(wood?.totalAmount).toBe(13);
  });

  it("does not apply without book of chainmaster", () => {
    const state = gameStateSchema.parse({
      books: { book_of_chainmaster: false },
      chainmasterSkills: { level: 5 },
      villagers: { gatherer: 1 },
    });
    const production = getPopulationProduction("gatherer", 1, state);
    const wood = production.find((p) => p.resource === "wood");
    expect(wood?.totalAmount).toBe(10);
  });

  it("does not increase negative consumption", () => {
    const state = gameStateSchema.parse({
      books: { book_of_chainmaster: true },
      chainmasterSkills: { level: 5 },
      villagers: { tanner: 1 },
      resources: { fur: 100, food: 100 },
    });
    const production = getPopulationProduction("tanner", 1, state);
    const fur = production.find((p) => p.resource === "fur");
    expect(fur?.totalAmount).toBeLessThan(0);
    expect(fur?.totalAmount).toBe(-10);
  });
});
