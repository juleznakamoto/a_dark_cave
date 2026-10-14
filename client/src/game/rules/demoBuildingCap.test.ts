import { beforeEach, describe, expect, it, vi } from "vitest";
import { gameStateSchema, type GameState } from "@shared/schema";

vi.mock("@/lib/edition", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/edition")>();
  return {
    ...actual,
    isDemoEdition: vi.fn(() => true),
  };
});

import { shouldShowAction } from "./index";
import { isDemoEdition } from "@/lib/edition";

const isDemoEditionMock = vi.mocked(isDemoEdition);

function stateWith(buildings: GameState["buildings"]): GameState {
  return gameStateSchema.parse({ buildings });
}

describe("demo building cap", () => {
  beforeEach(() => {
    isDemoEditionMock.mockReturnValue(true);
  });

  it("keeps building buttons that were already available at 8 wooden huts", () => {
    const state = stateWith({
      woodenHut: 8,
      clerksHut: 1,
      scriptorium: 0,
      cabin: 0,
    });

    expect(shouldShowAction("buildScriptorium", state)).toBe(true);
    expect(shouldShowAction("buildCabin", state)).toBe(true);
  });

  it("hides building buttons that unlock at 8 wooden huts", () => {
    const state = stateWith({
      woodenHut: 8,
      coinhouse: 0,
      timberMill: 0,
      altar: 1,
    });

    expect(shouldShowAction("buildCoinhouse", state)).toBe(false);
    expect(shouldShowAction("buildTimberMill", state)).toBe(false);
    expect(shouldShowAction("buildWoodenHut", state)).toBe(false);
  });

  it("still shows those buttons in the full game", () => {
    isDemoEditionMock.mockReturnValue(false);
    const state = stateWith({ woodenHut: 8, coinhouse: 0, altar: 1 });

    expect(shouldShowAction("buildCoinhouse", state)).toBe(true);
    expect(shouldShowAction("buildWoodenHut", state)).toBe(true);
  });

  it("shows buildings the player qualifies for even when an old roster omitted them", () => {
    const state = stateWith({
      woodenHut: 8,
      blacksmith: 1,
      shallowPit: 0,
      foundry: 0,
      tannery: 0,
      clerksHut: 1,
      scriptorium: 0,
      coinhouse: 0,
    });
    state.tools.iron_pickaxe = true;
    state.demoVisibleBuildingIds = [
      "buildConsecratedPaleCross",
      "buildDarkEstate",
      "buildStorehouse",
      "buildTradePost",
      "buildHeartfire",
      "buildBuildersLodge",
    ];

    expect(shouldShowAction("buildShallowPit", state)).toBe(true);
    expect(shouldShowAction("buildTannery", state)).toBe(true);
    expect(shouldShowAction("buildScriptorium", state)).toBe(true);
    expect(shouldShowAction("buildFoundry", state)).toBe(false);
    expect(shouldShowAction("buildCoinhouse", state)).toBe(false);
  });
});
