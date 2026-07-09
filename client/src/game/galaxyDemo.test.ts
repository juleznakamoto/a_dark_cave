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

import {
  GALAXY_PLAY_TIME_LIMIT_MS,
  getGalaxyTotalPlayTimeMs,
  initGalaxyDemoSession,
  isGalaxyPlayTimeLimitReached,
  persistGalaxyDemoProgress,
  resetGalaxyDemoStateForTests,
} from "./galaxyDemo";

describe("galaxyDemo", () => {
  beforeEach(() => {
    localStorageMock.clear();
    resetGalaxyDemoStateForTests();
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

  it("detects when the 1.5 hour limit is reached", () => {
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
});
