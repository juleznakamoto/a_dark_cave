/**
 * Admin hut-ladder funnel: reach ≥N wooden/stone huts among gameStarted saves.
 * First stone hut unlocks at woodenHut ≥ 10 (normal and cruel).
 *
 * Referred players (`referralProcessed`) are excluded — many only Make Fire to
 * grant the referrer bonus, which inflates early wooden-hut drop-off.
 */

export const HUT_LADDER_MAX_LEVEL = 10;

export type HutLadderCohortDays = 3 | 7 | 30 | 60 | 90;

export type HutLadderSaveRow = {
  created_at?: string | null;
  game_state?: {
    flags?: { gameStarted?: boolean };
    /** Set when this account was created via a referral link. */
    referralProcessed?: boolean;
    buildings?: {
      woodenHut?: number;
      stoneHut?: number;
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
  /** Players with woodenHut ≥ 10 who also have stoneHut ≥ 1. */
  wooden10WithStone: number;
  wooden10Count: number;
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
): HutLadderReachPoint[] {
  const points: HutLadderReachPoint[] = [];
  for (let level = 0; level <= HUT_LADDER_MAX_LEVEL; level++) {
    const players = counts[level] ?? 0;
    const defaultPrev = level === 0 ? null : (counts[level - 1] ?? 0);
    const prev = prevCountForLevel
      ? prevCountForLevel(level, defaultPrev)
      : defaultPrev;
    const stepKeepPct =
      prev === null || prev === 0
        ? null
        : Math.round((1000 * players) / prev) / 10;
    const stepDropPct =
      stepKeepPct === null ? null : Math.round((1000 - stepKeepPct * 10)) / 10;
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
 * Reach funnel: for each N in 0..10, how many cohort members have hut count ≥ N.
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
  let wooden10Count = 0;
  let wooden10WithStone = 0;

  for (const save of cohort) {
    const wooden = buildingCount(save.game_state?.buildings, "woodenHut");
    const stone = buildingCount(save.game_state?.buildings, "stoneHut");
    for (let level = 0; level <= HUT_LADDER_MAX_LEVEL; level++) {
      if (wooden >= level) woodenCounts[level]!++;
      if (stone >= level) stoneCounts[level]!++;
    }
    if (wooden >= 10) {
      wooden10Count++;
      if (stone >= 1) wooden10WithStone++;
    }
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
              ? "≥10 normal max"
              : `≥${level}`,
      (level, defaultPrev) =>
        level === 1 ? wooden10Count : defaultPrev,
    ),
    wooden10Count,
    wooden10WithStone,
  };
}

/** Chart rows: one point per level with both series for Recharts. */
export function hutLadderReachChartData(funnel: HutLadderFunnel): Array<{
  level: string;
  wooden: number;
  stone: number;
}> {
  return funnel.wooden.map((w, i) => ({
    level: String(w.level),
    wooden: w.players,
    stone: funnel.stone[i]?.players ?? 0,
  }));
}

export function hutLadderStepDropChartData(funnel: HutLadderFunnel): Array<{
  level: string;
  woodenDrop: number;
  stoneDrop: number;
}> {
  return funnel.wooden.map((w, i) => ({
    level: String(w.level),
    woodenDrop: w.stepDropPct ?? 0,
    stoneDrop: funnel.stone[i]?.stepDropPct ?? 0,
  }));
}
