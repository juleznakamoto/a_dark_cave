import { describe, expect, it } from "vitest";
import { gameStateSchema, type GameState } from "@shared/schema";
import {
  getJobProductionComposition,
  getOrderedJobProductionGroups,
  groupJobProductionComposition,
} from "./jobProductionComposition";
import { getPopulationProduction } from "./population";

function stateOf(partial: Record<string, unknown>): GameState {
  return gameStateSchema.parse(partial);
}

function amountsFor(
  jobId: string,
  count: number,
  state: GameState,
  resource: string,
) {
  return getJobProductionComposition(jobId, count, state)
    .filter((line) => line.resource === resource)
    .map((line) => ({ sourceId: line.sourceId, amount: line.amount }));
}

function expectCompositionMatchesProduction(
  jobId: string,
  count: number,
  state: GameState,
) {
  const production = getPopulationProduction(jobId, count, state);
  const grouped = groupJobProductionComposition(
    getJobProductionComposition(jobId, count, state),
  );
  for (const prod of production) {
    const group = grouped.find((entry) => entry.resource === prod.resource);
    expect(group?.total ?? 0).toBe(prod.totalAmount);
  }
  for (const group of grouped) {
    const prod = production.find((entry) => entry.resource === group.resource);
    expect(prod?.totalAmount).toBe(group.total);
  }
}

describe("getJobProductionComposition", () => {
  it("lists base yields for an unmodified gatherer", () => {
    const state = stateOf({});
    expect(amountsFor("gatherer", 2, state, "wood")).toEqual([
      { sourceId: "base", amount: 20 },
    ]);
    expect(amountsFor("gatherer", 2, state, "stone")).toEqual([
      { sourceId: "base", amount: 10 },
    ]);
    expectCompositionMatchesProduction("gatherer", 2, state);
  });

  it("splits building bonuses from the base yield", () => {
    const state = stateOf({
      buildings: { timberMill: 1, quarry: 1 },
    });
    expect(amountsFor("gatherer", 3, state, "wood")).toEqual([
      { sourceId: "base", amount: 30 },
      { sourceId: "timberMill", amount: 15 },
    ]);
    expect(amountsFor("gatherer", 3, state, "stone")).toEqual([
      { sourceId: "base", amount: 15 },
      { sourceId: "quarry", amount: 15 },
    ]);
    expectCompositionMatchesProduction("gatherer", 3, state);
  });

  it("lists hunter skills, buildings, and tools separately", () => {
    const state = stateOf({
      buildings: { greatCabin: 1 },
      huntingSkills: { level: 1 },
      blessings: { sharp_aim: true },
      tools: { bone_saw: true },
    });
    expect(amountsFor("hunter", 1, state, "food")).toEqual([
      { sourceId: "base", amount: 5 },
      { sourceId: "greatCabin", amount: 5 },
      { sourceId: "huntressTraining", amount: 5 },
      { sourceId: "sharp_aim", amount: 5 },
    ]);
    expect(amountsFor("hunter", 1, state, "fur")).toEqual([
      { sourceId: "base", amount: 1 },
      { sourceId: "greatCabin", amount: 1 },
      { sourceId: "bone_saw", amount: 1 },
    ]);
    expectCompositionMatchesProduction("hunter", 1, state);
  });

  it("attributes percentage bonuses as the amount they add", () => {
    const state = stateOf({
      books: { book_of_chainmaster: true },
      chainmasterSkills: { level: 0 },
      heartfireState: { level: 2, lastLevelDecrease: 0 },
      blessings: { ebon_grace: true },
    });
    expect(amountsFor("gatherer", 1, state, "wood").map((line) => line.sourceId)).toEqual([
      "base",
      "heartfire",
      "ebon_grace",
      "book_of_chainmaster",
    ]);
    expectCompositionMatchesProduction("gatherer", 1, state);

    const cursed = stateOf({
      curseState: { isActive: true, endTime: Date.now() + 60_000 },
    });
    expect(amountsFor("gatherer", 1, cursed, "wood")).toEqual([
      { sourceId: "base", amount: 10 },
      { sourceId: "witchsCurse", amount: -5 },
    ]);
    expect(amountsFor("iron_miner", 1, cursed, "food")).toEqual([
      { sourceId: "base", amount: -5 },
    ]);
    expectCompositionMatchesProduction("iron_miner", 1, cursed);
  });

  it("keeps scholar insight as the clerk building only", () => {
    const future = Date.now() + 60_000;
    const state = stateOf({
      buildings: { scriptorium: 1, clerksHut: 1 },
      feastState: { isActive: true, endTime: future, lastAcceptedLevel: 1 },
      heartfireState: { level: 4, lastLevelDecrease: 0 },
    });
    expect(amountsFor("scholar", 2, state, "insight")).toEqual([
      { sourceId: "scriptorium", amount: 4 },
    ]);
    expect(amountsFor("scholar", 2, state, "food").map((line) => line.sourceId)).toEqual([
      "base",
      "villageFeast",
    ]);
    expectCompositionMatchesProduction("scholar", 2, state);

    const rowOrder = getPopulationProduction("scholar", 2, state).map(
      (entry) => entry.resource,
    );
    const oneScholar = getOrderedJobProductionGroups("scholar", 1, state);
    expect(oneScholar.map((group) => group.resource)).toEqual(rowOrder);
    expect(oneScholar.find((group) => group.resource === "insight")?.total).toBe(2);
    expect(oneScholar.find((group) => group.resource === "food")?.total).toBe(-10);
  });

  it("includes feast on consumption and dev mode on the final total", () => {
    const future = Date.now() + 60_000;
    const state = stateOf({
      feastState: { isActive: true, endTime: future, lastAcceptedLevel: 1 },
    });
    state.devMode = true;
    expect(amountsFor("tanner", 1, state, "fur")).toEqual([
      { sourceId: "base", amount: -10 },
      { sourceId: "villageFeast", amount: -10 },
      { sourceId: "devMode", amount: -160 },
    ]);
    expectCompositionMatchesProduction("tanner", 1, state);
    expectCompositionMatchesProduction("free", 4, state);
  });
});
