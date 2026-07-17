/** Cube events that mark a game ending (matches save trigger + admin engagement tab). */
export const GAME_ENDING_CUBE_EVENT_IDS = [
  "cube13",
  "cube14a",
  "cube14b",
  "cube14c",
  "cube14d",
  "cube15a",
  "cube15b",
] as const;

const UTC_MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

export type GameStatsCompletion = {
  gameId?: string | null;
  gameMode?: string;
  startTime?: number;
  finishTime?: number;
  playTime?: number;
};

export type AdminGameSaveRow = {
  game_state?: {
    events?: Record<string, unknown>;
    gameComplete?: boolean;
  };
  game_stats?: GameStatsCompletion[] | null;
};

export type DailyActiveUsersRow = {
  date: string;
  active_user_count: number;
};

export type DailyCompletionsVsPlayersPoint = {
  day: string;
  completions: number;
  players: number;
  /** Completions per 100 active players; null when DAU is zero. */
  completionRate: number | null;
};

function utcDayKeyFromDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function utcDayLabel(date: Date, compact: boolean): string {
  const month = UTC_MONTH_NAMES[date.getUTCMonth()];
  const day = date.getUTCDate();
  return compact ? `${month} ${day}` : `${month} ${String(day).padStart(2, "0")}`;
}

function buildUtcDayKeys(
  days: number,
  now: Date = new Date(),
): Array<{ key: string; day: string }> {
  const compactLabels = days > 90;
  const result: Array<{ key: string; day: string }> = [];

  for (let i = 0; i < days; i++) {
    const date = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() - (days - 1 - i),
      ),
    );
    result.push({
      key: utcDayKeyFromDate(date),
      day: utcDayLabel(date, compactLabels),
    });
  }

  return result;
}

function countCompletionsOnUtcDay(
  finishTimesMs: number[],
  dayKey: string,
): number {
  return finishTimesMs.filter(
    (ts) => utcDayKeyFromDate(new Date(ts)) === dayKey,
  ).length;
}

export function hasReachedGameEnding(
  gameState: AdminGameSaveRow["game_state"] | undefined,
): boolean {
  if (!gameState) return false;
  if (gameState.gameComplete) return true;
  const events = gameState.events;
  if (!events) return false;
  return GAME_ENDING_CUBE_EVENT_IDS.some((id) => Boolean(events[id]));
}

/** finishTime values (ms) from persisted `game_stats` completion records. */
export function extractCompletionFinishTimesMs(
  saves: AdminGameSaveRow[],
): number[] {
  const timestamps: number[] = [];

  for (const save of saves) {
    const stats = save.game_stats;
    if (!Array.isArray(stats) || stats.length === 0) continue;

    for (const entry of stats) {
      const finishTime = entry?.finishTime;
      if (typeof finishTime === "number" && Number.isFinite(finishTime) && finishTime > 0) {
        timestamps.push(finishTime);
      }
    }
  }

  return timestamps;
}

export function buildDailyCompletionCounts(
  finishTimesMs: number[],
  days: number,
  now: Date = new Date(),
): Array<{ day: string; completions: number }> {
  return buildUtcDayKeys(days, now).map(({ key, day }) => ({
    day,
    completions: countCompletionsOnUtcDay(finishTimesMs, key),
  }));
}

export function buildDailyCompletionsVsPlayers(
  finishTimesMs: number[],
  dauRows: DailyActiveUsersRow[],
  days: number,
  now: Date = new Date(),
): DailyCompletionsVsPlayersPoint[] {
  const dauLookup = new Map<string, number>();
  for (const row of dauRows) {
    dauLookup.set(row.date.slice(0, 10), row.active_user_count);
  }

  return buildUtcDayKeys(days, now).map(({ key, day }) => {
    const completions = countCompletionsOnUtcDay(finishTimesMs, key);
    const players = dauLookup.get(key) ?? 0;
    const completionRate =
      players > 0
        ? parseFloat(((completions / players) * 100).toFixed(2))
        : null;

    return {
      day,
      completions,
      players,
      completionRate,
    };
  });
}

export function getGameCompletionDistribution(
  saves: AdminGameSaveRow[],
): Array<{ name: string; value: number }> {
  let completedCount = 0;
  let notCompletedCount = 0;

  for (const save of saves) {
    if (hasReachedGameEnding(save.game_state)) {
      completedCount++;
    } else {
      notCompletedCount++;
    }
  }

  return [
    { name: "Completed", value: completedCount },
    { name: "Not Completed", value: notCompletedCount },
  ];
}
