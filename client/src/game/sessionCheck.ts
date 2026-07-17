/**
 * Classify Supabase auth.refreshSession() failures for the game-loop session checker.
 *
 * Transient → retry silently (keep playing on local save).
 * Non-transient → ask the player to sign in again (never delete local save).
 */

export type SessionCheckFailureKind = "transient" | "reauth";

const TRANSIENT_HTTP_STATUSES = new Set([
  408, // Request Timeout
  425, // Too Early
  429, // Too Many Requests
  500, 501, 502, 503, 504,
  520, 521, 522, 523, 524, 525, 526, 527, 528, 529, // Cloudflare / edge
]);

const TRANSIENT_ERROR_CODES = new Set([
  // Same-browser refresh race (two tabs / wake-from-sleep); not a second person.
  "refresh_token_already_used",
]);

function asRecord(error: unknown): Record<string, unknown> | null {
  if (!error || typeof error !== "object") return null;
  return error as Record<string, unknown>;
}

function readStatus(error: Record<string, unknown>): number | null {
  const status = error.status ?? error.statusCode;
  if (typeof status === "number" && Number.isFinite(status)) return status;
  if (typeof status === "string" && /^\d+$/.test(status)) return Number(status);
  return null;
}

function readCode(error: Record<string, unknown>): string | null {
  const code = error.code;
  return typeof code === "string" && code.length > 0 ? code : null;
}

function readMessage(error: unknown): string {
  if (typeof error === "string") return error;
  const rec = asRecord(error);
  if (rec && typeof rec.message === "string") return rec.message;
  if (error instanceof Error) return error.message;
  return "";
}

/** True when the failure is likely network / overload / refresh-token race — safe to retry. */
export function isTransientSessionCheckError(error: unknown): boolean {
  if (error == null) return false;

  const rec = asRecord(error);
  const name =
    (rec && typeof rec.name === "string" && rec.name) ||
    (error instanceof Error ? error.name : "") ||
    "";
  const message = readMessage(error);
  const lower = message.toLowerCase();

  if (name === "AuthRetryableFetchError") return true;
  if (name === "AbortError") return true;
  if (name === "TimeoutError") return true;

  if (
    lower.includes("failed to fetch") ||
    lower.includes("networkerror") ||
    lower.includes("network request failed") ||
    lower.includes("load failed") ||
    lower.includes("timed out") ||
    lower.includes("timeout") ||
    lower.includes("econnreset") ||
    lower.includes("enotfound") ||
    lower.includes("econnrefused")
  ) {
    return true;
  }

  if (rec) {
    const status = readStatus(rec);
    if (status != null && TRANSIENT_HTTP_STATUSES.has(status)) return true;

    const code = readCode(rec);
    if (code && TRANSIENT_ERROR_CODES.has(code)) return true;

    // supabase-js marks retryable fetch failures with this flag
    if (rec.__isAuthError === true && rec.name === "AuthRetryableFetchError") {
      return true;
    }
  }

  return false;
}

/**
 * Classify a refreshSession failure.
 * - `transient`: retry; do not show dialog; do not clear signed-in flag
 * - `reauth`: session is gone or revoked; player must sign in again (keep local save)
 *
 * No-session with no error is treated as reauth (storage cleared / already signed out).
 */
export function classifySessionCheckFailure(
  error: unknown,
  session: unknown,
): SessionCheckFailureKind {
  if (session) {
    // Successful refresh — caller should not invoke this.
    return "reauth";
  }
  if (error != null && isTransientSessionCheckError(error)) {
    return "transient";
  }
  // No session and no error, or a hard auth error (expired, revoked, not found, …)
  return "reauth";
}
