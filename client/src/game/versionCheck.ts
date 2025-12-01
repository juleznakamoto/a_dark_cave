import { logger } from "@/lib/logger";

// Version is set at build time
export const APP_VERSION =
  import.meta.env.VITE_APP_VERSION ||
  (typeof __BUILD_TIME__ !== "undefined" ? __BUILD_TIME__ : "dev");

// Global variable to track if version check is active
let isVersionCheckActive = false;
let versionCheckInterval: NodeJS.Timeout | null = null;
let versionCheckCallback: (() => void) | null = null;
let hasRunFirstCheck = false; // Flag to track if we've run the first check on this page load

export function startVersionCheck(onNewVersionDetected: () => void) {
  if (isVersionCheckActive) {
    versionCheckCallback = onNewVersionDetected;
    return;
  }

  isVersionCheckActive = true;
  versionCheckCallback = onNewVersionDetected;
  hasRunFirstCheck = false; // Reset for this page load

  // Check existing sessionStorage values
  const existingEtag = sessionStorage.getItem("app_etag");
  const existingLastModified = sessionStorage.getItem("app_last_modified");

  // Check every 15 minutes
  const CHECK_INTERVAL = 15 * 60 * 1000;

  const checkVersion = async () => {
    try {
      // Fetch the index.html with cache-busting query param
      const cacheBuster = Date.now();

      const response = await fetch(`/?v=${cacheBuster}`, {
        method: "HEAD",
        cache: "no-cache",
      });

      // Check ETag or Last-Modified header to detect changes
      const etag = response.headers.get("etag");
      const lastModified = response.headers.get("last-modified");

      // Get stored values
      const storedEtag = sessionStorage.getItem("app_etag");
      const storedLastModified = sessionStorage.getItem("app_last_modified");

      // On first check after page load, update sessionStorage with current values
      // This happens once per page load (tracked by a flag in memory, not storage)
      // We need to do this because sessionStorage persists across refreshes,
      // but the actual deployed version might have changed while the page was loaded
      if (!hasRunFirstCheck) {
        if (etag) {
          sessionStorage.setItem("app_etag", etag);
        }
        if (lastModified) {
          sessionStorage.setItem("app_last_modified", lastModified);
        }

        hasRunFirstCheck = true;
        return;
      }

      // Compare with stored values
      const etagChanged = etag && storedEtag && etag !== storedEtag;
      const lastModifiedChanged =
        lastModified &&
        storedLastModified &&
        lastModified !== storedLastModified;
      const hasChanged = etagChanged || lastModifiedChanged;

      if (hasChanged) {
        // DO NOT update sessionStorage here - we want the toast to keep appearing
        // until the user actually refreshes. SessionStorage will be updated
        // automatically when the page reloads.

        if (typeof versionCheckCallback === "function") {
          try {
            versionCheckCallback();
          } catch (callbackError) {
            logger.error("Error calling version callback:", callbackError);
          }
        }
      }
    } catch (error) {
      logger.error("Error checking version:", error);
    }
  };

  // Run initial check after 10 seconds for testing
  setTimeout(() => {
    checkVersion();
  }, 10000);

  // Then check periodically
  versionCheckInterval = setInterval(() => {
    checkVersion();
  }, CHECK_INTERVAL);
}

export function stopVersionCheck() {
  if (versionCheckInterval) {
    clearInterval(versionCheckInterval);
    versionCheckInterval = null;
  }
  isVersionCheckActive = false;
  versionCheckCallback = null;
}