import { GAME_ENDING_CUBE_EVENT_IDS } from "./gameCompletionAdminStats";

export type ChurnRateSaveRow = {
  user_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  game_state?: {
    events?: Record<string, unknown>;
  } | null;
};

export type ChurnRateDayPoint = {
  day: string;
  churnRate: number;
  churnedCount: number;
  eligibleCount: number;
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

function dayLabel(year: number, month: number, day: number): string {
  const monthName = MONTH_LABELS[month] ?? "Jan";
  return `${monthName} ${String(day).padStart(2, "0")}`;
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
 * Population matches the rest of the Churn tab: users who appear in click data
 * and have a save. For each calendar day D, among those users with
 * created_at ≤ end of D:
 *   churned = !game-ending && updated_at < end of (D − churnDays)
 *   rate = churned / eligible
 *
 * Uses current save.updated_at (no historical activity log), so returners are
 * not counted as churned on earlier days.
 */
export function computeChurnRateOverTime(
  saves: ChurnRateSaveRow[],
  clickUserIds: Iterable<string>,
  churnDays: number,
  options?: { windowDays?: number; now?: Date },
): ChurnRateDayPoint[] {
  const windowDays = options?.windowDays ?? 30;
  const now = options?.now ?? new Date();
  const withClicks = clickUserIds instanceof Set
    ? clickUserIds
    : new Set(clickUserIds);

  type Indexed = {
    createdMs: number;
    activityMs: number;
    completed: boolean;
  };

  const byUser = new Map<string, Indexed>();
  for (const save of saves) {
    const userId = save.user_id;
    if (!userId || !withClicks.has(userId)) continue;
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
      day: dayLabel(dayEnd.getFullYear(), dayEnd.getMonth(), dayEnd.getDate()),
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
