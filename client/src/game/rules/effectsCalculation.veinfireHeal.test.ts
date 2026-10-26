import { describe, it, expect } from "vitest";
import { createInitialState } from "../state";
import {
  getVeinfireElixirHeal,
  VEINFIRE_ELIXIR_BASE_HEAL,
} from "./effectsCalculation";

describe("getVeinfireElixirHeal", () => {
  it("restores 50 integrity without Blood Baptized", () => {
    expect(VEINFIRE_ELIXIR_BASE_HEAL).toBe(50);
    expect(getVeinfireElixirHeal(createInitialState())).toBe(50);
  });

  it("restores 75 integrity with Blood Baptized", () => {
    const state = createInitialState();
    state.blessings.blood_baptized = true;
    expect(getVeinfireElixirHeal(state)).toBe(75);
  });
});
