import { logger } from "@/lib/logger";

/**
 * Commit id of the bundle that is actually running, baked at build time (see the
 * `__BUILD_SHA__` define in `vite.config.ts`). Comparing this compile-time constant
 * against the server's current sha means a stale cached bundle is detected on the very
 * first check, even right after a cold start of an installed PWA.
 */
const RUNNING_BUILD_SHA =
  typeof __BUILD_SHA__ !== "undefined" ? __BUILD_SHA__ : "dev";

/** Remembers the server sha we already prompted/reloaded for, to avoid reload loops. */
const RELOAD_ATTEMPT_STORAGE_KEY = "app_update_attempted_sha";

let isVersionCheckActive = false;
let versionCheckInterval: ReturnType<typeof setInterval> | null = null;
let versionCheckCallback: (() => void | Promise<void>) | null = null;
let listenersAttached = false;

/** Read the deployed build sha from the uncached `/api/version` endpoint. */
async function fetchServerSha(): Promise<string | null> {
  try {
    const response = await fetch("/api/version", { cache: "no-store" });
    if (!response.ok) return null;
    const data = (await response.json()) as { sha?: string | null };
    return typeof data.sha === "string" && data.sha.length > 0 ? data.sha : null;
  } catch (error) {
    logger.error("Error fetching /api/version:", error);
    return null;
  }
}

async function checkVersion() {
  // Local/dev builds have no real commit id to compare against.
  if (RUNNING_BUILD_SHA === "dev") return;

  const serverSha = await fetchServerSha();
  if (!serverSha || serverSha === RUNNING_BUILD_SHA) {
    try {
      sessionStorage.removeItem(RELOAD_ATTEMPT_STORAGE_KEY);
    } catch {
      // ignore
    }
    return;
  }

  // A different build is deployed. Guard against reload loops: if we already
  // prompted/reloaded for this server sha in this session and are still on the old
  // bundle (e.g. a CDN cache is lagging), don't keep firing.
  let alreadyAttempted = false;
  try {
    alreadyAttempted =
      sessionStorage.getItem(RELOAD_ATTEMPT_STORAGE_KEY) === serverSha;
  } catch {
    // sessionStorage unavailable (e.g. privacy mode) — proceed without the guard.
  }
  if (alreadyAttempted) return;
  try {
    sessionStorage.setItem(RELOAD_ATTEMPT_STORAGE_KEY, serverSha);
  } catch {
    // ignore
  }

  if (typeof versionCheckCallback === "function") {
    try {
      await versionCheckCallback();
    } catch (callbackError) {
      logger.error("Error calling version callback:", callbackError);
    }
  }
}

function handleFocus() {
  void checkVersion();
}

function handleVisibilityChange() {
  if (document.visibilityState === "visible") {
    void checkVersion();
  }
}

export function startVersionCheck(onNewVersionDetected: () => void | Promise<void>) {
  versionCheckCallback = onNewVersionDetected;

  if (isVersionCheckActive) {
    return;
  }
  isVersionCheckActive = true;

  const CHECK_INTERVAL = 5 * 60 * 1000;

  setTimeout(() => {
    void checkVersion();
  }, 3000);

  versionCheckInterval = setInterval(() => {
    void checkVersion();
  }, CHECK_INTERVAL);

  if (!listenersAttached && typeof window !== "undefined") {
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    listenersAttached = true;
  }
}

export function stopVersionCheck() {
  if (versionCheckInterval) {
    clearInterval(versionCheckInterval);
    versionCheckInterval = null;
  }
  if (listenersAttached && typeof window !== "undefined") {
    window.removeEventListener("focus", handleFocus);
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    listenersAttached = false;
  }
  isVersionCheckActive = false;
  versionCheckCallback = null;
}
