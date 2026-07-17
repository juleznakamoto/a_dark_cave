import { logger } from "@/lib/logger";

/** Query param added to force a fresh index.html fetch after deploy. */
export const HARD_RELOAD_CACHE_BUST_PARAM = "_cb";

/** Set before navigation; cleared on the next boot to run cache cleanup after load. */
export const HARD_RELOAD_PENDING_KEY = "adc_hard_reload_pending";

/** Guards the one automatic module-load retry in index.html. */
export const MODULE_LOAD_RETRY_KEY = "adc_module_load_retry";

const DYNAMIC_IMPORT_FAIL_RE =
  /Failed to fetch dynamically imported module|Importing a module script failed/i;

function canAutoReloadForStaleChunk(): boolean {
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

/** Call after React mounts so a later deploy can auto-retry again. */
export function clearStaleChunkReloadGuard(): void {
  try {
    sessionStorage.removeItem(MODULE_LOAD_RETRY_KEY);
  } catch {
    // ignore
  }
}

function isStaleChunkLoadFailure(reason: unknown): boolean {
  const message =
    reason instanceof Error
      ? reason.message
      : typeof reason === "string"
        ? reason
        : "";
  return DYNAMIC_IMPORT_FAIL_RE.test(message);
}

function tryAutoReloadForStaleChunk(reason: unknown): boolean {
  if (!isStaleChunkLoadFailure(reason)) return false;
  if (!canAutoReloadForStaleChunk()) return false;
  markStaleChunkReloadAttempted();
  void hardReload();
  return true;
}

/**
 * After a deploy, stale cached HTML can reference deleted JS chunks. React lazy()
 * then rejects with "Failed to fetch dynamically imported module" and Suspense
 * shows a permanent black screen. Retry once with a cache-busted reload.
 */
export function installStaleChunkAutoReload(): void {
  window.addEventListener("unhandledrejection", (event) => {
    if (tryAutoReloadForStaleChunk(event.reason)) {
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
      if (!canAutoReloadForStaleChunk()) return;
      markStaleChunkReloadAttempted();
      void hardReload();
    },
    true,
  );
}

/**
 * Remove the cache-bust query param from the address bar.
 * Safe to call synchronously on every boot (also runs inline in index.html).
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
 * Run once at app startup (after index.html inline bootstrap).
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
 */
export async function hardReload(): Promise<void> {
  try {
    sessionStorage.setItem(HARD_RELOAD_PENDING_KEY, "1");
  } catch {
    // ignore
  }

  const url = new URL(window.location.href);
  url.searchParams.set(HARD_RELOAD_CACHE_BUST_PARAM, Date.now().toString());
  window.location.replace(url.toString());
}
