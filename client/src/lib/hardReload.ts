import { logger } from "@/lib/logger";
import { mountFatalErrorScreen } from "@/lib/fatalErrorScreen";
import { setResumeGame } from "@/game/startupBootSurface";

/** Query param added to force a fresh index.html fetch after deploy. */
export const HARD_RELOAD_CACHE_BUST_PARAM = "_cb";

/** Set before navigation; cleared on the next boot to run cache cleanup after load. */
export const HARD_RELOAD_PENDING_KEY = "adc_hard_reload_pending";

/** Guards the one automatic module-load retry in public/boot.js. */
export const MODULE_LOAD_RETRY_KEY = "adc_module_load_retry";

/**
 * React.lazy() attaches its own rejection handler, so failed dynamic imports do
 * NOT surface as unhandledrejection — they throw into the nearest error boundary.
 * Match Chromium, Firefox, Safari, and Vite preload failures.
 */
const DYNAMIC_IMPORT_FAIL_RE =
  /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Loading chunk [\d]+ failed|Unable to preload CSS/i;

export function canAutoReloadForStaleChunk(): boolean {
  try {
    return !sessionStorage.getItem(MODULE_LOAD_RETRY_KEY);
  } catch {
    return true;
  }
}

function markStaleChunkReloadAttempted(): void {
  try {
    sessionStorage.setItem(MODULE_LOAD_RETRY_KEY, String(Date.now()));
  } catch {
    // ignore
  }
}

/**
 * Clear the one-shot retry guard after a real screen mounts (StartScreen / Game),
 * not when the App shell mounts — the shell loads before lazy route chunks.
 */
export function clearStaleChunkReloadGuard(): void {
  try {
    sessionStorage.removeItem(MODULE_LOAD_RETRY_KEY);
  } catch {
    // ignore
  }
}

function reasonMessage(reason: unknown): string {
  if (reason instanceof Error) return reason.message;
  if (typeof reason === "string") return reason;
  return "";
}

/** True when the failure looks like a deleted/stale hashed chunk after deploy. */
export function isStaleChunkLoadFailure(reason: unknown): boolean {
  return DYNAMIC_IMPORT_FAIL_RE.test(reasonMessage(reason));
}

/**
 * Retry once with a cache-busted navigation for stale-chunk failures.
 * Returns true when handled (reload started, or fatal screen shown after a prior retry).
 * React.lazy failures must call this from an error boundary — they are not unhandled.
 */
export function recoverFromStaleChunkLoad(reason: unknown): boolean {
  if (!isStaleChunkLoadFailure(reason)) return false;
  if (!canAutoReloadForStaleChunk()) {
    mountFatalErrorScreen(reason);
    return true;
  }
  markStaleChunkReloadAttempted();
  logger.warn("[hardReload] Stale chunk load; hard-reloading once:", reasonMessage(reason));
  void hardReload();
  return true;
}

/**
 * One automatic hard reload for stuck boots (e.g. Suspense spinner never resolving).
 * Shares the same sessionStorage guard as stale-chunk recovery.
 */
export function tryOneModuleLoadRecovery(reason?: unknown): boolean {
  if (!canAutoReloadForStaleChunk()) return false;
  markStaleChunkReloadAttempted();
  logger.warn(
    "[hardReload] Module load stuck; hard-reloading once:",
    reasonMessage(reason) || reason,
  );
  void hardReload();
  return true;
}

/**
 * After a deploy, stale cached HTML can reference deleted JS chunks. React lazy()
 * then rejects with "Failed to fetch dynamically imported module" and Suspense
 * shows a permanent black screen. Retry once with a cache-busted reload; if that
 * already ran, show the dig-deeper error screen instead of hanging forever.
 *
 * Note: React.lazy failures are handled via AppErrorBoundary → recoverFromStaleChunkLoad.
 * These window listeners cover entry script tags and non-React dynamic imports.
 */
export function installStaleChunkAutoReload(): void {
  window.addEventListener("unhandledrejection", (event) => {
    if (recoverFromStaleChunkLoad(event.reason)) {
      event.preventDefault();
    }
  });

  window.addEventListener(
    "error",
    (event) => {
      const target = event.target;
      if (!target || !(target instanceof HTMLScriptElement)) return;
      const src = target.src || "";
      if (target.type !== "module" && !/\.js(\?|$)/i.test(src)) return;
      if (!canAutoReloadForStaleChunk()) {
        mountFatalErrorScreen(event.error ?? src);
        return;
      }
      markStaleChunkReloadAttempted();
      void hardReload();
    },
    true,
  );
}

/**
 * Remove the cache-bust query param from the address bar.
 * Safe to call synchronously on every boot (also runs in public/boot.js).
 */
export function stripHardReloadCacheBustParam(): boolean {
  try {
    const url = new URL(window.location.href);
    if (!url.searchParams.has(HARD_RELOAD_CACHE_BUST_PARAM)) return false;
    url.searchParams.delete(HARD_RELOAD_CACHE_BUST_PARAM);
    const next =
      url.pathname + (url.search ? url.search : "") + url.hash;
    window.history.replaceState({}, document.title, next);
    return true;
  } catch {
    return false;
  }
}

/** Clear Cache Storage and unregister service workers from a previous deploy. */
export async function purgeStaleAppCaches(): Promise<void> {
  try {
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }
  } catch (error) {
    logger.warn("[hardReload] Failed to clear Cache Storage:", error);
  }

  try {
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(
        registrations.map((registration) => registration.unregister()),
      );
    }
  } catch (error) {
    logger.warn("[hardReload] Failed to unregister service workers:", error);
  }
}

/**
 * Run once at app startup (after public/boot.js deferred bootstrap).
 * Defers cache/SW cleanup until after the fresh bundle has loaded.
 */
export function bootstrapAfterHardReload(): void {
  stripHardReloadCacheBustParam();

  let pendingPurge = false;
  try {
    pendingPurge = sessionStorage.getItem(HARD_RELOAD_PENDING_KEY) === "1";
    if (pendingPurge) sessionStorage.removeItem(HARD_RELOAD_PENDING_KEY);
  } catch {
    // ignore
  }

  if (!pendingPurge) return;

  const runPurge = () => {
    void purgeStaleAppCaches();
  };
  if (document.readyState === "complete") {
    runPurge();
  } else {
    window.addEventListener("load", runPurge, { once: true });
  }
}

/**
 * Force the browser to load a fresh HTML/JS bundle after a deploy.
 * Navigates with a cache-bust query param; stale caches are cleared after the
 * new page loads so we do not delete assets the current session still needs.
 * Marks resume so a started web save reopens Game instead of Make Fire
 * (same flag as the version-update reload).
 */
export async function hardReload(): Promise<void> {
  try {
    sessionStorage.setItem(HARD_RELOAD_PENDING_KEY, "1");
  } catch {
    // ignore
  }
  setResumeGame();

  const url = new URL(window.location.href);
  url.searchParams.set(HARD_RELOAD_CACHE_BUST_PARAM, Date.now().toString());
  window.location.replace(url.toString());
}
