import { describe, expect, it } from "vitest";
import { createInitialState } from "../state";
import { caveExploreActions } from "./caveExploreActions";
import { clothingEffects } from "./effects";

function resolveVentureDeeperEffects() {
  const state = createInitialState();
  const effects = caveExploreActions.ventureDeeper.effects;
  return typeof effects === "function" ? effects(state) : effects;
}

describe("fang_charm", () => {
  it("grants +3 strength and +1 madness", () => {
    expect(clothingEffects.fang_charm.bonuses.generalBonuses).toEqual({
      strength: 3,
      madness: 1,
    });
  });

  it("is a 10% Venture Deeper clothing drop", () => {
    expect(resolveVentureDeeperEffects()["clothing.fang_charm"]).toMatchObject({
      probability: 0.1,
      value: true,
      condition: "!clothing.fang_charm",
    });
  });
});
