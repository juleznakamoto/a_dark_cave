import { beforeEach, describe, expect, it, vi } from "vitest";
import { getStartupSaveHeaderKey } from "./saveKeys";
import {
  peekResumeGame,
  peekStartupGameStarted,
  setPreferStartScreen,
  setResumeGame,
  shouldBootGameSurface,
} from "./startupBootSurface";

const editionMocks = vi.hoisted(() => ({
  isSteamBuild: false,
  isGalaxy: false,
  isCrazyGames: false,
}));

vi.mock("@/lib/edition", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/edition")>();
  return {
    ...actual,
    get isSteamBuild() {
      return editionMocks.isSteamBuild;
    },
    isGalaxyEdition: () => editionMocks.isGalaxy,
    isCrazyGamesEdition: () => editionMocks.isCrazyGames,
  };
});

describe("shouldBootGameSurface", () => {
  const storage = new Map<string, string>();
  const session = new Map<string, string>();

  beforeEach(() => {
    storage.clear();
    session.clear();
    editionMocks.isSteamBuild = false;
    editionMocks.isGalaxy = false;
    editionMocks.isCrazyGames = false;
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    });
    vi.stubGlobal("sessionStorage", {
      getItem: (key: string) => session.get(key) ?? null,
      setItem: (key: string, value: string) => session.set(key, value),
      removeItem: (key: string) => {
        session.delete(key);
      },
    });
  });

  it("stays on the start screen for a new visitor", () => {
    expect(
      shouldBootGameSurface({ pathname: "/", search: "", hash: "" }),
    ).toBe(false);
    expect(peekStartupGameStarted()).toBe(false);
  });

  it("keeps a started web save on the start screen", () => {
    storage.set(
      getStartupSaveHeaderKey(),
      JSON.stringify({ version: 1, gameStarted: true }),
    );
    expect(
      shouldBootGameSurface({ pathname: "/", search: "", hash: "" }),
    ).toBe(false);
    expect(peekStartupGameStarted()).toBe(true);
  });

  it("boots Game for a started Steam / portal save", () => {
    editionMocks.isSteamBuild = true;
    storage.set(
      getStartupSaveHeaderKey(),
      JSON.stringify({ version: 1, gameStarted: true }),
    );
    expect(
      shouldBootGameSurface({ pathname: "/", search: "", hash: "" }),
    ).toBe(true);
  });

  it("ignores an unstarted or invalid header", () => {
    storage.set(
      getStartupSaveHeaderKey(),
      JSON.stringify({ version: 1, gameStarted: false }),
    );
    expect(
      shouldBootGameSurface({ pathname: "/", search: "", hash: "" }),
    ).toBe(false);

    storage.set(getStartupSaveHeaderKey(), "not-json");
    expect(peekStartupGameStarted()).toBe(false);
  });

  it("stays on the start screen when a title click prefers it", () => {
    editionMocks.isCrazyGames = true;
    storage.set(
      getStartupSaveHeaderKey(),
      JSON.stringify({ version: 1, gameStarted: true }),
    );
    setPreferStartScreen();
    expect(
      shouldBootGameSurface({ pathname: "/", search: "", hash: "" }),
    ).toBe(false);
  });

  it("resumes Game after an in-game reload even on web", () => {
    storage.set(
      getStartupSaveHeaderKey(),
      JSON.stringify({ version: 1, gameStarted: true }),
    );
    setResumeGame();
    expect(peekResumeGame()).toBe(true);
    expect(
      shouldBootGameSurface({ pathname: "/", search: "", hash: "" }),
    ).toBe(true);
  });

  it("does not resume Game without a started save", () => {
    setResumeGame();
    expect(
      shouldBootGameSurface({ pathname: "/", search: "", hash: "" }),
    ).toBe(false);
  });

  it("still boots Game for forceGame even when start is preferred", () => {
    setPreferStartScreen();
    expect(
      shouldBootGameSurface({
        pathname: "/",
        search: "?email_confirmed=true",
        hash: "",
      }),
    ).toBe(true);
  });

  it("boots Game for forceGame callback intent without a header", () => {
    expect(
      shouldBootGameSurface({
        pathname: "/",
        search: "?email_confirmed=true",
        hash: "",
      }),
    ).toBe(true);
    expect(
      shouldBootGameSurface({ pathname: "/boost", search: "", hash: "" }),
    ).toBe(true);
  });

  it("boots Game for a DEV save fixture without a header", () => {
    expect(
      shouldBootGameSurface({
        pathname: "/",
        search: "?devSave=sleep-unlocked",
        hash: "",
      }),
    ).toBe(true);
  });
});
