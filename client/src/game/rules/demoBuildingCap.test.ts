import { beforeEach, describe, expect, it, vi } from "vitest";
import { gameStateSchema, type GameState } from "@shared/schema";

vi.mock("@/lib/edition", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/edition")>();
  return {
    ...actual,
    isDemoEdition: vi.fn(() => true),
  };
});

import { canExecuteAction, shouldShowAction } from "./index";
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

  it("hides Deepening Pit and Black Monolith in the demo", () => {
    const state = stateWith({
      woodenHut: 4,
      shallowPit: 1,
      deepeningPit: 0,
      blackMonolith: 0,
    });
    state.tools.steel_pickaxe = true;
    state.flags.monolithUnlocked = true;
    state.resources.wood = 5000;
    state.resources.stone = 5000;
    state.resources.iron = 1000;
    state.resources.adamant = 1000;

    expect(shouldShowAction("buildDeepeningPit", state)).toBe(false);
    expect(shouldShowAction("buildBlackMonolith", state)).toBe(false);
    expect(canExecuteAction("buildDeepeningPit", state)).toBe(false);
    expect(canExecuteAction("buildBlackMonolith", state)).toBe(false);
  });

  it("still allows Deepening Pit and Black Monolith in the full game", () => {
    isDemoEditionMock.mockReturnValue(false);
    const state = stateWith({
      woodenHut: 4,
      shallowPit: 1,
      deepeningPit: 0,
      blackMonolith: 0,
    });
    state.tools.steel_pickaxe = true;
    state.flags.monolithUnlocked = true;
    state.resources.wood = 5000;
    state.resources.stone = 5000;
    state.resources.iron = 1000;
    state.resources.adamant = 1000;

    expect(shouldShowAction("buildDeepeningPit", state)).toBe(true);
    expect(shouldShowAction("buildBlackMonolith", state)).toBe(true);
    expect(canExecuteAction("buildDeepeningPit", state)).toBe(true);
    expect(canExecuteAction("buildBlackMonolith", state)).toBe(true);
  });
});
