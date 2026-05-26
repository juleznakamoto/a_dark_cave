import type { ActionResult } from "@/game/actions";
import type { LogEntry } from "@/game/rules/events";
/** Push a localized system log row (English fallback in `message` for saves; display uses `logKey`). */
export function pushSystemLog(
  result: ActionResult,
  idPrefix: string,
  logKey: string,
  fallback: string,
): void {
  if (!result.logEntries) {
    result.logEntries = [];
  }
  result.logEntries.push({
    id: `${idPrefix}-${Date.now()}`,
    logKey,
    message: fallback,
    timestamp: Date.now(),
    type: "system",
  });
}
