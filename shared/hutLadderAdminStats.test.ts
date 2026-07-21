import { describe, expect, it } from "vitest";
import {
  computeHutLadderFunnel,
  filterHutLadderCohort,
  hutLadderReachChartData,
  hutLadderStepDropChartData,
} from "./hutLadderAdminStats";

function save(opts: {
  created_at: string;
  gameStarted?: boolean;
  woodenHut?: number;
  stoneHut?: number;
}) {
  return {
    created_at: opts.created_at,
    game_state: {
      flags: { gameStarted: opts.gameStarted ?? true },
      buildings: {
        woodenHut: opts.woodenHut ?? 0,
        stoneHut: opts.stoneHut ?? 0,
      },
    },
  };
}

describe("hutLadderAdminStats", () => {
  const now = new Date("2026-07-21T12:00:00.000Z");

  it("filters to gameStarted within cohort window", () => {
    const saves = [
      save({ created_at: "2026-07-20T00:00:00.000Z", woodenHut: 3 }),
      save({
        created_at: "2026-06-01T00:00:00.000Z",
        woodenHut: 10,
        stoneHut: 1,
      }),
      save({
        created_at: "2026-07-19T00:00:00.000Z",
        gameStarted: false,
        woodenHut: 10,
      }),
    ];
    const cohort = filterHutLadderCohort(saves, 7, now);
    expect(cohort).toHaveLength(1);
    expect(cohort[0]?.game_state?.buildings?.woodenHut).toBe(3);
  });

  it("computes reach and step drops through stone unlock", () => {
    const saves = [
      save({ created_at: "2026-07-15T00:00:00.000Z", woodenHut: 0 }),
      save({ created_at: "2026-07-15T00:00:00.000Z", woodenHut: 5 }),
      save({
        created_at: "2026-07-15T00:00:00.000Z",
        woodenHut: 10,
        stoneHut: 1,
      }),
      save({
        created_at: "2026-07-15T00:00:00.000Z",
        woodenHut: 10,
        stoneHut: 3,
      }),
    ];
    const funnel = computeHutLadderFunnel(saves, 30, now);
    expect(funnel.startedCount).toBe(4);
    expect(funnel.wooden[0]?.players).toBe(4);
    expect(funnel.wooden[1]?.players).toBe(3);
    expect(funnel.wooden[5]?.players).toBe(3);
    expect(funnel.wooden[10]?.players).toBe(2);
    expect(funnel.stone[1]?.players).toBe(2);
    expect(funnel.wooden10Count).toBe(2);
    expect(funnel.wooden10WithStone).toBe(2);

    // 4 → 3 at first wooden: drop 25%
    expect(funnel.wooden[1]?.stepDropPct).toBe(25);
    expect(funnel.wooden[1]?.stepKeepPct).toBe(75);

    const reach = hutLadderReachChartData(funnel);
    expect(reach[10]).toEqual({ level: "10", wooden: 2, stone: 0 });
    // stone ≥10 is 0 in this fixture
    expect(reach[0]).toEqual({ level: "0", wooden: 4, stone: 4 });

    const drops = hutLadderStepDropChartData(funnel);
    expect(drops[0]?.woodenDrop).toBe(0);
    expect(drops[1]?.woodenDrop).toBe(25);
  });
});
