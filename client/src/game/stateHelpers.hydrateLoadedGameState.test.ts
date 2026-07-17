import { describe, expect, it } from "vitest";
import { gameStateSchema } from "@shared/schema";
import { hydrateLoadedGameState } from "./stateHelpers";

describe("hydrateLoadedGameState", () => {
  it("backfills missing tools/weapons/books and rebuilds tools from story flags", () => {
    const defaults = gameStateSchema.parse({});
    const hydrated = hydrateLoadedGameState({
      playTime: 1000,
      story: { seen: { hasStoneAxe: true }, merchantPurchases: 0, heavySleeperHours: 0 },
    });

    expect(hydrated.tools.stone_axe).toBe(true);
    expect(hydrated.tools.stone_pickaxe).toBe(false);
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

  it("rebuilds wiped buildings from actionBuild story flags", () => {
    const defaults = gameStateSchema.parse({});
    const hydrated = hydrateLoadedGameState({
      playTime: 1000,
      buildings: { ...defaults.buildings, woodenHut: 0, cabin: 0 },
      story: {
        seen: {
          actionBuildWoodenHut: true,
          actionBuildCabin: true,
          actionBuildFortifiedStorehouse: true,
        },
        merchantPurchases: 0,
        heavySleeperHours: 0,
      },
    });

    expect(hydrated.buildings.woodenHut).toBe(1);
    expect(hydrated.buildings.cabin).toBe(1);
    expect(hydrated.buildings.fortifiedStorehouse).toBe(1);
  });

  it("does not lower existing building counts when overlaying story flags", () => {
    const defaults = gameStateSchema.parse({});
    const hydrated = hydrateLoadedGameState({
      buildings: { ...defaults.buildings, woodenHut: 11 },
      story: {
        seen: { actionBuildWoodenHut: true },
        merchantPurchases: 0,
        heavySleeperHours: 0,
      },
    });

    expect(hydrated.buildings.woodenHut).toBe(11);
  });

  it("restores wiped unlock flags from story evidence", () => {
    const defaults = gameStateSchema.parse({});
    const hydrated = hydrateLoadedGameState({
      playTime: 60_000,
      flags: {
        ...defaults.flags,
        gameStarted: false,
        villageUnlocked: false,
        hasLitFire: false,
      },
      story: {
        seen: {
          fireLit: true,
          actionBuildWoodenHut: true,
          hasVillagers: true,
        },
        merchantPurchases: 0,
        heavySleeperHours: 0,
      },
    });

    expect(hydrated.flags.gameStarted).toBe(true);
    expect(hydrated.flags.hasLitFire).toBe(true);
    expect(hydrated.flags.villageUnlocked).toBe(true);
  });
});
