import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/edition", async () => {
  const actual = await vi.importActual<typeof import("@/lib/edition")>(
    "@/lib/edition",
  );
  return {
    ...actual,
    isSteamBuild: true,
    isSteamFullBuild: true,
    isSteamDemoBuild: false,
  };
});

import { isSteamCruelModeUnlockAvailable } from "./steamCruelModeUnlock";

describe("CRUELWORLD on the packaged Steam game", () => {
  it("unlocks Cruel Mode before a normal win", () => {
    expect(
      isSteamCruelModeUnlockAvailable({
        hasWonNormalGame: false,
        cruelWorldCode: true,
      }),
    ).toBe(true);
  });

  it("still requires a normal win when the code has not been entered", () => {
    expect(
      isSteamCruelModeUnlockAvailable({
        hasWonNormalGame: false,
        cruelWorldCode: false,
      }),
    ).toBe(false);
    expect(
      isSteamCruelModeUnlockAvailable({
        hasWonNormalGame: true,
      }),
    ).toBe(true);
  });
});
