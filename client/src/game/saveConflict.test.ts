import { describe, expect, it } from "vitest";
import type { GameState, SaveData } from "@shared/schema";
import {
  needsPlaytimeOverwriteForSync,
  pickPreferredSave,
  shouldAllowPlaytimeOverwrite,
} from "./saveConflict";

function save(
  overrides: Partial<GameState> & { playTime?: number; timestamp?: number },
): SaveData {
  const {
    playTime = 0,
    timestamp = Date.now(),
    ...gameState
  } = overrides;
  return {
    gameState: gameState as GameState,
    playTime,
    timestamp,
  };
}

describe("shouldAllowPlaytimeOverwrite", () => {
  it("accepts schema key or legacy typo, but not isNewGame alone", () => {
    expect(shouldAllowPlaytimeOverwrite({ allowPlayTimeOverwrite: true })).toBe(
      true,
    );
    expect(
      shouldAllowPlaytimeOverwrite({ allowPlaytimeOverwrite: true }),
    ).toBe(true);
    expect(shouldAllowPlaytimeOverwrite({ isNewGame: true })).toBe(false);
    expect(shouldAllowPlaytimeOverwrite({ isNewGame: false })).toBe(false);
    expect(shouldAllowPlaytimeOverwrite(null)).toBe(false);
  });
});

describe("pickPreferredSave", () => {
  it("prefers cloud when the same run has equal playTime", () => {
    const local = save({
      gameId: "game-a",
      startTime: 100,
      playTime: 5000,
    });
    const cloud = save({
      gameId: "game-a",
      startTime: 100,
      playTime: 5000,
    });
    expect(pickPreferredSave(local, cloud)).toBe("cloud");
  });

  it("prefers higher playTime for the same gameId", () => {
    const local = save({
      gameId: "game-a",
      startTime: 100,
      playTime: 5000,
    });
    const cloud = save({
      gameId: "game-a",
      startTime: 100,
      playTime: 8000,
    });
    expect(pickPreferredSave(local, cloud)).toBe("cloud");
    expect(pickPreferredSave(cloud, local)).toBe("local");
  });

  it("prefers a local restart with explicit overwrite over a longer finished cloud run", () => {
    const localRestart = save({
      gameId: "game-new",
      startTime: 2_000_000,
      playTime: 60_000,
      timestamp: 2_000_100,
      allowPlayTimeOverwrite: true,
    });
    const cloudFinished = save({
      gameId: "game-old",
      startTime: 1_000_000,
      playTime: 26_000_000,
      timestamp: 1_500_000,
    });
    expect(pickPreferredSave(localRestart, cloudFinished)).toBe("local");
    expect(pickPreferredSave(cloudFinished, localRestart)).toBe("cloud");
  });

  it("prefers cloud restart over stale local finished run", () => {
    const localFinished = save({
      gameId: "game-old",
      startTime: 1_000_000,
      playTime: 26_000_000,
    });
    const cloudRestart = save({
      gameId: "game-new",
      startTime: 2_000_000,
      playTime: 10_000,
    });
    expect(pickPreferredSave(localFinished, cloudRestart)).toBe("cloud");
  });

  it("does not let a fresh other-screen local start wipe longer cloud progress", () => {
    // Different device: user lit fire (new gameId, newer startTime, tiny playTime)
    // then signed into an account that already has real cloud progress.
    const localFreshStart = save({
      gameId: "game-phone-fresh",
      startTime: 3_000_000,
      playTime: 5_000,
      isNewGame: true,
    });
    const cloudProgress = save({
      gameId: "game-laptop",
      startTime: 1_000_000,
      playTime: 12_000_000,
    });
    expect(pickPreferredSave(localFreshStart, cloudProgress)).toBe("cloud");
  });

  it("keeps longer offline local progress when it outranks cloud on a different gameId", () => {
    const localOffline = save({
      gameId: "game-offline",
      startTime: 2_000_000,
      playTime: 9_000_000,
    });
    const cloudShort = save({
      gameId: "game-cloud",
      startTime: 1_000_000,
      playTime: 1_000_000,
    });
    expect(pickPreferredSave(localOffline, cloudShort)).toBe("local");
  });
});

describe("needsPlaytimeOverwriteForSync", () => {
  it("requires overwrite when replacing a different gameId", () => {
    expect(
      needsPlaytimeOverwriteForSync(
        save({ gameId: "new", playTime: 0 }),
        save({ gameId: "old", playTime: 9_000_000 }),
      ),
    ).toBe(true);
  });

  it("requires overwrite when playTime would decrease on same game", () => {
    expect(
      needsPlaytimeOverwriteForSync(
        save({ gameId: "a", playTime: 100 }),
        save({ gameId: "a", playTime: 200 }),
      ),
    ).toBe(true);
    expect(
      needsPlaytimeOverwriteForSync(
        save({ gameId: "a", playTime: 300 }),
        save({ gameId: "a", playTime: 200 }),
      ),
    ).toBe(false);
  });
});
