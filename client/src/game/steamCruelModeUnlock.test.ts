import { describe, expect, it } from "vitest";
import { STEAM_CRUEL_MODE_UNLOCK } from "@/lib/featureFlags";
import { isSteamCruelModeUnlockAvailable } from "./steamCruelModeUnlock";

describe("isSteamCruelModeUnlockAvailable", () => {
  it("is on for Settings → Steam End (Cruel On) even when the flag is off", () => {
    expect(STEAM_CRUEL_MODE_UNLOCK).toBe(false);
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

  it("stays off for a Steam Game preview while the flag is off", () => {
    expect(
      isSteamCruelModeUnlockAvailable({
        devGameMode: "steamGame",
        hasWonNormalGame: true,
      }),
    ).toBe(false);
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
