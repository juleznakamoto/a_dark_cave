import { logger } from "@/lib/logger";

/** Query param added to force a fresh index.html fetch after deploy. */
export const HARD_RELOAD_CACHE_BUST_PARAM = "_cb";

/**
 * Force the browser to load a fresh HTML/JS bundle after a deploy.
 * A normal `location.reload()` can still serve a cached index.html (PWA, CDN, bfcache).
 */
export async function hardReload(): Promise<void> {
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
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }
  } catch (error) {
    logger.warn("[hardReload] Failed to unregister service workers:", error);
  }

  try {
    await fetch(window.location.href, {
      cache: "reload",
      credentials: "same-origin",
    });
  } catch {
    // Best-effort; cache-busted navigation below is the main fix.
  }

  const url = new URL(window.location.href);
  url.searchParams.set(HARD_RELOAD_CACHE_BUST_PARAM, Date.now().toString());
  window.location.replace(url.toString());
}
