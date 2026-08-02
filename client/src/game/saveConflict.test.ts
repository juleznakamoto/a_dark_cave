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
  it("accepts schema key, legacy typo, or isNewGame", () => {
    expect(shouldAllowPlaytimeOverwrite({ allowPlayTimeOverwrite: true })).toBe(
      true,
    );
    expect(
      shouldAllowPlaytimeOverwrite({ allowPlaytimeOverwrite: true }),
    ).toBe(true);
    expect(shouldAllowPlaytimeOverwrite({ isNewGame: true })).toBe(true);
    expect(shouldAllowPlaytimeOverwrite({ isNewGame: false })).toBe(false);
    expect(shouldAllowPlaytimeOverwrite(null)).toBe(false);
  });
});

describe("pickPreferredSave", () => {
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

  it("prefers newer startTime when gameIds differ (restart vs finished run)", () => {
    const localRestart = save({
      gameId: "game-new",
      startTime: 2_000_000,
      playTime: 60_000,
      timestamp: 2_000_100,
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
