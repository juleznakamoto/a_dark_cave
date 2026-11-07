import { describe, expect, it } from "vitest";
import type { GameState } from "@shared/schema";
import {
  capSleepGainDeltasToStorageRoom,
  getSleepTotalGainDisplay,
  sleepWholeUnits,
  splitSleepDecimal,
  tidySleepAmount,
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

describe("sleep whole units", () => {
  it("banks a 0.2 rate until the fifth cycle", () => {
    const rate = tidySleepAmount(1 * 0.2);
    expect(rate).toBe(0.2);
    expect(sleepWholeUnits(rate)).toBe(0);
    expect(sleepWholeUnits(tidySleepAmount(rate * 4))).toBe(0);
    expect(sleepWholeUnits(tidySleepAmount(rate * 5))).toBe(1);
  });

  it("does not turn 0.6 into a whole unit", () => {
    expect(sleepWholeUnits(0.6)).toBe(0);
    expect(sleepWholeUnits(1.2)).toBe(1);
  });

  it("truncates costs toward zero so a fraction is not charged yet", () => {
    expect(sleepWholeUnits(-0.4)).toBe(0);
    expect(sleepWholeUnits(-1)).toBe(-1);
    expect(sleepWholeUnits(-1.2)).toBe(-1);
  });

  it("stays on hundredths when 0.2 is added repeatedly", () => {
    let total = 0;
    for (let i = 0; i < 960; i++) total = tidySleepAmount(total + 0.2);
    expect(total).toBe(192);
    expect(sleepWholeUnits(total)).toBe(192);
  });
});

describe("splitSleepDecimal", () => {
  it("uses one decimal when the hundredth is zero", () => {
    expect(splitSleepDecimal(0.2)).toEqual({
      negative: false,
      whole: 0,
      fraction: ".2",
    });
    expect(splitSleepDecimal(19)).toEqual({
      negative: false,
      whole: 19,
      fraction: ".0",
    });
    expect(splitSleepDecimal(-1.4)).toEqual({
      negative: true,
      whole: 1,
      fraction: ".4",
    });
  });

  it("keeps the second decimal for a 5% intensity step", () => {
    expect(splitSleepDecimal(0.25)).toMatchObject({
      whole: 0,
      fraction: ".25",
    });
    expect(splitSleepDecimal(1.05)).toMatchObject({
      whole: 1,
      fraction: ".05",
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
    expect(getSleepTotalGainDisplay("wood", -1.2, 500, state)).toBe(-1.2);
  });

  it("keeps a fractional gain under the storage room", () => {
    const state = stateWithStorage();
    expect(getSleepTotalGainDisplay("wood", 9.6, 490, state)).toBe(9.6);
    expect(getSleepTotalGainDisplay("wood", 10.4, 490, state)).toBe(10);
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
