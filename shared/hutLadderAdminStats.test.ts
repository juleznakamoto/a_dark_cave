import { describe, expect, it } from "vitest";
import {
  computeFinisherRatesByCohort,
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
  referralProcessed?: boolean;
  gameComplete?: boolean;
  wavesWon?: number;
}) {
  const seen: Record<string, true> = {};
  const wavesWon = opts.wavesWon ?? 0;
  const flags = [
    "firstWaveVictory",
    "secondWaveVictory",
    "thirdWaveVictory",
    "fourthWaveVictory",
    "fifthWaveVictory",
    "sixthWaveVictory",
    "seventhWaveVictory",
    "eighthWaveVictory",
    "ninthWaveVictory",
    "tenthWaveVictory",
  ] as const;
  for (let i = 0; i < wavesWon; i++) {
    seen[flags[i]!] = true;
  }

  return {
    created_at: opts.created_at,
    game_state: {
      flags: { gameStarted: opts.gameStarted ?? true },
      referralProcessed: opts.referralProcessed,
      gameComplete: opts.gameComplete,
      buildings: {
        woodenHut: opts.woodenHut ?? 0,
        stoneHut: opts.stoneHut ?? 0,
      },
      story: Object.keys(seen).length > 0 ? { seen } : undefined,
    },
  };
}

describe("hutLadderAdminStats", () => {
  const now = new Date("2026-07-21T12:00:00.000Z");

  it("filters to gameStarted within cohort window and drops referrals", () => {
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
      save({
        created_at: "2026-07-20T00:00:00.000Z",
        woodenHut: 0,
        referralProcessed: true,
      }),
    ];
    const cohort = filterHutLadderCohort(saves, 7, now);
    expect(cohort).toHaveLength(1);
    expect(cohort[0]?.game_state?.buildings?.woodenHut).toBe(3);
    const funnel = computeHutLadderFunnel(saves, 7, now);
    expect(funnel.excludedReferredCount).toBe(1);
    expect(funnel.startedCount).toBe(1);
  });

  it("computes reach and step drops through stone unlock and waves", () => {
    const saves = [
      save({ created_at: "2026-07-15T00:00:00.000Z", woodenHut: 0 }),
      save({ created_at: "2026-07-15T00:00:00.000Z", woodenHut: 5 }),
      save({
        created_at: "2026-07-15T00:00:00.000Z",
        woodenHut: 10,
        stoneHut: 10,
        wavesWon: 1,
      }),
      save({
        created_at: "2026-07-15T00:00:00.000Z",
        woodenHut: 10,
        stoneHut: 10,
        wavesWon: 3,
      }),
    ];
    const funnel = computeHutLadderFunnel(saves, 30, now);
    expect(funnel.startedCount).toBe(4);
    expect(funnel.excludedReferredCount).toBe(0);
    expect(funnel.wooden[0]?.players).toBe(4);
    expect(funnel.wooden[1]?.players).toBe(3);
    expect(funnel.wooden[5]?.players).toBe(3);
    expect(funnel.wooden[10]?.players).toBe(2);
    expect(funnel.stone[1]?.players).toBe(2);
    expect(funnel.stone[10]?.players).toBe(2);
    expect(funnel.wooden10Count).toBe(2);
    expect(funnel.wooden10WithStone).toBe(2);
    expect(funnel.stone10Count).toBe(2);
    expect(funnel.waves[0]?.level).toBe(1);
    expect(funnel.waves[0]?.players).toBe(2);
    expect(funnel.waves[2]?.players).toBe(1); // ≥3
    expect(funnel.waves[9]?.players).toBe(0);

    // 4 → 3 at first wooden: drop 25%
    expect(funnel.wooden[1]?.stepDropPct).toBe(25);
    expect(funnel.wooden[1]?.stepKeepPct).toBe(75);

    // Stone ≥1 step vs wooden ≥10 (2→2), not vs all starters (4→2)
    expect(funnel.stone[1]?.stepKeepPct).toBe(100);
    expect(funnel.stone[1]?.stepDropPct).toBe(0);

    // A1 vs stone ≥10 (2→2)
    expect(funnel.waves[0]?.stepKeepPct).toBe(100);
    expect(funnel.waves[0]?.stepDropPct).toBe(0);

    const reach = hutLadderReachChartData(funnel);
    // Wooden W0..W10 + stone S1..S10 + waves A1..A10 (31 points)
    expect(reach).toHaveLength(31);
    expect(reach[0]).toEqual({
      step: "W0",
      level: 0,
      kind: "wooden",
      players: 4,
      pctOfStarted: 100,
    });
    expect(reach[10]).toEqual({
      step: "W10",
      level: 10,
      kind: "wooden",
      players: 2,
      pctOfStarted: 50,
    });
    expect(reach[11]).toEqual({
      step: "S1",
      level: 1,
      kind: "stone",
      players: 2,
      pctOfStarted: 50,
    });
    expect(reach[20]).toEqual({
      step: "S10",
      level: 10,
      kind: "stone",
      players: 2,
      pctOfStarted: 50,
    });
    expect(reach[21]).toEqual({
      step: "A1",
      level: 1,
      kind: "wave",
      players: 2,
      pctOfStarted: 50,
    });
    expect(reach[30]).toEqual({
      step: "A10",
      level: 10,
      kind: "wave",
      players: 0,
      pctOfStarted: 0,
    });

    const drops = hutLadderStepDropChartData(funnel);
    expect(drops).toHaveLength(31);
    expect(drops[0]?.drop).toBe(0);
    expect(drops[1]?.drop).toBe(25);
    expect(drops[11]?.drop).toBe(0); // S1 vs wooden ≥10
    expect(drops[21]?.drop).toBe(0); // A1 vs stone ≥10
  });

  it("stone ≥1 step drop is vs wooden ≥10 unlock cohort", () => {
    const saves = [
      save({ created_at: "2026-07-15T00:00:00.000Z", woodenHut: 10, stoneHut: 0 }),
      save({ created_at: "2026-07-15T00:00:00.000Z", woodenHut: 10, stoneHut: 0 }),
      save({ created_at: "2026-07-15T00:00:00.000Z", woodenHut: 10, stoneHut: 1 }),
      save({ created_at: "2026-07-15T00:00:00.000Z", woodenHut: 5, stoneHut: 0 }),
    ];
    const funnel = computeHutLadderFunnel(saves, 30, now);
    // 3 at wooden ≥10, 1 built first stone → keep 33.3%, drop 66.7%
    expect(funnel.wooden10Count).toBe(3);
    expect(funnel.stone[1]?.players).toBe(1);
    expect(funnel.stone[1]?.stepKeepPct).toBe(33.3);
    expect(funnel.stone[1]?.stepDropPct).toBe(66.7);
  });

  it("A1 step drop is vs stone ≥10 unlock cohort", () => {
    const saves = [
      save({
        created_at: "2026-07-15T00:00:00.000Z",
        woodenHut: 10,
        stoneHut: 10,
        wavesWon: 0,
      }),
      save({
        created_at: "2026-07-15T00:00:00.000Z",
        woodenHut: 10,
        stoneHut: 10,
        wavesWon: 0,
      }),
      save({
        created_at: "2026-07-15T00:00:00.000Z",
        woodenHut: 10,
        stoneHut: 10,
        wavesWon: 1,
      }),
      save({
        created_at: "2026-07-15T00:00:00.000Z",
        woodenHut: 10,
        stoneHut: 5,
        wavesWon: 0,
      }),
    ];
    const funnel = computeHutLadderFunnel(saves, 30, now);
    expect(funnel.stone10Count).toBe(3);
    expect(funnel.waves[0]?.players).toBe(1);
    expect(funnel.waves[0]?.stepKeepPct).toBe(33.3);
    expect(funnel.waves[0]?.stepDropPct).toBe(66.7);
  });

  it("computes finisher rates across cohort windows", () => {
    const saves = [
      save({
        created_at: "2026-07-20T00:00:00.000Z",
        gameComplete: true,
      }),
      save({
        created_at: "2026-07-19T18:00:00.000Z",
        gameComplete: false,
      }),
      save({
        created_at: "2026-06-01T00:00:00.000Z",
        gameComplete: true,
      }),
      save({
        created_at: "2026-07-20T00:00:00.000Z",
        gameComplete: true,
        referralProcessed: true,
      }),
    ];
    const rates = computeFinisherRatesByCohort(saves, now);
    expect(rates.map((r) => r.days)).toEqual([3, 7, 30, 60, 90]);
    const r3 = rates.find((r) => r.days === 3)!;
    expect(r3.startedCount).toBe(2);
    expect(r3.finishedCount).toBe(1);
    expect(r3.ratePct).toBe(50);
    const r90 = rates.find((r) => r.days === 90)!;
    expect(r90.startedCount).toBe(3);
    expect(r90.finishedCount).toBe(2);
    expect(r90.ratePct).toBe(66.7);
  });
});
