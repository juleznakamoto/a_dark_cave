import { describe, expect, it } from "vitest";
import {
  computeChurnRateOverTime,
  formatChurnRateDayLabel,
  mapChurnRateRpcRows,
} from "./churnRateAdminStats";

describe("computeChurnRateOverTime", () => {
  const now = new Date(2026, 6, 22, 15, 0, 0); // local Jul 22 2026

  it("uses all non-referred saves (not click-gated)", () => {
    const saves = [
      {
        user_id: "a",
        created_at: "2026-06-01T00:00:00.000Z",
        updated_at: "2026-06-01T00:00:00.000Z",
        game_state: { events: {} },
      },
      {
        user_id: "b",
        created_at: "2026-06-01T00:00:00.000Z",
        updated_at: "2026-07-22T12:00:00.000Z",
        game_state: { events: {} },
      },
      {
        user_id: "ref",
        created_at: "2026-06-01T00:00:00.000Z",
        updated_at: "2026-06-01T00:00:00.000Z",
        game_state: { events: {}, referralProcessed: true },
      },
    ];

    const series = computeChurnRateOverTime(saves, 3, {
      windowDays: 0,
      now,
    });

    expect(series).toHaveLength(1);
    // referred excluded; 1 churned / 2 eligible → 50%
    expect(series[0]?.churnRate).toBe(50);
    expect(series[0]?.eligibleCount).toBe(2);
    expect(series[0]?.churnedCount).toBe(1);
  });

  it("excludes completed games from churned but keeps them eligible", () => {
    const saves = [
      {
        user_id: "done",
        created_at: "2026-06-01T00:00:00.000Z",
        updated_at: "2026-06-01T00:00:00.000Z",
        game_state: { events: { cube13: true } },
      },
      {
        user_id: "churned",
        created_at: "2026-06-01T00:00:00.000Z",
        updated_at: "2026-06-01T00:00:00.000Z",
        game_state: { events: {} },
      },
    ];

    const series = computeChurnRateOverTime(saves, 3, {
      windowDays: 0,
      now,
    });

    expect(series[0]?.eligibleCount).toBe(2);
    expect(series[0]?.churnedCount).toBe(1);
    expect(series[0]?.churnRate).toBe(50);
  });

  it("does not count users created after the as-of day", () => {
    const saves = [
      {
        user_id: "old",
        created_at: "2026-07-01T00:00:00.000Z",
        updated_at: "2026-07-01T00:00:00.000Z",
        game_state: { events: {} },
      },
      {
        user_id: "new",
        created_at: "2026-07-22T10:00:00.000Z",
        updated_at: "2026-07-22T10:00:00.000Z",
        game_state: { events: {} },
      },
    ];

    const series = computeChurnRateOverTime(saves, 3, {
      windowDays: 1,
      now,
    });

    expect(series[0]?.eligibleCount).toBe(1);
    expect(series[0]?.churnedCount).toBe(1);
    expect(series[1]?.eligibleCount).toBe(2);
  });

  it("marks long-inactive accounts as churned on early days in the window", () => {
    const saves = [
      {
        user_id: "old-churn",
        created_at: "2026-05-01T00:00:00.000Z",
        updated_at: "2026-05-15T00:00:00.000Z",
        game_state: { events: {} },
      },
      {
        user_id: "active",
        created_at: "2026-05-01T00:00:00.000Z",
        updated_at: "2026-07-22T12:00:00.000Z",
        game_state: { events: {} },
      },
    ];

    // As of Jun 22 (30 days before Jul 22): old-churn is already inactive 3d+
    const series = computeChurnRateOverTime(saves, 3, {
      windowDays: 30,
      now,
    });
    expect(series[0]?.day).toMatch(/Jun/);
    expect(series[0]?.eligibleCount).toBe(2);
    expect(series[0]?.churnedCount).toBe(1);
    expect(series[0]?.churnRate).toBe(50);
  });
});

describe("mapChurnRateRpcRows", () => {
  it("maps snake_case RPC rows to chart points with axis labels", () => {
    const points = mapChurnRateRpcRows(
      [
        {
          day: "2026-07-01",
          churn_rate: 42,
          churned_count: 100,
          eligible_count: 240,
        },
        {
          day: "2026-07-22",
          churn_rate: "67",
          churned_count: "200",
          eligible_count: "300",
        },
      ],
      30,
    );
    expect(points).toEqual([
      {
        day: "Jul 01",
        churnRate: 42,
        churnedCount: 100,
        eligibleCount: 240,
      },
      {
        day: "Jul 22",
        churnRate: 67,
        churnedCount: 200,
        eligibleCount: 300,
      },
    ]);
  });

  it("uses compact labels for long windows", () => {
    expect(formatChurnRateDayLabel("2026-07-22", 180)).toBe("Jul 22");
  });
});
