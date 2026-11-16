import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/edition", async () => {
  const actual = await vi.importActual<typeof import("@/lib/edition")>(
    "@/lib/edition",
  );
  return {
    ...actual,
    isIosBuild: true,
    isSteamBuild: false,
    isSteamFullBuild: false,
    isSteamDemoBuild: false,
  };
});

import { isSteamCruelModeUnlockAvailable } from "./steamCruelModeUnlock";

describe("Cruel Mode on the iOS app", () => {
  it("unlocks from the code before a normal win", () => {
    expect(
      isSteamCruelModeUnlockAvailable({
        hasWonNormalGame: false,
        cruelWorldCode: true,
      }),
    ).toBe(true);
  });

  it("unlocks after a normal win without the code", () => {
    expect(
      isSteamCruelModeUnlockAvailable({
        hasWonNormalGame: true,
        cruelWorldCode: false,
      }),
    ).toBe(true);
  });

  it("stays off before a normal win when the code was not entered", () => {
    expect(
      isSteamCruelModeUnlockAvailable({
        hasWonNormalGame: false,
        cruelWorldCode: false,
      }),
    ).toBe(false);
  });
});
