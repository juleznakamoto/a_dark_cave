import { describe, expect, it } from "vitest";
import type { SaveData } from "@shared/schema";
import {
  isStartedSave,
  isSteamDemoOriginSave,
  shouldAdoptSteamCloudSave,
  shouldOfferSteamDemoContinue,
} from "./steamDemoContinue";

function save(overrides: {
  playTime?: number;
  gameStarted?: boolean;
  saveOriginEdition?: SaveData["gameState"]["saveOriginEdition"];
  steamDemoContinueResolved?: boolean;
}): SaveData {
  return {
    timestamp: 1,
    playTime: overrides.playTime ?? 0,
    gameState: {
      playTime: overrides.playTime ?? 0,
      flags: { gameStarted: overrides.gameStarted === true },
      saveOriginEdition: overrides.saveOriginEdition,
      steamDemoContinueResolved: overrides.steamDemoContinueResolved === true,
    } as SaveData["gameState"],
  };
}

describe("steamDemoContinue", () => {
  it("treats a started flag or playTime as a real save", () => {
    expect(isStartedSave(save({}))).toBe(false);
    expect(isStartedSave(save({ gameStarted: true }))).toBe(true);
    expect(isStartedSave(save({ playTime: 8_000 }))).toBe(true);
  });

  it("recognizes only steam-demo origin", () => {
    expect(isSteamDemoOriginSave(save({ saveOriginEdition: "steam-demo" }))).toBe(
      true,
    );
    expect(isSteamDemoOriginSave(save({ saveOriginEdition: "steam-full" }))).toBe(
      false,
    );
    expect(isSteamDemoOriginSave(save({}))).toBe(false);
  });

  it("does not auto-adopt a demo blob into the full game", () => {
    const demoCloud = save({
      gameStarted: true,
      playTime: 60_000,
      saveOriginEdition: "steam-demo",
    });
    const fullLocal = save({
      gameStarted: true,
      playTime: 10_000,
      saveOriginEdition: "steam-full",
    });
    expect(shouldAdoptSteamCloudSave(fullLocal, demoCloud, true)).toBe(false);
    expect(shouldAdoptSteamCloudSave(undefined, demoCloud, true)).toBe(false);
    expect(
      shouldAdoptSteamCloudSave(
        undefined,
        save({ gameStarted: true, saveOriginEdition: "steam-full" }),
        true,
      ),
    ).toBe(true);
    expect(shouldAdoptSteamCloudSave(undefined, demoCloud, false)).toBe(true);
  });

  it("offers Continue when a demo save exists and the full game is empty", () => {
    const demoSave = save({
      gameStarted: true,
      playTime: 45_000,
      saveOriginEdition: "steam-demo",
    });
    const result = shouldOfferSteamDemoContinue({
      resolved: false,
      fullLocal: undefined,
      fullCloud: null,
      demoSave,
    });
    expect(result.offer).toBe(true);
    expect(result.candidate).toBe(demoSave);
  });

  it("offers once for an unstamped leftover in the old shared full-game file", () => {
    const leftover = save({ gameStarted: true, playTime: 20_000 });
    const result = shouldOfferSteamDemoContinue({
      resolved: false,
      fullLocal: undefined,
      fullCloud: leftover,
      demoSave: null,
    });
    expect(result.offer).toBe(true);
    expect(result.candidate).toBe(leftover);
  });

  it("does not offer when the full game already has its own save", () => {
    const result = shouldOfferSteamDemoContinue({
      resolved: false,
      fullLocal: save({
        gameStarted: true,
        playTime: 12_000,
        saveOriginEdition: "steam-full",
      }),
      fullCloud: null,
      demoSave: save({
        gameStarted: true,
        playTime: 90_000,
        saveOriginEdition: "steam-demo",
      }),
    });
    expect(result.offer).toBe(false);
  });

  it("does not offer again after the player already chose", () => {
    const result = shouldOfferSteamDemoContinue({
      resolved: true,
      fullLocal: undefined,
      fullCloud: null,
      demoSave: save({
        gameStarted: true,
        saveOriginEdition: "steam-demo",
      }),
    });
    expect(result.offer).toBe(false);
  });
});
