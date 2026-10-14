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
import { handleBuildWoodenHut } from "./villageBuildHandlers";
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

  it("does not reveal a later building after the roster is frozen", () => {
    const beforeClerksHut = stateWith({
      woodenHut: 7,
      clerksHut: 0,
      scriptorium: 0,
      cabin: 0,
    });
    const built = handleBuildWoodenHut(beforeClerksHut, { stateUpdates: {} });
    const roster = built.stateUpdates.demoVisibleBuildingIds ?? [];
    const afterClerksHut = stateWith({
      woodenHut: 8,
      clerksHut: 1,
      scriptorium: 0,
      cabin: 0,
    });
    afterClerksHut.demoVisibleBuildingIds = roster;

    expect(roster).toContain("buildCabin");
    expect(roster).not.toContain("buildScriptorium");
    expect(roster).not.toContain("buildCoinhouse");
    expect(shouldShowAction("buildScriptorium", afterClerksHut)).toBe(false);
    expect(shouldShowAction("buildCabin", afterClerksHut)).toBe(true);
  });
});
