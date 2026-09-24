import { afterEach, describe, expect, it, vi } from "vitest";

async function loadEdition() {
  return import("./edition");
}

describe("CrazyGames edition", () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it("treats /crazygames as a local-only capped demo with Steam-demo chrome", async () => {
    vi.stubGlobal("window", {
      location: { pathname: "/crazygames" },
    });
    const edition = await loadEdition();
    expect(edition.isCrazyGamesEdition()).toBe(true);
    expect(edition.isDemoEdition()).toBe(true);
    expect(edition.isSteamDemoActive()).toBe(true);
    expect(edition.isLocalOnlyEdition()).toBe(true);
    expect(edition.isFullGameUnlockedEdition()).toBe(true);
    expect(edition.isSteamEditionActive()).toBe(true);
  });

  it("hides the Steam store link for DEV Steam modes, not CrazyGames", async () => {
    const edition = await loadEdition();
    expect(edition.shouldHideSteamStoreLink("normal")).toBe(false);
    expect(edition.shouldHideSteamStoreLink("crazyGamesDemo")).toBe(false);
    expect(edition.shouldHideSteamStoreLink("steamGame")).toBe(true);
    expect(edition.shouldHideSteamStoreLink("steamPlaytest")).toBe(true);
    expect(edition.shouldHideSteamStoreLink("steamDemo")).toBe(true);
    expect(edition.shouldHideSteamStoreLink("demoEnd")).toBe(true);
    expect(edition.shouldHideSteamStoreLink("steamEndCruelOn")).toBe(true);
    expect(edition.shouldHideSteamStoreLink("steamEndCruelOff")).toBe(true);
  });

  it("does not sync Steam achievements on the web build", async () => {
    const edition = await loadEdition();
    expect(edition.shouldSyncSteamAchievements()).toBe(false);
  });

  it("treats an explicit Steam Game Mode as Steam edition", async () => {
    const edition = await loadEdition();
    edition.setDevGameModeOverride("normal");
    expect(edition.isSteamEditionActive("normal")).toBe(false);
    expect(edition.isSteamEditionActive("steamGame")).toBe(true);
    expect(edition.isSteamEditionActive("steamPlaytest")).toBe(true);
    edition.setDevGameModeOverride("normal");
  });

  it("treats /itch as a local-only capped demo that still links to Steam", async () => {
    vi.stubGlobal("window", {
      location: { pathname: "/itch" },
    });
    const edition = await loadEdition();
    const { getSaveKey } = await import("@/game/saveKeys");
    const { getSaveOriginEdition } = await import("@/game/saveOrigin");
    expect(edition.isItchEdition()).toBe(true);
    expect(edition.isCrazyGamesEdition()).toBe(false);
    expect(edition.isGalaxyEdition()).toBe(false);
    expect(edition.isDemoEdition()).toBe(true);
    expect(edition.isSteamDemoActive()).toBe(true);
    expect(edition.isLocalOnlyEdition()).toBe(true);
    expect(edition.isFullGameUnlockedEdition()).toBe(true);
    expect(edition.isSteamEditionActive()).toBe(true);
    expect(edition.shouldHideSteamStoreLink("normal")).toBe(false);
    expect(getSaveKey()).toBe("itchSave");
    expect(getSaveOriginEdition()).toBe("itch");
  });

  it("does not treat other paths as CrazyGames", async () => {
    vi.stubGlobal("window", {
      location: { pathname: "/galaxy" },
    });
    const edition = await loadEdition();
    expect(edition.isCrazyGamesEdition()).toBe(false);
    expect(edition.isGalaxyEdition()).toBe(true);
    expect(edition.isLocalOnlyEdition()).toBe(true);
    expect(edition.isSteamEditionActive()).toBe(true);
    expect(edition.isSteamDemoActive()).toBe(false);
  });
});
