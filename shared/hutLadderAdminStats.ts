/**
 * Admin hut-ladder funnel: reach ≥N wooden/stone huts among gameStarted saves,
 * then attack-wave victories A1–A10 (after stone ≥10).
 * First stone hut unlocks at woodenHut ≥ 10 (normal and cruel).
 *
 * Referred players (`referralProcessed`) are excluded — many only Make Fire to
 * grant the referrer bonus, which inflates early wooden-hut drop-off.
 */

import { hasReachedGameEnding } from "./gameCompletionAdminStats";

export const HUT_LADDER_MAX_LEVEL = 10;

/** story.seen victory flags for the 10 canonical attack waves (order = A1..A10). */
export const ATTACK_WAVE_VICTORY_FLAGS = [
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

export type AttackWaveVictoryFlag = (typeof ATTACK_WAVE_VICTORY_FLAGS)[number];

export type HutLadderCohortDays = 3 | 7 | 30 | 60 | 90;

export const HUT_LADDER_COHORT_DAYS: HutLadderCohortDays[] = [
  3, 7, 30, 60, 90,
];

export type HutLadderSaveRow = {
  created_at?: string | null;
  game_state?: {
    flags?: { gameStarted?: boolean };
    /** Set when this account was created via a referral link. */
    referralProcessed?: boolean;
    gameComplete?: boolean;
    events?: Record<string, unknown>;
    buildings?: {
      woodenHut?: number;
      stoneHut?: number;
    };
    story?: {
      seen?: Partial<Record<AttackWaveVictoryFlag, boolean>>;
    };
  } | null;
};

export type HutLadderReachPoint = {
  level: number;
  label: string;
  players: number;
  pctOfStarted: number;
  /** % lost vs previous level; null for level 0. */
  stepDropPct: number | null;
  /** % of previous level who still reach this; null for level 0. */
  stepKeepPct: number | null;
};

export type HutLadderFunnel = {
  cohortDays: HutLadderCohortDays;
  startedCount: number;
  /** gameStarted in window but excluded as referred. */
  excludedReferredCount: number;
  wooden: HutLadderReachPoint[];
  stone: HutLadderReachPoint[];
  /** Attack-wave victories ≥1..≥10 (A1 after stone ≥10). */
  waves: HutLadderReachPoint[];
  /** Players with woodenHut ≥ 10 who also have stoneHut ≥ 1. */
  wooden10WithStone: number;
  wooden10Count: number;
  stone10Count: number;
};

export type FinisherRateCohort = {
  days: HutLadderCohortDays;
  startedCount: number;
  finishedCount: number;
  /** finished / started × 100; 0 when startedCount is 0. */
  ratePct: number;
};

function buildingCount(
  buildings: { woodenHut?: number; stoneHut?: number } | undefined,
  key: "woodenHut" | "stoneHut",
): number {
  if (!buildings) return 0;
  const raw = buildings[key] as unknown;
  const n = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

/** Highest attack-wave victory index 0..10 (0 = none won). */
export function highestAttackWaveWon(
  seen: Partial<Record<AttackWaveVictoryFlag, boolean>> | undefined,
): number {
  if (!seen) return 0;
  let highest = 0;
  for (let i = 0; i < ATTACK_WAVE_VICTORY_FLAGS.length; i++) {
    const flag = ATTACK_WAVE_VICTORY_FLAGS[i]!;
    if (seen[flag] === true) {
      highest = i + 1;
    }
  }
  return highest;
}

export function isGameStartedSave(save: HutLadderSaveRow): boolean {
  return save.game_state?.flags?.gameStarted === true;
}

export function isReferredSave(save: HutLadderSaveRow): boolean {
  return save.game_state?.referralProcessed === true;
}

export function filterHutLadderCohort(
  saves: HutLadderSaveRow[],
  cohortDays: HutLadderCohortDays,
  now: Date = new Date(),
): HutLadderSaveRow[] {
  const cutoffMs = now.getTime() - cohortDays * 24 * 60 * 60 * 1000;
  return saves.filter((save) => {
    if (!isGameStartedSave(save)) return false;
    if (isReferredSave(save)) return false;
    if (!save.created_at) return false;
    const created = Date.parse(save.created_at);
    if (!Number.isFinite(created)) return false;
    return created >= cutoffMs;
  });
}

/** gameStarted + in window (includes referred) — for exclusion counts. */
export function countHutLadderWindowStarted(
  saves: HutLadderSaveRow[],
  cohortDays: HutLadderCohortDays,
  now: Date = new Date(),
): { startedIncludingReferred: number; referred: number } {
  const cutoffMs = now.getTime() - cohortDays * 24 * 60 * 60 * 1000;
  let startedIncludingReferred = 0;
  let referred = 0;
  for (const save of saves) {
    if (!isGameStartedSave(save) || !save.created_at) continue;
    const created = Date.parse(save.created_at);
    if (!Number.isFinite(created) || created < cutoffMs) continue;
    startedIncludingReferred++;
    if (isReferredSave(save)) referred++;
  }
  return { startedIncludingReferred, referred };
}

function buildReachSeries(
  counts: number[],
  startedCount: number,
  labelForLevel: (level: number) => string,
  /** Optional previous-level denominator override (e.g. stone ≥1 vs wooden ≥10). */
  prevCountForLevel?: (level: number, defaultPrev: number | null) => number | null,
  options?: { minLevel?: number; maxLevel?: number },
): HutLadderReachPoint[] {
  const minLevel = options?.minLevel ?? 0;
  const maxLevel = options?.maxLevel ?? HUT_LADDER_MAX_LEVEL;
  const points: HutLadderReachPoint[] = [];
  for (let level = minLevel; level <= maxLevel; level++) {
    const players = counts[level] ?? 0;
    const defaultPrev =
      level === minLevel ? null : (counts[level - 1] ?? 0);
    const prev = prevCountForLevel
      ? prevCountForLevel(level, defaultPrev)
      : defaultPrev;
    const stepKeepPct =
      prev === null || prev === 0
        ? null
        : Math.round((1000 * players) / prev) / 10;
    const stepDropPct =
      stepKeepPct === null ? null : Math.round(1000 - stepKeepPct * 10) / 10;
    points.push({
      level,
      label: labelForLevel(level),
      players,
      pctOfStarted:
        startedCount === 0
          ? 0
          : Math.round((1000 * players) / startedCount) / 10,
      stepDropPct,
      stepKeepPct,
    });
  }
  return points;
}

/**
 * Reach funnel: for each N in 0..10, how many cohort members have hut count ≥ N;
 * then attack-wave victories ≥1..≥10.
 */
export function computeHutLadderFunnel(
  saves: HutLadderSaveRow[],
  cohortDays: HutLadderCohortDays,
  now: Date = new Date(),
): HutLadderFunnel {
  const { referred: excludedReferredCount } = countHutLadderWindowStarted(
    saves,
    cohortDays,
    now,
  );
  const cohort = filterHutLadderCohort(saves, cohortDays, now);
  const startedCount = cohort.length;

  const woodenCounts = Array.from({ length: HUT_LADDER_MAX_LEVEL + 1 }, () => 0);
  const stoneCounts = Array.from({ length: HUT_LADDER_MAX_LEVEL + 1 }, () => 0);
  const waveCounts = Array.from({ length: HUT_LADDER_MAX_LEVEL + 1 }, () => 0);
  let wooden10Count = 0;
  let wooden10WithStone = 0;
  let stone10Count = 0;

  for (const save of cohort) {
    const wooden = buildingCount(save.game_state?.buildings, "woodenHut");
    const stone = buildingCount(save.game_state?.buildings, "stoneHut");
    const wavesWon = highestAttackWaveWon(save.game_state?.story?.seen);
    for (let level = 0; level <= HUT_LADDER_MAX_LEVEL; level++) {
      if (wooden >= level) woodenCounts[level]!++;
      if (stone >= level) stoneCounts[level]!++;
      if (wavesWon >= level) waveCounts[level]!++;
    }
    if (wooden >= 10) {
      wooden10Count++;
      if (stone >= 1) wooden10WithStone++;
    }
    if (stone >= 10) stone10Count++;
  }

  return {
    cohortDays,
    startedCount,
    excludedReferredCount,
    wooden: buildReachSeries(woodenCounts, startedCount, (level) =>
      level === 0
        ? "≥0 started"
        : level === 1
          ? "≥1 first"
          : level === 10
            ? "≥10 stone unlock"
            : `≥${level}`,
    ),
    // First stone unlocks at wooden ≥10 — step drop/keep at stone ≥1 uses that
    // denominator, not stone ≥0 (all starters).
    stone: buildReachSeries(
      stoneCounts,
      startedCount,
      (level) =>
        level === 0
          ? "≥0 started"
          : level === 1
            ? "≥1 (needs 10 wooden)"
            : level === 10
              ? "≥10 wave unlock"
              : `≥${level}`,
      (level, defaultPrev) =>
        level === 1 ? wooden10Count : defaultPrev,
    ),
    // Waves start after stone ≥10 — A1 step drop uses that denominator.
    waves: buildReachSeries(
      waveCounts,
      startedCount,
      (level) =>
        level === 1
          ? "≥1 (needs 10 stone)"
          : level === 10
            ? "≥10 final wave"
            : `≥${level}`,
      (level, defaultPrev) =>
        level === 1 ? stone10Count : defaultPrev,
      { minLevel: 1, maxLevel: HUT_LADDER_MAX_LEVEL },
    ),
    wooden10Count,
    wooden10WithStone,
    stone10Count,
  };
}

/**
 * Finisher rate among the same non-referred gameStarted cohorts used by the
 * hut ladder, for each window in {@link HUT_LADDER_COHORT_DAYS}.
 */
export function computeFinisherRatesByCohort(
  saves: HutLadderSaveRow[],
  now: Date = new Date(),
): FinisherRateCohort[] {
  return HUT_LADDER_COHORT_DAYS.map((days) => {
    const cohort = filterHutLadderCohort(saves, days, now);
    const startedCount = cohort.length;
    let finishedCount = 0;
    for (const save of cohort) {
      if (hasReachedGameEnding(save.game_state)) finishedCount++;
    }
    return {
      days,
      startedCount,
      finishedCount,
      ratePct:
        startedCount === 0
          ? 0
          : Math.round((1000 * finishedCount) / startedCount) / 10,
    };
  });
}

export type HutLadderChartKind = "wooden" | "stone" | "wave";

export type HutLadderReachChartPoint = {
  /** Short x-axis label, e.g. "W5" / "S1" / "A3". */
  step: string;
  level: number;
  kind: HutLadderChartKind;
  players: number;
  pctOfStarted: number;
};

export type HutLadderStepDropChartPoint = {
  step: string;
  level: number;
  kind: HutLadderChartKind;
  drop: number;
};

/**
 * Chart rows as one progression: wooden ≥0..≥10, stone ≥1..≥10, then
 * attack waves ≥1..≥10 (stone ≥0 / wave ≥0 omitted — same baseline as starters).
 */
export function hutLadderReachChartData(
  funnel: HutLadderFunnel,
): HutLadderReachChartPoint[] {
  const wooden = funnel.wooden.map((w) => ({
    step: `W${w.level}`,
    level: w.level,
    kind: "wooden" as const,
    players: w.players,
    pctOfStarted: w.pctOfStarted,
  }));
  const stone = funnel.stone
    .filter((s) => s.level >= 1)
    .map((s) => ({
      step: `S${s.level}`,
      level: s.level,
      kind: "stone" as const,
      players: s.players,
      pctOfStarted: s.pctOfStarted,
    }));
  const waves = funnel.waves.map((w) => ({
    step: `A${w.level}`,
    level: w.level,
    kind: "wave" as const,
    players: w.players,
    pctOfStarted: w.pctOfStarted,
  }));
  return [...wooden, ...stone, ...waves];
}

export function hutLadderStepDropChartData(
  funnel: HutLadderFunnel,
): HutLadderStepDropChartPoint[] {
  const wooden = funnel.wooden.map((w) => ({
    step: `W${w.level}`,
    level: w.level,
    kind: "wooden" as const,
    drop: w.stepDropPct ?? 0,
  }));
  const stone = funnel.stone
    .filter((s) => s.level >= 1)
    .map((s) => ({
      step: `S${s.level}`,
      level: s.level,
      kind: "stone" as const,
      drop: s.stepDropPct ?? 0,
    }));
  const waves = funnel.waves.map((w) => ({
    step: `A${w.level}`,
    level: w.level,
    kind: "wave" as const,
    drop: w.stepDropPct ?? 0,
  }));
  return [...wooden, ...stone, ...waves];
}
