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

  it("does not treat other paths as CrazyGames", async () => {
    vi.stubGlobal("window", {
      location: { pathname: "/galaxy" },
    });
    const edition = await loadEdition();
    expect(edition.isCrazyGamesEdition()).toBe(false);
    expect(edition.isGalaxyEdition()).toBe(true);
    expect(edition.isSteamDemoActive()).toBe(false);
  });
});
