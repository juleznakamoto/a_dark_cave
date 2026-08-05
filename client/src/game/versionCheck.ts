import { logger } from "@/lib/logger";

/**
 * Commit id of the bundle that is actually running, baked at build time (see the
 * `__BUILD_SHA__` define in `vite.config.ts`). Comparing this compile-time constant
 * against the server's current sha means a stale cached bundle is detected on the very
 * first check, even right after a cold start of an installed PWA.
 *
 * Vite non-production modes bake `"dev"` so local serve never fights a leftover
 * `dist/build-meta.json` from a previous production build.
 */
function getRunningBuildSha(): string {
  if (runningBuildShaForTests !== null) return runningBuildShaForTests;
  return typeof __BUILD_SHA__ !== "undefined" ? __BUILD_SHA__ : "dev";
}

/** Test-only override for the baked running build sha (`null` = use real value). */
let runningBuildShaForTests: string | null = null;

/** 1 initial hardReload + 2 retries per deployed server sha. */
export const MAX_HARD_RELOAD_ATTEMPTS = 3;

/**
 * Counts real hardReload navigations for a server sha (survives navigation).
 * Shape: `{ sha, count }`. Detection alone must not write this.
 */
const RELOAD_ATTEMPTS_STORAGE_KEY = "app_update_reload_attempts";

/** Legacy one-shot key from before retry counting; cleared on match/reset. */
const LEGACY_RELOAD_ATTEMPT_STORAGE_KEY = "app_update_attempted_sha";

export type VersionUpdateInfo = {
  serverSha: string;
  /** False after {@link MAX_HARD_RELOAD_ATTEMPTS} hardReloads for this server sha. */
  autoReloadAllowed: boolean;
};

export type VersionUpdateCallback = (
  info: VersionUpdateInfo,
) => void | Promise<void>;

type ReloadAttemptState = {
  sha: string;
  count: number;
};

let isVersionCheckActive = false;
let versionCheckInterval: ReturnType<typeof setInterval> | null = null;
let versionCheckTimeout: ReturnType<typeof setTimeout> | null = null;
let versionCheckCallback: VersionUpdateCallback | null = null;
let listenersAttached = false;
/** In-memory: toast/timer already armed for this server sha while unmounted checks must no-op. */
let armedServerSha: string | null = null;

function readAttemptState(): ReloadAttemptState | null {
  try {
    const raw = sessionStorage.getItem(RELOAD_ATTEMPTS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ReloadAttemptState>;
    if (
      typeof parsed?.sha === "string" &&
      parsed.sha.length > 0 &&
      typeof parsed.count === "number" &&
      Number.isFinite(parsed.count)
    ) {
      return {
        sha: parsed.sha,
        count: Math.max(0, Math.floor(parsed.count)),
      };
    }
  } catch {
    // ignore corrupt / unavailable storage
  }
  return null;
}

function writeAttemptState(state: ReloadAttemptState): void {
  try {
    sessionStorage.setItem(RELOAD_ATTEMPTS_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

function clearAttemptState(): void {
  try {
    sessionStorage.removeItem(RELOAD_ATTEMPTS_STORAGE_KEY);
    sessionStorage.removeItem(LEGACY_RELOAD_ATTEMPT_STORAGE_KEY);
  } catch {
    // ignore
  }
}

/** How many hardReloads have already been recorded for this server sha. */
export function getUpdateReloadAttemptCount(serverSha: string): number {
  const state = readAttemptState();
  if (!state || state.sha !== serverSha) return 0;
  return state.count;
}

export function isAutoReloadAllowed(serverSha: string): boolean {
  return getUpdateReloadAttemptCount(serverSha) < MAX_HARD_RELOAD_ATTEMPTS;
}

/**
 * Increment the hardReload navigation count for `serverSha`.
 * Call immediately before `hardReload()`, not on mere update detection.
 */
export function recordUpdateHardReloadAttempt(serverSha: string): number {
  const next = getUpdateReloadAttemptCount(serverSha) + 1;
  writeAttemptState({ sha: serverSha, count: next });
  return next;
}

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
  if (getRunningBuildSha() === "dev") return;

  const serverSha = await fetchServerSha();
  if (!serverSha || serverSha === getRunningBuildSha()) {
    clearAttemptState();
    armedServerSha = null;
    return;
  }

  // Toast/timer already armed for this sha in the current GameContainer mount.
  if (armedServerSha === serverSha) return;

  const autoReloadAllowed = isAutoReloadAllowed(serverSha);

  if (typeof versionCheckCallback !== "function") return;

  // Arm before await so concurrent focus/interval checks do not double-fire.
  // Cleared on callback failure so a failed pre-save can retry; stopVersionCheck
  // also clears so a remount can re-arm if no hardReload happened yet.
  armedServerSha = serverSha;
  try {
    await versionCheckCallback({ serverSha, autoReloadAllowed });
  } catch (callbackError) {
    if (armedServerSha === serverSha) {
      armedServerSha = null;
    }
    logger.error("Error calling version callback:", callbackError);
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

export function startVersionCheck(onNewVersionDetected: VersionUpdateCallback) {
  versionCheckCallback = onNewVersionDetected;

  if (isVersionCheckActive) {
    return;
  }
  isVersionCheckActive = true;

  const CHECK_INTERVAL = 5 * 60 * 1000;

  versionCheckTimeout = setTimeout(() => {
    versionCheckTimeout = null;
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
  if (versionCheckTimeout) {
    clearTimeout(versionCheckTimeout);
    versionCheckTimeout = null;
  }
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
  // Remount must be able to re-prompt if hardReload never ran.
  armedServerSha = null;
}

/** @internal Vitest only */
export function __setRunningBuildShaForTests(sha: string | null) {
  runningBuildShaForTests = sha;
}

/** @internal Vitest only */
export function __resetVersionCheckForTests() {
  stopVersionCheck();
  clearAttemptState();
  armedServerSha = null;
  runningBuildShaForTests = null;
}

/** @internal Vitest only — run one check without waiting for the 3s timer. */
export async function __checkVersionForTests() {
  await checkVersion();
}
