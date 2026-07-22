import { describe, expect, it } from "vitest";
import { computeChurnRateOverTime } from "./churnRateAdminStats";

describe("computeChurnRateOverTime", () => {
  const now = new Date(2026, 6, 22, 15, 0, 0); // local Jul 22 2026

  it("uses click users as the eligible population (not all saves)", () => {
    const saves = [
      {
        user_id: "a",
        created_at: "2026-06-01T00:00:00.000Z",
        updated_at: "2026-06-01T00:00:00.000Z", // long churned
        game_state: { events: {} },
      },
      {
        user_id: "b",
        created_at: "2026-06-01T00:00:00.000Z",
        updated_at: "2026-07-22T12:00:00.000Z", // active today
        game_state: { events: {} },
      },
      {
        user_id: "no-clicks",
        created_at: "2026-06-01T00:00:00.000Z",
        updated_at: "2026-06-01T00:00:00.000Z",
        game_state: { events: {} },
      },
    ];

    const series = computeChurnRateOverTime(saves, ["a", "b"], 3, {
      windowDays: 0,
      now,
    });

    expect(series).toHaveLength(1);
    // 1 churned / 2 eligible with clicks → 50%
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

    const series = computeChurnRateOverTime(saves, ["done", "churned"], 3, {
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

    const series = computeChurnRateOverTime(saves, ["old", "new"], 3, {
      windowDays: 1,
      now,
    });

    // Yesterday (Jul 21): only "old"
    expect(series[0]?.eligibleCount).toBe(1);
    expect(series[0]?.churnedCount).toBe(1);
    // Today: both
    expect(series[1]?.eligibleCount).toBe(2);
  });
});
