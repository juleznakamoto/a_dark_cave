import { describe, expect, it } from "vitest";
import { createInitialState } from "@/game/state";
import {
  CAVE_VETERAN_WINS,
  SPEEDRUN_WIN_MAX_MS,
  getGameWinAchievementUpdates,
  getLifetimeGamesWonFromSave,
} from "./winAchievements";
import type { GameState } from "@shared/schema";
import { cubeEvents } from "./rules/eventsCube";
import { PACT_IDS } from "./rules/pacts";
import { mergeStateUpdates } from "./store/mergeStateUpdates";

describe("getGameWinAchievementUpdates", () => {
  const base = {
    cruelMode: false,
    playTime: 6 * 60 * 60 * 1000,
    events: {},
    lifetimeGamesWon: 0,
    pactChoices: 1,
    chosenPacts: [] as string[],
  };

  it("awards Normal Victory outside cruel mode and increments lifetime wins", () => {
    expect(getGameWinAchievementUpdates(base)).toEqual({
      hasWonAnyGame: true,
      hasWonNormalGame: true,
      lifetimeGamesWon: 1,
      pactChoices: 2,
    });
  });

  it("awards Cruel Victory in cruel mode", () => {
    expect(
      getGameWinAchievementUpdates({ ...base, cruelMode: true }),
    ).toEqual({
      hasWonAnyGame: true,
      hasWonCruelGame: true,
      lifetimeGamesWon: 1,
      pactChoices: 3,
    });
  });

  it("awards Speedrunner under the playtime threshold", () => {
    expect(
      getGameWinAchievementUpdates({
        ...base,
        playTime: SPEEDRUN_WIN_MAX_MS - 1,
      }),
    ).toEqual({
      hasWonAnyGame: true,
      hasWonNormalGame: true,
      hasSpeedrunWin: true,
      lifetimeGamesWon: 1,
      pactChoices: 2,
    });
  });

  it("awards The final pact when every pact is active", () => {
    expect(
      getGameWinAchievementUpdates({
        ...base,
        chosenPacts: [...PACT_IDS],
      }).hasFinalPactWin,
    ).toBe(true);
    expect(
      getGameWinAchievementUpdates({
        ...base,
        chosenPacts: [
          "firecrafter",
          "full_larders",
          "sturdy_hands",
          "cunning_trader",
          "avid_apprentices",
        ],
      }).hasFinalPactWin,
    ).toBe(true);
  });

  it("does not award The final pact for a partial pact set", () => {
    expect(
      getGameWinAchievementUpdates({
        ...base,
        chosenPacts: PACT_IDS.slice(0, 4),
      }).hasFinalPactWin,
    ).toBeUndefined();
  });

  it("still awards The final pact on a later cube beat in the same run", () => {
    expect(
      getGameWinAchievementUpdates({
        ...base,
        lifetimeGamesWon: 1,
        events: { cube13: true },
        chosenPacts: [...PACT_IDS],
      }).hasFinalPactWin,
    ).toBe(true);
  });

  it("does not increment lifetime wins again later in the same run", () => {
    expect(
      getGameWinAchievementUpdates({
        ...base,
        lifetimeGamesWon: 1,
        events: { cube13: true },
      }),
    ).toEqual({
      hasWonAnyGame: true,
      hasWonNormalGame: true,
    });
  });

  it("increments from an existing lifetime win count on a fresh run", () => {
    expect(
      getGameWinAchievementUpdates({
        ...base,
        lifetimeGamesWon: 2,
        events: {},
      }).lifetimeGamesWon,
    ).toBe(3);
    expect(
      getGameWinAchievementUpdates({
        ...base,
        lifetimeGamesWon: 2,
        pactChoices: 3,
        events: {},
      }).pactChoices,
    ).toBe(4);
  });
});

describe("getLifetimeGamesWonFromSave", () => {
  it("seeds from normal + cruel flags when counter is missing", () => {
    expect(
      getLifetimeGamesWonFromSave({
        hasWonNormalGame: true,
        hasWonCruelGame: true,
      }),
    ).toBe(2);
  });

  it("prefers game_stats length when higher", () => {
    expect(
      getLifetimeGamesWonFromSave({
        hasWonAnyGame: true,
        game_stats: [
          { finishTime: 1 },
          { finishTime: 2 },
          { finishTime: 3 },
        ],
      }),
    ).toBe(3);
  });

  it("keeps an already-stored counter", () => {
    expect(
      getLifetimeGamesWonFromSave({
        lifetimeGamesWon: 5,
        hasWonAnyGame: true,
      }),
    ).toBe(5);
  });
});

describe("Cave Veteran constant", () => {
  it("requires three finishes", () => {
    expect(CAVE_VETERAN_WINS).toBe(3);
  });
});

describe("cube ending win flag effects", () => {
  it("cube15b (communicate path) awards win flags", () => {
    const state = {
      ...createInitialState(),
      cruelMode: false,
      playTime: SPEEDRUN_WIN_MAX_MS + 1,
      story: {
        ...createInitialState().story,
        seen: {
          ...createInitialState().story.seen,
          communicatedWithCreatures: true,
        },
      },
      events: {
        ...createInitialState().events,
        cube14d: true,
      },
    } as GameState;

    const effect = cubeEvents.cube15b.choices![0]!.effect!;
    const result = effect(state);
    expect(result.hasWonAnyGame).toBe(true);
    expect(result.hasWonNormalGame).toBe(true);
    expect(result.lifetimeGamesWon).toBe(1);
    expect(result.pactChoices).toBe(2);
    expect(result.events?.cube15b).toBe(true);
  });

  it("cube13 (slaughter path) still awards win flags", () => {
    const state = {
      ...createInitialState(),
      cruelMode: true,
      playTime: 1,
      story: {
        ...createInitialState().story,
        seen: {
          ...createInitialState().story.seen,
          slaughteredCreatures: true,
        },
      },
      events: {
        ...createInitialState().events,
        cube12: true,
      },
    } as GameState;

    const effect = cubeEvents.cube13.choices![0]!.effect!;
    const result = effect(state);
    expect(result.hasWonCruelGame).toBe(true);
    expect(result.hasSpeedrunWin).toBe(true);
    expect(result.lifetimeGamesWon).toBe(1);
    expect(result.pactChoices).toBe(3);
  });

  it("cube15a after cube13 does not double-count lifetime wins", () => {
    const state = {
      ...createInitialState(),
      cruelMode: false,
      playTime: SPEEDRUN_WIN_MAX_MS + 1,
      lifetimeGamesWon: 1,
      story: {
        ...createInitialState().story,
        seen: {
          ...createInitialState().story.seen,
          slaughteredCreatures: true,
        },
      },
      events: {
        ...createInitialState().events,
        cube14d: true,
        cube13: true,
      },
    } as GameState;

    const effect = cubeEvents.cube15a.choices![0]!.effect!;
    const result = effect(state);
    expect(result.hasWonAnyGame).toBe(true);
    expect(result.lifetimeGamesWon).toBeUndefined();
  });

  it("cube13 awards The final pact when every pact is active", () => {
    const state = {
      ...createInitialState(),
      cruelMode: false,
      playTime: SPEEDRUN_WIN_MAX_MS + 1,
      chosenPacts: [...PACT_IDS],
      story: {
        ...createInitialState().story,
        seen: {
          ...createInitialState().story.seen,
          slaughteredCreatures: true,
        },
      },
      events: {
        ...createInitialState().events,
        cube12: true,
      },
    } as GameState;

    const effect = cubeEvents.cube13.choices![0]!.effect!;
    const result = effect(state);
    expect(result.hasFinalPactWin).toBe(true);
    expect(
      mergeStateUpdates(state, result).hasFinalPactWin,
    ).toBe(true);
  });
});
