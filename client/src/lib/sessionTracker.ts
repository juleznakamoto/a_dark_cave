import { isLocalOnlyEdition } from "@/lib/edition";

const SID_KEY = "st_sid";
const START_KEY = "st_start";
const PING_INTERVAL_MS = 5 * 60 * 1000;

function generateId(): string {
  return (
    crypto.randomUUID?.() ??
    Math.random().toString(36).slice(2) + Date.now().toString(36)
  );
}

/**
 * Shared anonymous tab session id used by session pings and UTM landings
 * so Traffic can join sessions ↔ UTM rows.
 */
export function getOrCreateAnalyticsSessionId(): string {
  try {
    let sid = sessionStorage.getItem(SID_KEY);
    if (!sid) {
      sid = generateId();
      sessionStorage.setItem(SID_KEY, sid);
    }
    return sid;
  } catch {
    return generateId();
  }
}

function getSession(): { sid: string; start: number } {
  const sid = getOrCreateAnalyticsSessionId();
  let start = Number(sessionStorage.getItem(START_KEY));

  if (!start) {
    start = Date.now();
    try {
      sessionStorage.setItem(START_KEY, String(start));
    } catch {
      // ignore quota / private mode
    }
  }

  return { sid, start };
}

function sendPing() {
  const { sid, start } = getSession();
  const dur = Math.round((Date.now() - start) / 1000);
  if (dur < 1) return;

  const payload = JSON.stringify({ sid, dur });
  const blob = new Blob([payload], { type: "application/json" });

  if (navigator.sendBeacon) {
    navigator.sendBeacon("/api/session/ping", blob);
  } else {
    fetch("/api/session/ping", {
      method: "POST",
      body: blob,
      keepalive: true,
    }).catch(() => { });
  }
}

let initialized = false;

export function initSessionTracker() {
  // Steam / Galaxy / CrazyGames have no Express `/api/session/ping` host.
  if (isLocalOnlyEdition()) return;
  if (initialized) return;
  initialized = true;

  getSession();

  // Register the visit quickly so short start-screen bounces still count.
  setTimeout(sendPing, 1500);

  // Primary: ping every 5 minutes so data survives crashes / killed tabs
  setInterval(sendPing, PING_INTERVAL_MS);

  // Supplementary: capture the moment the user leaves (best-effort)
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") sendPing();
  });
}
