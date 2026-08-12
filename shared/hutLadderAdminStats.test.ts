import { describe, expect, it } from "vitest";
import {
  computeFinisherRatesByCohort,
  computeHutLadderFunnel,
  computeHutLadderStepDropTimeSeries,
  filterHutLadderCohort,
  highestAttackWaveNumber,
  hutLadderReachChartData,
  hutLadderStepDropChartData,
  hutLadderDropVsStartedChartData,
  totalAttackWavesWon,
  utcWeekStartMs,
  HUT_LADDER_TIMESERIES_MIN_STARTED,
} from "./hutLadderAdminStats";

function save(opts: {
  created_at: string;
  gameStarted?: boolean;
  cruelMode?: boolean;
  woodenHut?: number;
  stoneHut?: number;
  referralProcessed?: boolean;
  gameComplete?: boolean;
  wavesWon?: number;
  postCompletionAttackWaveCount?: number;
  events?: Record<string, unknown>;
  /** Legacy flags without boss victories (for imply tests). */
  legacySeen?: Record<string, true>;
}) {
  const seen: Record<string, true> = { ...(opts.legacySeen ?? {}) };
  const wavesWon = opts.wavesWon ?? 0;
  const flags = [
    "firstWaveVictory",
    "secondWaveVictory",
    "thirdWaveVictory",
    "fourthWaveVictory",
    "fifthWaveVictory",
    "firstBossWaveVictory",
    "sixthWaveVictory",
    "seventhWaveVictory",
    "eighthWaveVictory",
    "ninthWaveVictory",
    "tenthWaveVictory",
    "secondBossWaveVictory",
  ] as const;
  for (let i = 0; i < wavesWon; i++) {
    seen[flags[i]!] = true;
  }

  return {
    created_at: opts.created_at,
    game_state: {
      flags: { gameStarted: opts.gameStarted ?? true },
      cruelMode: opts.cruelMode,
      referralProcessed: opts.referralProcessed,
      gameComplete: opts.gameComplete,
      events: opts.events,
      postCompletionAttackWaveCount: opts.postCompletionAttackWaveCount,
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
    expect(funnel.waves).toHaveLength(12);

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
    // Wooden W0..W10 + stone S1..S10 + waves A1..A12 (33 points)
    expect(reach).toHaveLength(33);
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
    expect(reach[32]).toEqual({
      step: "A12",
      level: 12,
      kind: "wave",
      players: 0,
      pctOfStarted: 0,
    });

    const drops = hutLadderStepDropChartData(funnel);
    expect(drops).toHaveLength(33);
    expect(drops[0]?.drop).toBe(0);
    expect(drops[1]?.drop).toBe(25);
    expect(drops[11]?.drop).toBe(0); // S1 vs wooden ≥10
    expect(drops[21]?.drop).toBe(0); // A1 vs stone ≥10

    // Absolute drop vs starters: 4→3 at W1 = 25% of cohort (same as step %
    // here only because prev was also the full cohort).
    const dropsVsStart = hutLadderDropVsStartedChartData(funnel);
    expect(dropsVsStart).toHaveLength(33);
    expect(dropsVsStart[0]?.drop).toBe(0);
    expect(dropsVsStart[1]?.drop).toBe(25); // 1 of 4
    expect(dropsVsStart[6]?.drop).toBe(25); // W6: 3→2 = 1 of 4
    expect(dropsVsStart[10]?.drop).toBe(0); // W10: already 2 at W6+
    expect(dropsVsStart[11]?.drop).toBe(0); // S1: wooden10 2→2
    expect(dropsVsStart[22]?.drop).toBe(25); // A2: 2→1 = 1 of 4
    expect(dropsVsStart[30]?.drop).toBe(0); // A10: already 0 at A4+
  });

  it("excludes cruel mode saves from hut-ladder cohort", () => {
    const saves = [
      save({ created_at: "2026-07-20T00:00:00.000Z", woodenHut: 3 }),
      save({
        created_at: "2026-07-20T00:00:00.000Z",
        woodenHut: 10,
        cruelMode: true,
      }),
    ];
    const cohort = filterHutLadderCohort(saves, 7, now);
    expect(cohort).toHaveLength(1);
    expect(cohort[0]?.game_state?.cruelMode).toBeFalsy();
  });

  it("implies first boss from later waves but not second boss from tenth alone", () => {
    const saves = [
      save({
        created_at: "2026-07-15T00:00:00.000Z",
        woodenHut: 10,
        stoneHut: 10,
        legacySeen: {
          firstWaveVictory: true,
          secondWaveVictory: true,
          thirdWaveVictory: true,
          fourthWaveVictory: true,
          fifthWaveVictory: true,
          sixthWaveVictory: true,
          seventhWaveVictory: true,
          eighthWaveVictory: true,
          ninthWaveVictory: true,
          tenthWaveVictory: true,
        },
      }),
    ];
    const funnel = computeHutLadderFunnel(saves, 30, now);
    expect(funnel.waves[5]?.players).toBe(1); // ≥6 first boss implied
    expect(funnel.waves[11]?.players).toBe(0); // tenth alone does not imply final boss
  });

  it("implies second boss when beyond-gate progress proves legacy chart completion", () => {
    const saves = [
      save({
        created_at: "2026-07-15T00:00:00.000Z",
        woodenHut: 10,
        stoneHut: 10,
        legacySeen: {
          firstWaveVictory: true,
          secondWaveVictory: true,
          thirdWaveVictory: true,
          fourthWaveVictory: true,
          fifthWaveVictory: true,
          sixthWaveVictory: true,
          seventhWaveVictory: true,
          eighthWaveVictory: true,
          ninthWaveVictory: true,
          tenthWaveVictory: true,
          beyondGateVentureUnlocked: true,
        },
      }),
    ];
    const funnel = computeHutLadderFunnel(saves, 30, now);
    expect(funnel.waves[11]?.players).toBe(1); // ≥12 second boss implied
  });

  it("implies second boss when post-completion waves prove legacy chart completion", () => {
    const tenthThrough = {
      firstWaveVictory: true,
      secondWaveVictory: true,
      thirdWaveVictory: true,
      fourthWaveVictory: true,
      fifthWaveVictory: true,
      sixthWaveVictory: true,
      seventhWaveVictory: true,
      eighthWaveVictory: true,
      ninthWaveVictory: true,
      tenthWaveVictory: true,
    } as const;
    const saves = [
      save({
        created_at: "2026-07-15T00:00:00.000Z",
        woodenHut: 10,
        stoneHut: 10,
        legacySeen: { ...tenthThrough },
        postCompletionAttackWaveCount: 1,
      }),
    ];
    const funnel = computeHutLadderFunnel(saves, 30, now);
    expect(funnel.waves[11]?.players).toBe(1);
  });

  it("implies second boss when post-siege cube progress proves legacy chart completion", () => {
    const saves = [
      save({
        created_at: "2026-07-15T00:00:00.000Z",
        woodenHut: 10,
        stoneHut: 10,
        legacySeen: {
          firstWaveVictory: true,
          secondWaveVictory: true,
          thirdWaveVictory: true,
          fourthWaveVictory: true,
          fifthWaveVictory: true,
          sixthWaveVictory: true,
          seventhWaveVictory: true,
          eighthWaveVictory: true,
          ninthWaveVictory: true,
          tenthWaveVictory: true,
        },
        events: { cube12: true },
      }),
    ];
    const funnel = computeHutLadderFunnel(saves, 30, now);
    expect(funnel.waves[11]?.players).toBe(1);
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
    // Same loss as % of starters: (3−1)/4 = 50%
    const dropsVsStart = hutLadderDropVsStartedChartData(funnel);
    const s1 = dropsVsStart.find((d) => d.step === "S1");
    expect(s1?.drop).toBe(50);
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

  it("utcWeekStartMs lands on Monday UTC", () => {
    // Tuesday 2026-07-21 → Monday 2026-07-20
    expect(utcWeekStartMs(Date.parse("2026-07-21T12:00:00.000Z"))).toBe(
      Date.parse("2026-07-20T00:00:00.000Z"),
    );
    // Sunday → previous Monday
    expect(utcWeekStartMs(Date.parse("2026-07-19T23:00:00.000Z"))).toBe(
      Date.parse("2026-07-13T00:00:00.000Z"),
    );
  });

  it("computes weekly step-drop time series and omits in-progress week", () => {
    // now = Tue 2026-07-21 → current week Mon 2026-07-20 (omitted);
    // last complete weeks: Mon 2026-07-06 and Mon 2026-07-13.
    const weekA: ReturnType<typeof save>[] = [];
    // 20 starters: 15 reach W1 → W1 drop 25%
    for (let i = 0; i < 15; i++) {
      weekA.push(
        save({ created_at: "2026-07-07T12:00:00.000Z", woodenHut: 1 }),
      );
    }
    for (let i = 0; i < 5; i++) {
      weekA.push(
        save({ created_at: "2026-07-08T12:00:00.000Z", woodenHut: 0 }),
      );
    }

    const weekB: ReturnType<typeof save>[] = [];
    // 20 starters: 10 reach W1 → W1 drop 50%
    for (let i = 0; i < 10; i++) {
      weekB.push(
        save({ created_at: "2026-07-14T12:00:00.000Z", woodenHut: 1 }),
      );
    }
    for (let i = 0; i < 10; i++) {
      weekB.push(
        save({ created_at: "2026-07-15T12:00:00.000Z", woodenHut: 0 }),
      );
    }

    // In-progress week (should not appear)
    const currentWeek = [
      save({ created_at: "2026-07-20T12:00:00.000Z", woodenHut: 0 }),
      save({ created_at: "2026-07-21T08:00:00.000Z", woodenHut: 5 }),
    ];

    // Tiny prior week (< min) → axis point with null stage values
    const tinyWeek = [
      save({ created_at: "2026-06-30T12:00:00.000Z", woodenHut: 0 }),
      save({ created_at: "2026-07-01T12:00:00.000Z", woodenHut: 1 }),
    ];

    const series = computeHutLadderStepDropTimeSeries(
      [...tinyWeek, ...weekA, ...weekB, ...currentWeek],
      30,
      now,
    );

    expect(series.some((p) => p.week === "2026-07-20")).toBe(false);

    const tiny = series.find((p) => p.week === "2026-06-29"); // Mon of that week
    expect(tiny).toBeDefined();
    expect(tiny!.startedCount).toBe(2);
    expect(tiny!.startedCount).toBeLessThan(HUT_LADDER_TIMESERIES_MIN_STARTED);
    expect(tiny!.W1).toBeNull();

    const a = series.find((p) => p.week === "2026-07-06");
    expect(a).toBeDefined();
    expect(a!.startedCount).toBe(20);
    expect(a!.W1).toBe(25);

    const b = series.find((p) => p.week === "2026-07-13");
    expect(b).toBeDefined();
    expect(b!.startedCount).toBe(20);
    expect(b!.W1).toBe(50);

    // Contiguous axis includes the empty gap week between tiny and A if any
    const idxTiny = series.findIndex((p) => p.week === "2026-06-29");
    const idxA = series.findIndex((p) => p.week === "2026-07-06");
    expect(idxA).toBe(idxTiny + 1);
  });

  it("counts attack-wave victories and highest wave including post-completion", () => {
    expect(totalAttackWavesWon(undefined, 0)).toBe(0);
    expect(highestAttackWaveNumber(undefined, 0)).toBe(0);

    const seen = {
      firstWaveVictory: true,
      secondWaveVictory: true,
      thirdWaveVictory: true,
    };
    expect(totalAttackWavesWon(seen, 0)).toBe(3);
    expect(highestAttackWaveNumber(seen, 0)).toBe(3);

    const allChart = Object.fromEntries(
      [
        "firstWaveVictory",
        "secondWaveVictory",
        "thirdWaveVictory",
        "fourthWaveVictory",
        "fifthWaveVictory",
        "firstBossWaveVictory",
        "sixthWaveVictory",
        "seventhWaveVictory",
        "eighthWaveVictory",
        "ninthWaveVictory",
        "tenthWaveVictory",
        "secondBossWaveVictory",
      ].map((flag) => [flag, true as const]),
    );
    expect(totalAttackWavesWon(allChart, 2)).toBe(14);
    expect(highestAttackWaveNumber(allChart, 2)).toBe(14);
  });
});
