/** Temporary debug-session logger (session 6ea380). Remove after fix verified. */
export function debugAgentLog(
  location: string,
  message: string,
  data: Record<string, unknown>,
  hypothesisId: string,
): void {
  // #region agent log
  const payload = {
    sessionId: "6ea380",
    location,
    message,
    data,
    hypothesisId,
    timestamp: Date.now(),
  };
  fetch("http://127.0.0.1:7272/ingest/7656bad3-93b0-48e1-b386-27893db6e79a", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "6ea380",
    },
    body: JSON.stringify(payload),
  }).catch(() => {});
  // Same-origin fallback so a phone hitting the game host still persists logs.
  fetch("/api/debug-agent-log", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).catch(() => {});
  // #endregion
}

export function buildingsDebugSnapshot(state: {
  buildings?: unknown;
  flags?: { gameStarted?: boolean };
}): Record<string, unknown> {
  const buildings = state?.buildings;
  return {
    buildingsType: buildings === null ? "null" : typeof buildings,
    buildingsIsNullish: buildings == null,
    woodenHut:
      buildings != null && typeof buildings === "object"
        ? (buildings as { woodenHut?: unknown }).woodenHut
        : "n/a",
    gameStarted: Boolean(state?.flags?.gameStarted),
  };
}
