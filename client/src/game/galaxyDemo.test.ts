import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  deleteSaveMock,
  restartGameMock,
  setGalaxyTimeUpDialogOpenMock,
  setStateMock,
  stoneHutCountRef,
  galaxyTimeUpDialogOpenRef,
} = vi.hoisted(() => {
  const stoneHutCountRef = { current: 0 };
  const galaxyTimeUpDialogOpenRef = { current: false };

  return {
    deleteSaveMock: vi.fn(async () => { }),
    restartGameMock: vi.fn(async () => { }),
    setGalaxyTimeUpDialogOpenMock: vi.fn(),
    setStateMock: vi.fn(),
    stoneHutCountRef,
    galaxyTimeUpDialogOpenRef,
  };
});

vi.mock("@/lib/edition", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/edition")>();
  return {
    ...actual,
    isGalaxyEdition: vi.fn(() => true),
  };
});

vi.mock("@/game/save", () => ({
  deleteSave: deleteSaveMock,
}));

vi.mock("@/game/state", () => ({
  useGameStore: {
    getState: () => ({
      buildings: { stoneHut: stoneHutCountRef.current },
      galaxyTimeUpDialogOpen: galaxyTimeUpDialogOpenRef.current,
      setGalaxyTimeUpDialogOpen: setGalaxyTimeUpDialogOpenMock,
      restartGame: restartGameMock,
    }),
    setState: setStateMock,
  },
}));

import {
  GALAXY_DEMO_STONE_HUT_LIMIT,
  isGalaxyDemoLimitReached,
  isGalaxyDemoLimitReachedFromState,
  processGalaxyDemoLimit,
  startNewGalaxyDemoGame,
} from "./galaxyDemo";

describe("galaxyDemo", () => {
  beforeEach(() => {
    stoneHutCountRef.current = 0;
    galaxyTimeUpDialogOpenRef.current = false;
    deleteSaveMock.mockClear();
    restartGameMock.mockClear();
    setGalaxyTimeUpDialogOpenMock.mockClear();
    setStateMock.mockClear();
  });

  it("detects when the stone hut limit is reached", () => {
    expect(isGalaxyDemoLimitReached(GALAXY_DEMO_STONE_HUT_LIMIT - 1)).toBe(
      false,
    );
    expect(isGalaxyDemoLimitReached(GALAXY_DEMO_STONE_HUT_LIMIT)).toBe(true);
  });

  it("reads stone hut count from game state", () => {
    expect(
      isGalaxyDemoLimitReachedFromState({
        buildings: { stoneHut: GALAXY_DEMO_STONE_HUT_LIMIT },
      }),
    ).toBe(true);
  });

  it("opens the demo-end dialog when the limit is reached", () => {
    stoneHutCountRef.current = GALAXY_DEMO_STONE_HUT_LIMIT;

    processGalaxyDemoLimit();

    expect(setStateMock).toHaveBeenCalledWith({
      galaxyTimeUpDialogOpen: true,
    });
  });

  it("does not reopen the dialog when it is already open", () => {
    stoneHutCountRef.current = GALAXY_DEMO_STONE_HUT_LIMIT;
    galaxyTimeUpDialogOpenRef.current = true;

    processGalaxyDemoLimit();

    expect(setStateMock).not.toHaveBeenCalled();
  });

  it("starts a new demo run from the dialog", async () => {
    await startNewGalaxyDemoGame();

    expect(setGalaxyTimeUpDialogOpenMock).toHaveBeenCalledWith(false);
    expect(deleteSaveMock).toHaveBeenCalled();
    expect(restartGameMock).toHaveBeenCalled();
  });
});
