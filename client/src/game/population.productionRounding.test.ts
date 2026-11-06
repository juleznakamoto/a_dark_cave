import { describe, expect, it } from "vitest";
import { gameStateSchema, type GameState } from "@shared/schema";
import { getJobProductionComposition } from "./jobProductionComposition";
import { getPopulationProduction } from "./population";

function stateOf(partial: Record<string, unknown>): GameState {
  return gameStateSchema.parse(partial);
}

function amount(
  state: GameState,
  count: number,
  resource: string,
): number {
  return getPopulationProduction("moonstone_miner", count, state).find(
    (row) => row.resource === resource,
  )!.totalAmount;
}

describe("population production rounding", () => {
  it("keeps a small job linear when no percent effect is active", () => {
    const state = stateOf({});
    expect(amount(state, 1, "moonstone")).toBe(1);
    expect(amount(state, 2, "moonstone")).toBe(2);
    expect(amount(state, 4, "moonstone")).toBe(4);
    expect(amount(state, 2, "food")).toBe(-100);
  });

  it("gives the next worker a share when a penalty is multiplied by Heartfire", () => {
    const state = stateOf({
      stats: { madnessFromEvents: 50 },
      heartfireState: { level: 20, lastLevelDecrease: 0 },
      blessings: { ebon_grace: true },
      chosenPacts: ["blazesmith"],
      books: { book_of_chainmaster: true },
      chainmasterSkills: { level: 0 },
    });

    const first = amount(state, 1, "moonstone");
    const second = amount(state, 2, "moonstone") - first;
    const third = amount(state, 3, "moonstone") - amount(state, 2, "moonstone");
    expect(first).toBeGreaterThan(1);
    expect(second).toBeGreaterThanOrEqual(first - 1);
    expect(third).toBeGreaterThanOrEqual(first - 1);
    expect(amount(state, 2, "food")).toBe(amount(state, 1, "food") * 2);

    const lines = getJobProductionComposition("moonstone_miner", 2, state);
    const moonstoneLines = lines.filter((line) => line.resource === "moonstone");
    const summed = moonstoneLines.reduce((sum, line) => sum + line.amount, 0);
    expect(summed).toBe(amount(state, 2, "moonstone"));
  });
});
