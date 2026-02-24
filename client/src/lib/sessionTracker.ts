const SID_KEY = "st_sid";
const START_KEY = "st_start";

function generateId(): string {
  return crypto.randomUUID?.() ??
    Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function getSession(): { sid: string; start: number } {
  let sid = sessionStorage.getItem(SID_KEY);
  let start = Number(sessionStorage.getItem(START_KEY));

  if (!sid || !start) {
    sid = generateId();
    start = Date.now();
    sessionStorage.setItem(SID_KEY, sid);
    sessionStorage.setItem(START_KEY, String(start));
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
    fetch("/api/session/ping", { method: "POST", body: blob, keepalive: true }).catch(() => {});
  }
}

let initialized = false;

export function initSessionTracker() {
  if (initialized) return;
  initialized = true;

  getSession();

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") sendPing();
  });

  window.addEventListener("beforeunload", sendPing);
}
