import { describe, expect, it } from "vitest";
import type { GameState } from "@shared/schema";
import {
  buildVillagerScarcityLogEntries,
  VILLAGERS_FREEZING_LOG_KEY,
  VILLAGERS_STARVING_LOG_KEY,
} from "./villagerScarcityLog";

function state(partial: {
  population: number;
  wood: number;
  food: number;
  hasHunted?: boolean;
}): Pick<GameState, "current_population" | "resources" | "story"> {
  return {
    current_population: partial.population,
    resources: { wood: partial.wood, food: partial.food } as GameState["resources"],
    story: { seen: { hasHunted: partial.hasHunted ?? false } } as GameState["story"],
  };
}

describe("buildVillagerScarcityLogEntries", () => {
  const now = 1_700_000_000_000;

  it("stays quiet when nobody lives in the village", () => {
    expect(
      buildVillagerScarcityLogEntries(
        state({ population: 0, wood: 0, food: 0, hasHunted: true }),
        now,
      ),
    ).toEqual([]);
  });

  it("logs freezing once when wood is empty", () => {
    const entries = buildVillagerScarcityLogEntries(
      state({ population: 4, wood: 0, food: 12, hasHunted: true }),
      now,
    );
    expect(entries).toHaveLength(1);
    expect(entries[0]?.logKey).toBe(VILLAGERS_FREEZING_LOG_KEY);
    expect(entries[0]?.message).toBe("The villagers are freezing.");
  });

  it("logs starving once when food is empty after the hunt", () => {
    const entries = buildVillagerScarcityLogEntries(
      state({ population: 3, wood: 8, food: 0, hasHunted: true }),
      now,
    );
    expect(entries).toHaveLength(1);
    expect(entries[0]?.logKey).toBe(VILLAGERS_STARVING_LOG_KEY);
    expect(entries[0]?.message).toBe("The villagers are starving.");
  });

  it("does not call villagers starving before they eat", () => {
    expect(
      buildVillagerScarcityLogEntries(
        state({ population: 3, wood: 8, food: 0, hasHunted: false }),
        now,
      ),
    ).toEqual([]);
  });

  it("logs each empty resource once when both are gone", () => {
    const entries = buildVillagerScarcityLogEntries(
      state({ population: 2, wood: 0, food: 0, hasHunted: true }),
      now,
    );
    expect(entries.map((entry) => entry.logKey)).toEqual([
      VILLAGERS_FREEZING_LOG_KEY,
      VILLAGERS_STARVING_LOG_KEY,
    ]);
  });

  it("stays quiet while both stores still have something", () => {
    expect(
      buildVillagerScarcityLogEntries(
        state({ population: 6, wood: 1, food: 1, hasHunted: true }),
        now,
      ),
    ).toEqual([]);
  });
});
