import { describe, expect, it } from "vitest";
import { gameStateSchema } from "@shared/schema";
import { hydrateLoadedGameState } from "./stateHelpers";

describe("hydrateLoadedGameState", () => {
  it("backfills missing permanent slices and rebuilds tools from story flags", () => {
    const defaults = gameStateSchema.parse({});
    const hydrated = hydrateLoadedGameState({
      playTime: 1000,
      story: { seen: { hasStoneAxe: true }, merchantPurchases: 0, heavySleeperHours: 0 },
    });

    expect(hydrated.tools.stone_axe).toBe(true);
    expect(hydrated.tools.stone_pickaxe).toBe(false);
    expect(hydrated.weapons).toEqual(defaults.weapons);
    expect(hydrated.books).toEqual(defaults.books);
    expect(hydrated.fellowship).toEqual(defaults.fellowship);
    expect(hydrated.blessings).toEqual(defaults.blessings);
    expect(hydrated.schematics).toEqual(defaults.schematics);
    expect(hydrated.clothing).toEqual(defaults.clothing);
    expect(hydrated.relics).toEqual(defaults.relics);
    expect(Object.keys(hydrated.tools).length).toBeGreaterThan(0);
    expect(hydrated.flags.villageUnlocked).toBe(true);
  });

  it("preserves owned tools over defaults", () => {
    const hydrated = hydrateLoadedGameState({
      tools: { stone_axe: true },
    } as Partial<ReturnType<typeof gameStateSchema.parse>>);

    expect(hydrated.tools.stone_axe).toBe(true);
  });

  it("repairs missing unlock flags from buildings/weapons (account-create wipe)", () => {
    const hydrated = hydrateLoadedGameState({
      flags: {
        gameStarted: true,
        hasHitResourceLimit: true,
        villagerCapsEnabled: true,
      },
      tools: { stone_axe: true, steel_axe: true },
      weapons: { crude_bow: true, long_bow: true },
      buildings: { woodenHut: 7, clerksHut: 1, darkEstate: 1 },
    } as Partial<ReturnType<typeof gameStateSchema.parse>>);

    expect(hydrated.flags.villageUnlocked).toBe(true);
    expect(hydrated.flags.forestUnlocked).toBe(true);
  });

  it("strips removed Book of Craftsmanship from legacy saves", () => {
    const hydrated = hydrateLoadedGameState({
      books: {
        book_of_trials: true,
        book_of_craftsmanship: true,
      } as unknown as ReturnType<typeof gameStateSchema.parse>["books"],
    });

    expect(hydrated.books.book_of_trials).toBe(true);
    expect(
      Object.prototype.hasOwnProperty.call(
        hydrated.books,
        "book_of_craftsmanship",
      ),
    ).toBe(false);
  });

  it("defaults missing absolvedItems and preserves cleansed relics", () => {
    const missing = hydrateLoadedGameState({ playTime: 10 });
    expect(missing.absolvedItems).toEqual({});

    const hydrated = hydrateLoadedGameState({
      absolvedItems: { unnamed_book: true },
    });
    expect(hydrated.absolvedItems.unnamed_book).toBe(true);
  });
});
