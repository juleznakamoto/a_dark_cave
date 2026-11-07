import { describe, expect, it } from "vitest";
import { gameStateSchema } from "@shared/schema";
import { getTotalKnowledge } from "./effectsCalculation";
import { clothingEffects } from "./effects";

describe("Raven's Orb knowledge", () => {
  it("adds exactly the knowledge its effect definition lists", () => {
    const without = gameStateSchema.parse({});
    const withOrb = gameStateSchema.parse({ relics: { ravens_orb: true } });
    const listed = clothingEffects.ravens_orb.bonuses.generalBonuses?.knowledge ?? 0;

    expect(listed).toBeGreaterThan(0);
    expect(getTotalKnowledge(withOrb) - getTotalKnowledge(without)).toBe(listed);
  });
});
