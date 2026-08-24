import { describe, expect, it } from "vitest";
import type { GameState } from "@shared/schema";
import {
  capSleepGainDeltasToStorageRoom,
  getSleepTotalGainDisplay,
  roundSleepCycleRates,
} from "./sleepGainDisplay";

function stateWithStorage(storageBuilding?: string): GameState {
  const buildings = {
    supplyHut: 0,
    storehouse: 0,
    fortifiedStorehouse: 0,
    villageWarehouse: 0,
    grandRepository: 0,
    greatVault: 0,
  } as GameState["buildings"];
  if (storageBuilding) {
    (buildings as Record<string, number>)[storageBuilding] = 1;
  }
  return { buildings, clothing: {} } as GameState;
}

describe("roundSleepCycleRates", () => {
  it("rounds half-up so a 0.6 food rate pays 1 per cycle", () => {
    expect(roundSleepCycleRates({ food: 0.6, wood: 5.4, bones: 0.4 })).toEqual({
      food: 1,
      wood: 5,
    });
  });

  it("rounds 0.5 to 1 and drops exact zeros", () => {
    expect(roundSleepCycleRates({ food: 0.5, stone: 0, fur: -0.4 })).toEqual({
      food: 1,
    });
  });

  it("keeps whole-number consumption", () => {
    expect(roundSleepCycleRates({ food: -0.6, wood: -2 })).toEqual({
      food: -1,
      wood: -2,
    });
  });
});

describe("sleep total gain vs storage max", () => {
  it("caps displayed total gain at remaining storage room", () => {
    // Default storage cap = 500
    const state = stateWithStorage();
    expect(getSleepTotalGainDisplay("wood", 999, 500, state)).toBe(0);
    expect(getSleepTotalGainDisplay("wood", 999, 400, state)).toBe(100);
    expect(getSleepTotalGainDisplay("wood", 40, 400, state)).toBe(40);
  });

  it("does not raise total when sleep starts already at max", () => {
    const state = stateWithStorage("storehouse"); // cap 2500
    expect(getSleepTotalGainDisplay("food", 500, 2500, state)).toBe(0);
    expect(getSleepTotalGainDisplay("food", 1, 2500, state)).toBe(0);
  });

  it("leaves unlimited resources uncapped", () => {
    const state = stateWithStorage();
    expect(getSleepTotalGainDisplay("insight", 1234, 0, state)).toBe(1234);
    expect(getSleepTotalGainDisplay("gold", 50, 0, state)).toBe(50);
  });

  it("preserves negative totals (net loss)", () => {
    const state = stateWithStorage();
    expect(getSleepTotalGainDisplay("wood", -25, 500, state)).toBe(-25);
  });

  it("caps accumulated deltas so wake payout cannot exceed room", () => {
    const state = stateWithStorage();
    const capped = capSleepGainDeltasToStorageRoom(
      { wood: 200, food: -10, insight: 5 },
      { wood: 450, food: 500, insight: 0 },
      state,
    );
    expect(capped.wood).toBe(50);
    expect(capped.food).toBe(-10);
    expect(capped.insight).toBe(5);
  });
});
