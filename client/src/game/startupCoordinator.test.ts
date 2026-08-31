import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockReadHeader, mockLoadStore, editionMocks } = vi.hoisted(() => ({
  mockReadHeader: vi.fn(),
  mockLoadStore: vi.fn(),
  editionMocks: { isCrazyGamesEdition: false },
}));

vi.mock("./startupSaveHeader", () => ({
  readStartupSaveHeaderResult: mockReadHeader,
}));

vi.mock("./startupGameLoader", () => ({
  loadStoreForStartupCheck: mockLoadStore,
}));

vi.mock("@/lib/edition", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/edition")>();
  return {
    ...actual,
    isGalaxyEdition: () => false,
    isCrazyGamesEdition: () => editionMocks.isCrazyGamesEdition,
    isSteamBuild: false,
  };
});

vi.mock("@/lib/authStorageKey", () => ({
  AUTH_STORAGE_KEY: "a-dark-cave-auth",
}));

describe("resolveStartupVisit", () => {
  beforeEach(() => {
    vi.resetModules();
    mockReadHeader.mockReset();
    mockLoadStore.mockReset();
    editionMocks.isCrazyGamesEdition = false;
    mockReadHeader.mockResolvedValue({ status: "not-found" });
    vi.stubGlobal("localStorage", {
      getItem: vi.fn(() => null),
    });
    vi.stubGlobal("sessionStorage", {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
  });

  it("returns the lightweight start surface for a new visitor", async () => {
    const { resolveStartupVisit } = await import("./startupCoordinator");

    await expect(
      resolveStartupVisit({ pathname: "/", search: "", hash: "" }),
    ).resolves.toMatchObject({
      surface: "start",
      preferences: {
        cruelMode: false,
        musicMuted: false,
      },
      steamEditionActive: false,
    });
    expect(mockLoadStore).not.toHaveBeenCalled();
  });

  it("routes callback intent directly to Game", async () => {
    const { resolveStartupVisit } = await import("./startupCoordinator");

    await expect(
      resolveStartupVisit({
        pathname: "/",
        search: "?email_confirmed=true",
        hash: "",
      }),
    ).resolves.toEqual({ surface: "game" });
    expect(mockReadHeader).not.toHaveBeenCalled();
  });

  it("keeps a started local save on the start screen when preferred", async () => {
    mockReadHeader.mockResolvedValue({
      status: "loaded",
      header: {
        gameStarted: true,
        cruelMode: false,
        musicMuted: false,
        sfxMuted: false,
        musicVolume: 1,
        sfxVolume: 1,
        devGameMode: "normal",
      },
    });
    vi.stubGlobal("sessionStorage", {
      getItem: vi.fn(() => "1"),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
    const { resolveStartupVisit } = await import("./startupCoordinator");

    await expect(
      resolveStartupVisit({ pathname: "/", search: "", hash: "" }),
    ).resolves.toMatchObject({ surface: "start" });
  });

  it("routes a started local save to Game", async () => {
    mockReadHeader.mockResolvedValue({
      status: "loaded",
      header: { gameStarted: true },
    });
    const { resolveStartupVisit } = await import("./startupCoordinator");

    await expect(
      resolveStartupVisit({ pathname: "/", search: "", hash: "" }),
    ).resolves.toEqual({ surface: "game" });
  });

  it("trusts a valid unstarted header for signed-in users without full load", async () => {
    mockReadHeader.mockResolvedValue({
      status: "loaded",
      header: {
        gameStarted: false,
        cruelMode: true,
        musicMuted: true,
        sfxMuted: false,
        musicVolume: 0.5,
        sfxVolume: 0.7,
        devGameMode: "normal",
      },
    });
    vi.stubGlobal("localStorage", {
      getItem: vi.fn(() =>
        JSON.stringify({
          access_token: "tok",
          user: { id: "u1" },
        }),
      ),
    });
    const { resolveStartupVisit } = await import("./startupCoordinator");

    await expect(
      resolveStartupVisit({ pathname: "/", search: "", hash: "" }),
    ).resolves.toMatchObject({
      surface: "start",
      preferences: {
        cruelMode: true,
        musicMuted: true,
        musicVolume: 0.5,
      },
    });
    expect(mockLoadStore).not.toHaveBeenCalled();
  });

  it("full-reconciles when signed-in and header is missing", async () => {
    mockReadHeader.mockResolvedValue({ status: "not-found" });
    mockLoadStore.mockResolvedValue({
      getState: () => ({
        flags: { gameStarted: false },
        cruelMode: false,
        musicMuted: false,
        sfxMuted: false,
        musicVolume: 1,
        sfxVolume: 1,
        devGameMode: "normal",
      }),
    });
    vi.stubGlobal("localStorage", {
      getItem: vi.fn(() =>
        JSON.stringify({
          access_token: "tok",
          user: { id: "u1" },
        }),
      ),
    });
    const { resolveStartupVisit } = await import("./startupCoordinator");

    await expect(
      resolveStartupVisit({ pathname: "/", search: "", hash: "" }),
    ).resolves.toMatchObject({ surface: "start" });
    expect(mockLoadStore).toHaveBeenCalledOnce();
  });

  it("hides the Steam store link from a DEV Steam Demo header", async () => {
    mockReadHeader.mockResolvedValue({
      status: "loaded",
      header: {
        gameStarted: false,
        cruelMode: false,
        musicMuted: false,
        sfxMuted: false,
        musicVolume: 1,
        sfxVolume: 1,
        devGameMode: "steamDemo",
      },
    });
    const { resolveStartupVisit } = await import("./startupCoordinator");

    await expect(
      resolveStartupVisit({ pathname: "/", search: "", hash: "" }),
    ).resolves.toMatchObject({
      surface: "start",
      steamDesktopEditionActive: true,
      hideSteamStoreLink: true,
    });
    expect(mockLoadStore).not.toHaveBeenCalled();
  });

  it("keeps the Steam store link for a DEV CrazyGames Demo header", async () => {
    mockReadHeader.mockResolvedValue({
      status: "loaded",
      header: {
        gameStarted: false,
        cruelMode: false,
        musicMuted: false,
        sfxMuted: false,
        musicVolume: 1,
        sfxVolume: 1,
        devGameMode: "crazyGamesDemo",
      },
    });
    const { resolveStartupVisit } = await import("./startupCoordinator");

    await expect(
      resolveStartupVisit({ pathname: "/", search: "", hash: "" }),
    ).resolves.toMatchObject({
      surface: "start",
      steamDesktopEditionActive: true,
      crazyGamesEditionActive: true,
      hideSteamStoreLink: false,
    });
  });

  it("full-reconciles on CrazyGames when the header is missing", async () => {
    editionMocks.isCrazyGamesEdition = true;
    mockReadHeader.mockResolvedValue({ status: "not-found" });
    mockLoadStore.mockResolvedValue({
      getState: () => ({
        flags: { gameStarted: true },
        cruelMode: false,
        musicMuted: false,
        sfxMuted: false,
        musicVolume: 1,
        sfxVolume: 1,
        devGameMode: "normal",
      }),
    });
    const { resolveStartupVisit } = await import("./startupCoordinator");

    await expect(
      resolveStartupVisit({ pathname: "/", search: "", hash: "" }),
    ).resolves.toEqual({ surface: "game" });
    expect(mockLoadStore).toHaveBeenCalledOnce();
  });

  it("preserves startup persistence failures", async () => {
    mockReadHeader.mockResolvedValue({
      status: "error",
      error: new Error("IndexedDB unavailable"),
      retryable: true,
    });
    const { resolveStartupVisit } = await import("./startupCoordinator");

    await expect(
      resolveStartupVisit({ pathname: "/", search: "", hash: "" }),
    ).rejects.toThrow("IndexedDB unavailable");
  });
});
