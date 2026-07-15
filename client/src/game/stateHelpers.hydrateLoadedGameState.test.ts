import { describe, expect, it } from "vitest";
import { gameStateSchema } from "@shared/schema";
import { hydrateLoadedGameState } from "./stateHelpers";

describe("hydrateLoadedGameState", () => {
  it("backfills missing tools/weapons/books from schema defaults", () => {
    const defaults = gameStateSchema.parse({});
    const hydrated = hydrateLoadedGameState({
      playTime: 1000,
      story: { seen: { hasStoneAxe: true }, merchantPurchases: 0, heavySleeperHours: 0 },
    });

    expect(hydrated.tools).toEqual(defaults.tools);
    expect(hydrated.weapons).toEqual(defaults.weapons);
    expect(hydrated.books).toEqual(defaults.books);
    expect(Object.keys(hydrated.tools).length).toBeGreaterThan(0);
  });

  it("preserves owned tools over defaults", () => {
    const hydrated = hydrateLoadedGameState({
      tools: { stone_axe: true },
    } as Partial<ReturnType<typeof gameStateSchema.parse>>);

    expect(hydrated.tools.stone_axe).toBe(true);
  });
});
