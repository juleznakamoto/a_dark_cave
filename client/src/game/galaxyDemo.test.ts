import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

vi.stubGlobal("localStorage", localStorageMock);

vi.mock("@/lib/edition", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/edition")>();
  return {
    ...actual,
    isGalaxyEdition: vi.fn(() => true),
  };
});

const deleteSaveMock = vi.fn(async () => { });
const restartGameMock = vi.fn(async () => { });
const setGalaxyTimeUpDialogOpenMock = vi.fn();

vi.mock("@/game/save", () => ({
  deleteSave: deleteSaveMock,
}));

vi.mock("@/game/state", () => ({
  useGameStore: {
    getState: () => ({
      setGalaxyTimeUpDialogOpen: setGalaxyTimeUpDialogOpenMock,
      restartGame: restartGameMock,
    }),
  },
}));

import {
  GALAXY_PLAY_TIME_LIMIT_MS,
  getGalaxyTotalPlayTimeMs,
  initGalaxyDemoSession,
  isGalaxyPlayTimeLimitReached,
  persistGalaxyDemoProgress,
  resetGalaxyDemoStateForTests,
  startNewGalaxyDemoGame,
} from "./galaxyDemo";

describe("galaxyDemo", () => {
  beforeEach(() => {
    localStorageMock.clear();
    resetGalaxyDemoStateForTests();
    deleteSaveMock.mockClear();
    restartGameMock.mockClear();
    setGalaxyTimeUpDialogOpenMock.mockClear();
  });

  afterEach(() => {
    localStorageMock.clear();
    resetGalaxyDemoStateForTests();
  });

  it("tracks cumulative play time across save restarts", () => {
    initGalaxyDemoSession(0);
    expect(getGalaxyTotalPlayTimeMs(30 * 60 * 1000)).toBe(30 * 60 * 1000);

    persistGalaxyDemoProgress(30 * 60 * 1000);
    initGalaxyDemoSession(0);

    expect(getGalaxyTotalPlayTimeMs(10 * 60 * 1000)).toBe(40 * 60 * 1000);
  });

  it("detects when the 2.5 hour limit is reached", () => {
    initGalaxyDemoSession(0);
    expect(isGalaxyPlayTimeLimitReached(GALAXY_PLAY_TIME_LIMIT_MS - 1)).toBe(
      false,
    );
    expect(isGalaxyPlayTimeLimitReached(GALAXY_PLAY_TIME_LIMIT_MS)).toBe(true);
  });

  it("restores banked time from localStorage on session init", () => {
    localStorage.setItem(
      "adc-galaxy-demo-play-ms",
      String(80 * 60 * 1000),
    );
    initGalaxyDemoSession(0);
    expect(getGalaxyTotalPlayTimeMs(5 * 60 * 1000)).toBe(85 * 60 * 1000);
  });

  it("starts a new demo run and clears the play-time budget", async () => {
    persistGalaxyDemoProgress(GALAXY_PLAY_TIME_LIMIT_MS);
    expect(isGalaxyPlayTimeLimitReached(0)).toBe(true);

    await startNewGalaxyDemoGame();

    expect(setGalaxyTimeUpDialogOpenMock).toHaveBeenCalledWith(false);
    expect(deleteSaveMock).toHaveBeenCalled();
    expect(restartGameMock).toHaveBeenCalled();
    expect(localStorage.getItem("adc-galaxy-demo-play-ms")).toBeNull();
    expect(isGalaxyPlayTimeLimitReached(0)).toBe(false);
  });
});
