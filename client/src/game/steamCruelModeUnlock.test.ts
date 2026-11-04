import { describe, expect, it } from "vitest";
import { createInitialState } from "./state";
import { STEAM_CRUEL_MODE_UNLOCK } from "@/lib/featureFlags";
import {
  CRUEL_WORLD_CODE,
  hasCruelWorldCode,
  isSteamCruelModeUnlockAvailable,
  markCruelWorldCodeEntered,
  matchesCruelWorldCode,
} from "./steamCruelModeUnlock";

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

  it("accepts CRUELWORLD without caring about capitalization or spaces", () => {
    expect(CRUEL_WORLD_CODE).toBe("CRUELWORLD");
    expect(matchesCruelWorldCode("CRUELWORLD")).toBe(true);
    expect(matchesCruelWorldCode(" cruelworld ")).toBe(true);
    expect(matchesCruelWorldCode("CRUEL")).toBe(false);
    expect(matchesCruelWorldCode("WANDERER")).toBe(false);
  });

  it("stores the code on the save", () => {
    const state = createInitialState();
    const next = { ...state, ...markCruelWorldCodeEntered(state) };
    expect(hasCruelWorldCode(next)).toBe(true);
    expect(next.cruelMode).toBe(false);
  });

  it("does not unlock Cruel Mode on web or the Steam demo from the code alone", () => {
    expect(
      isSteamCruelModeUnlockAvailable({
        devGameMode: "normal",
        hasWonNormalGame: false,
        cruelWorldCode: true,
      }),
    ).toBe(false);
    expect(
      isSteamCruelModeUnlockAvailable({
        devGameMode: "steamDemo",
        hasWonNormalGame: false,
        cruelWorldCode: true,
      }),
    ).toBe(false);
    expect(
      isSteamCruelModeUnlockAvailable({
        devGameMode: "steamEndCruelOff",
        hasWonNormalGame: false,
        cruelWorldCode: true,
      }),
    ).toBe(false);
  });
});
