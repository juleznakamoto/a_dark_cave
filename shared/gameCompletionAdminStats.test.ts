import { describe, expect, it } from "vitest";
import {
  buildDailyCompletionCounts,
  buildDailyCompletionsVsPlayers,
  extractCompletionFinishTimesMs,
  getGameCompletionDistribution,
  hasReachedGameEnding,
} from "./gameCompletionAdminStats";

describe("gameCompletionAdminStats", () => {
  it("detects ending from cube events or gameComplete flag", () => {
    expect(hasReachedGameEnding(undefined)).toBe(false);
    expect(hasReachedGameEnding({ events: {} })).toBe(false);
    expect(hasReachedGameEnding({ gameComplete: true })).toBe(true);
    expect(
      hasReachedGameEnding({ events: { cube15a: true } }),
    ).toBe(true);
  });

  it("extracts finishTime from game_stats only", () => {
    const saves = [
      {
        game_stats: [{ finishTime: 1_700_000_000_000 }],
        game_state: { events: { cube15a: true } },
      },
      {
        game_stats: [{ finishTime: 0 }, { finishTime: 1_700_100_000_000 }],
      },
      {
        game_state: { events: { cube15b: true } },
      },
    ];

    expect(extractCompletionFinishTimesMs(saves)).toEqual([
      1_700_000_000_000,
      1_700_100_000_000,
    ]);
  });

  it("aggregates daily completion counts", () => {
    const reference = new Date("2024-06-03T12:00:00Z");
    const day1 = new Date("2024-06-01T10:00:00Z").getTime();
    const day2 = new Date("2024-06-02T15:00:00Z").getTime();
    const day3a = new Date("2024-06-03T08:00:00Z").getTime();
    const day3b = new Date("2024-06-03T20:00:00Z").getTime();

    const series = buildDailyCompletionCounts(
      [day1, day2, day3a, day3b],
      3,
      reference,
    );

    expect(series).toHaveLength(3);
    expect(series[0].completions).toBe(1);
    expect(series[1].completions).toBe(1);
    expect(series[2].completions).toBe(2);
  });

  it("merges daily completions with DAU by UTC day", () => {
    const reference = new Date("2024-06-03T12:00:00Z");
    const finishTimes = [
      new Date("2024-06-01T10:00:00Z").getTime(),
      new Date("2024-06-03T08:00:00Z").getTime(),
      new Date("2024-06-03T20:00:00Z").getTime(),
    ];
    const dauRows = [
      { date: "2024-06-01", active_user_count: 100 },
      { date: "2024-06-02", active_user_count: 50 },
      { date: "2024-06-03", active_user_count: 200 },
    ];

    const series = buildDailyCompletionsVsPlayers(
      finishTimes,
      dauRows,
      3,
      reference,
    );

    expect(series).toEqual([
      { day: "Jun 01", completions: 1, players: 100, completionRate: 1 },
      { day: "Jun 02", completions: 0, players: 50, completionRate: 0 },
      { day: "Jun 03", completions: 2, players: 200, completionRate: 1 },
    ]);
  });

  it("builds completion distribution from saves", () => {
    const distribution = getGameCompletionDistribution([
      { game_state: { events: { cube14a: true } } },
      { game_state: { events: {} } },
      { game_state: { gameComplete: true } },
    ]);

    expect(distribution).toEqual([
      { name: "Completed", value: 2 },
      { name: "Not Completed", value: 1 },
    ]);
  });
});
