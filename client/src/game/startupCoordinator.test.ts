import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockReadHeader } = vi.hoisted(() => ({
  mockReadHeader: vi.fn(),
}));

vi.mock("./startupSaveHeader", () => ({
  readStartupSaveHeaderResult: mockReadHeader,
}));

vi.mock("@/lib/edition", () => ({
  isGalaxyEdition: () => false,
  isSteamBuild: false,
}));

describe("resolveStartupVisit", () => {
  beforeEach(() => {
    mockReadHeader.mockReset();
    mockReadHeader.mockResolvedValue({ status: "not-found" });
    vi.stubGlobal("localStorage", {
      getItem: vi.fn(() => null),
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
