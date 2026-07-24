import { afterEach, describe, expect, it } from "vitest";
import { createInitialState } from "../state";
import {
  getActionBonuses,
  STEAM_DEMO_ACTION_RESOURCE_BONUS,
} from "./effectsCalculation";
import { setDevGameModeOverride } from "@/lib/edition";

// Register actions
import "./index";

afterEach(() => {
  setDevGameModeOverride("normal");
});

describe("Steam Demo action resource bonus", () => {
  it("does not apply outside Steam Demo", () => {
    const state = createInitialState();
    expect(getActionBonuses("chopWood", state).resourceMultiplier).toBe(1);
    expect(getActionBonuses("mineStone", state).resourceMultiplier).toBe(1);
    expect(getActionBonuses("exploreCave", state).resourceMultiplier).toBe(1);
  });

  it("adds +50% resourceMultiplier for actions in Steam Demo", () => {
    setDevGameModeOverride("steamDemo");
    const state = createInitialState();
    const expected = 1 + STEAM_DEMO_ACTION_RESOURCE_BONUS;

    expect(getActionBonuses("chopWood", state).resourceMultiplier).toBe(expected);
    expect(getActionBonuses("mineStone", state).resourceMultiplier).toBe(expected);
    expect(getActionBonuses("exploreCave", state).resourceMultiplier).toBe(expected);
  });
});
