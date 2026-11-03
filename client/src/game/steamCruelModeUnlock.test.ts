import { describe, expect, it } from "vitest";
import { STEAM_CRUEL_MODE_UNLOCK } from "@/lib/featureFlags";
import { isSteamCruelModeUnlockAvailable } from "./steamCruelModeUnlock";

describe("isSteamCruelModeUnlockAvailable", () => {
  it("ships Cruel Mode for the full Steam game", () => {
    expect(STEAM_CRUEL_MODE_UNLOCK).toBe(true);
  });

  it("is on for Settings → Steam End (Cruel On)", () => {
    expect(
      isSteamCruelModeUnlockAvailable({
        devGameMode: "steamEndCruelOn",
        hasWonNormalGame: false,
      }),
    ).toBe(true);
  });

  it("is off for Settings → Steam End (Cruel Off)", () => {
    expect(
      isSteamCruelModeUnlockAvailable({
        devGameMode: "steamEndCruelOff",
        hasWonNormalGame: true,
      }),
    ).toBe(false);
  });

  it("offers Cruel Mode in Settings → Steam Game before a normal win", () => {
    expect(
      isSteamCruelModeUnlockAvailable({
        devGameMode: "steamGame",
        hasWonNormalGame: false,
      }),
    ).toBe(true);
  });

  it("stays off on web Normal Mode even after a normal win", () => {
    expect(
      isSteamCruelModeUnlockAvailable({
        devGameMode: "normal",
        hasWonNormalGame: true,
      }),
    ).toBe(false);
  });
});
