import { GAME_ENDING_CUBE_EVENT_IDS } from "./gameCompletionAdminStats";

export type ChurnRateSaveRow = {
  user_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  game_state?: {
    events?: Record<string, unknown>;
    referralProcessed?: boolean;
  } | null;
};

export type ChurnRateDayPoint = {
  day: string;
  churnRate: number;
  churnedCount: number;
  eligibleCount: number;
};

/** Row shape from `admin_churn_rate_over_time` RPC (snake_case). */
export type ChurnRateRpcRow = {
  day: string;
  churn_rate: number | string;
  churned_count: number | string;
  eligible_count: number | string;
};

const MONTH_LABELS = [
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

function endOfLocalDay(year: number, month: number, day: number): Date {
  return new Date(year, month, day, 23, 59, 59, 999);
}

function dayLabelFromParts(
  year: number,
  month: number,
  day: number,
  compact: boolean,
): string {
  const monthName = MONTH_LABELS[month] ?? "Jan";
  if (compact) return `${monthName} ${day}`;
  return `${monthName} ${String(day).padStart(2, "0")}`;
}

/** Format an ISO date (`YYYY-MM-DD` or timestamptz) for the churn chart axis. */
export function formatChurnRateDayLabel(
  isoDay: string,
  windowDays: number,
): string {
  const compact = windowDays > 90;
  // Prefer calendar date from the string to avoid TZ shifting the day.
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDay);
  if (m) {
    return dayLabelFromParts(
      Number(m[1]),
      Number(m[2]) - 1,
      Number(m[3]),
      compact,
    );
  }
  const d = new Date(isoDay);
  if (!Number.isFinite(d.getTime())) return isoDay;
  return dayLabelFromParts(
    d.getUTCFullYear(),
    d.getUTCMonth(),
    d.getUTCDate(),
    compact,
  );
}

export function mapChurnRateRpcRows(
  rows: ChurnRateRpcRow[],
  windowDays: number,
): ChurnRateDayPoint[] {
  return rows.map((row) => ({
    day: formatChurnRateDayLabel(String(row.day), windowDays),
    churnRate: Math.round(Number(row.churn_rate) || 0),
    churnedCount: Math.round(Number(row.churned_count) || 0),
    eligibleCount: Math.round(Number(row.eligible_count) || 0),
  }));
}

export function hasGameEndingEvents(
  events: Record<string, unknown> | undefined | null,
): boolean {
  if (!events) return false;
  return GAME_ENDING_CUBE_EVENT_IDS.some((id) => events[id] === true);
}

/**
 * Daily churn % for the last `windowDays` (inclusive of today).
 *
 * Prefer the DB RPC `admin_churn_rate_over_time` in the admin dashboard —
 * this client-side path remains for unit tests / fallback.
 *
 * Among non-referred saves with created_at ≤ end of calendar day D:
 *   churned = !game-ending && updated_at < end of (D − churnDays)
 *   rate = churned / eligible
 *
 * Uses current save.updated_at (no historical activity log). Returners look
 * “never churned” on earlier days.
 */
export function computeChurnRateOverTime(
  saves: ChurnRateSaveRow[],
  churnDays: number,
  options?: { windowDays?: number; now?: Date },
): ChurnRateDayPoint[] {
  const windowDays = options?.windowDays ?? 30;
  const now = options?.now ?? new Date();
  const compactLabels = windowDays > 90;

  type Indexed = {
    createdMs: number;
    activityMs: number;
    completed: boolean;
  };

  const byUser = new Map<string, Indexed>();
  for (const save of saves) {
    const userId = save.user_id;
    if (!userId) continue;
    if (save.game_state?.referralProcessed === true) continue;
    if (!save.created_at || !save.updated_at) continue;
    const createdMs = Date.parse(save.created_at);
    const activityMs = Date.parse(save.updated_at);
    if (!Number.isFinite(createdMs) || !Number.isFinite(activityMs)) continue;

    const completed = hasGameEndingEvents(save.game_state?.events);
    const existing = byUser.get(userId);
    if (!existing || activityMs > existing.activityMs) {
      byUser.set(userId, { createdMs, activityMs, completed });
    }
  }

  const points: ChurnRateDayPoint[] = [];
  const todayY = now.getFullYear();
  const todayM = now.getMonth();
  const todayD = now.getDate();

  for (let i = windowDays; i >= 0; i--) {
    const dayEnd = endOfLocalDay(todayY, todayM, todayD - i);
    const cutoff = endOfLocalDay(todayY, todayM, todayD - i - churnDays);
    const cutoffMs = cutoff.getTime();
    const dayEndMs = dayEnd.getTime();

    let eligibleCount = 0;
    let churnedCount = 0;

    for (const row of byUser.values()) {
      if (row.createdMs > dayEndMs) continue;
      eligibleCount++;
      if (!row.completed && row.activityMs < cutoffMs) {
        churnedCount++;
      }
    }

    points.push({
      day: dayLabelFromParts(
        dayEnd.getFullYear(),
        dayEnd.getMonth(),
        dayEnd.getDate(),
        compactLabels,
      ),
      churnRate:
        eligibleCount > 0
          ? Math.round((churnedCount / eligibleCount) * 100)
          : 0,
      churnedCount,
      eligibleCount,
    });
  }

  return points;
}
