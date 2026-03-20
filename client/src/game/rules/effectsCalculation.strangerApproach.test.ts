import { describe, it, expect } from "vitest";
import { GameState } from "@shared/schema";
import { createInitialState } from "../state";
import { getStrangerApproachProbability } from "./effectsCalculation";

function createMockState(overrides?: Partial<GameState>): GameState {
  const base = createInitialState();
  const merged = {
    ...base,
    ...overrides,
    buildings: { ...base.buildings, ...overrides?.buildings },
    villagers: { ...base.villagers, ...overrides?.villagers },
  } as GameState;
  if (overrides?.blessings) {
    merged.blessings = { ...(base.blessings || {}), ...overrides.blessings };
  }
  if (overrides?.solsticeState) {
    merged.solsticeState = {
      ...base.solsticeState,
      ...overrides.solsticeState,
    } as GameState["solsticeState"];
  }
  return merged;
}

describe("getStrangerApproachProbability", () => {
  it("should include low population bonus when pop is 0", () => {
    const state = createMockState({
      buildings: { ...createInitialState().buildings, woodenHut: 1 },
      villagers: { ...createInitialState().villagers, free: 0 },
    });
    const result = getStrangerApproachProbability(state);
    expect(result.lowPopulationBonus).toBe(0.5);
    expect(result.probability).toBeGreaterThanOrEqual(0.5); // low pop 0.5
  });

  it("should apply low population bonus of 25% in Cruel Mode when pop <= 4", () => {
    const state = createMockState({
      buildings: { ...createInitialState().buildings, woodenHut: 5 },
      villagers: { ...createInitialState().villagers, free: 2 },
      cruelMode: true,
    });
    const result = getStrangerApproachProbability(state);
    expect(result.lowPopulationBonus).toBe(0.25);
  });

  it("should have no low population bonus when pop > 4", () => {
    const state = createMockState({
      villagers: { ...createInitialState().villagers, free: 5 },
    });
    const result = getStrangerApproachProbability(state);
    expect(result.lowPopulationBonus).toBe(0);
  });

  it("should add fromBuildings for wooden huts", () => {
    const state = createMockState({
      villagers: { ...createInitialState().villagers, free: 5 },
      buildings: { ...createInitialState().buildings, woodenHut: 5 },
    });
    const result = getStrangerApproachProbability(state);
    expect(result.fromBuildings).toBe(0.1); // 5 * 0.02 (wooden hut +2% each)
  });

  it("should aggregate fromBuildings from all housing types", () => {
    const state = createMockState({
      villagers: { ...createInitialState().villagers, free: 5 },
      buildings: {
        ...createInitialState().buildings,
        woodenHut: 2,
        stoneHut: 3,
        longhouse: 2,
        furTents: 2,
      },
    });
    const result = getStrangerApproachProbability(state);
    // 2*0.02 + 3*0.01 + 2*0.005 + 2*0.005 = 0.04 + 0.03 + 0.01 + 0.01 = 0.09
    expect(result.fromBuildings).toBe(0.09);
  });

  it("should add fromBlessings for ravens_mark", () => {
    const state = createMockState({
      buildings: { ...createInitialState().buildings, woodenHut: 5 },
      villagers: { ...createInitialState().villagers, free: 5 },
      blessings: { ravens_mark: true },
    });
    const result = getStrangerApproachProbability(state);
    expect(result.fromBlessings).toBe(0.1);
  });

  it("should add fromBlessings for ravens_mark_enhanced", () => {
    const state = createMockState({
      buildings: { ...createInitialState().buildings, woodenHut: 5 },
      villagers: { ...createInitialState().villagers, free: 5 },
      blessings: { ravens_mark_enhanced: true },
    });
    const result = getStrangerApproachProbability(state);
    expect(result.fromBlessings).toBe(0.15); // ravens_mark_enhanced +15%
  });

  it("should add fromBlessings when both blessings present", () => {
    const state = createMockState({
      buildings: { ...createInitialState().buildings, woodenHut: 5 },
      villagers: { ...createInitialState().villagers, free: 5 },
      blessings: { ravens_mark: true, ravens_mark_enhanced: true },
    });
    const result = getStrangerApproachProbability(state);
    expect(result.fromBlessings).toBeCloseTo(0.25); // ravens_mark 10% + ravens_mark_enhanced 15%
  });

  it("should add fromEvents when Solstice is active", () => {
    const state = createMockState({
      buildings: { ...createInitialState().buildings, woodenHut: 5 },
      villagers: { ...createInitialState().villagers, free: 5 },
      solsticeState: {
        isActive: true,
        endTime: Date.now() + 60000,
        tier: 1,
        activationsCount: 0,
      },
    });
    const result = getStrangerApproachProbability(state);
    expect(result.fromEvents).toBe(0.5);
  });

  it("should cap probability at 100%", () => {
    const state = createMockState({
      villagers: { ...createInitialState().villagers, free: 0 },
      buildings: {
        ...createInitialState().buildings,
        woodenHut: 50,
        stoneHut: 50,
      },
      blessings: { ravens_mark: true, ravens_mark_enhanced: true },
      solsticeState: {
        isActive: true,
        endTime: Date.now() + 60000,
        tier: 1,
        activationsCount: 0,
      },
    });
    const result = getStrangerApproachProbability(state);
    expect(result.probability).toBeLessThanOrEqual(1);
  });

  it("should return 0 probability when at max population but rawChance matches breakdown sum", () => {
    const state = createMockState({
      buildings: { ...createInitialState().buildings, woodenHut: 1 },
      villagers: { ...createInitialState().villagers, free: 2 },
    });
    const result = getStrangerApproachProbability(state);
    expect(result.probability).toBe(0);
    expect(result.atCapacity).toBe(true);
    const breakdownSum =
      result.lowPopulationBonus +
      result.fromBuildings +
      result.fromBlessings +
      result.fromEvents;
    expect(result.rawChance).toBe(breakdownSum); // tooltip main number matches breakdown
    expect(result.fromBuildings).toBe(0.02); // 1 wooden hut +2%
  });

  it("should have breakdown sum equal pre-cap probability", () => {
    const state = createMockState({
      villagers: { ...createInitialState().villagers, free: 2 },
      buildings: {
        ...createInitialState().buildings,
        woodenHut: 3,
        stoneHut: 2,
      },
      blessings: { ravens_mark: true },
    });
    const result = getStrangerApproachProbability(state);
    const preCap =
      result.lowPopulationBonus +
      result.fromBuildings +
      result.fromBlessings +
      result.fromEvents;
    expect(result.probability).toBe(Math.min(1, preCap));
  });
});
