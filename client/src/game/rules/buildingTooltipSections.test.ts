import { describe, it, expect } from "vitest";
import "@/game/rules";
import { createInitialState } from "@/game/state";
import { getBuildingUpgradeMarginalEffectLines } from "./buildingTooltipSections";

describe("getBuildingUpgradeMarginalEffectLines", () => {
  it("shows only tier changes for masterwork foundry", () => {
    const state = {
      ...createInitialState(),
      BTP: 0,
    };

    const lines = getBuildingUpgradeMarginalEffectLines(
      "masterworkFoundry",
      state,
    );

    expect(lines).toEqual([
      "Unlocks Blacksteel Forgers",
      "Steel Forger: +2 Steel",
    ]);
  });

  it("shows all effects for the first tier in a chain", () => {
    const state = createInitialState();

    const lines = getBuildingUpgradeMarginalEffectLines("foundry", state);

    expect(lines).toEqual(["Unlocks Steel Forgers"]);
  });
});
