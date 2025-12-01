import { logger } from "@/lib/logger";

// Version is set at build time
export const APP_VERSION =
  import.meta.env.VITE_APP_VERSION ||
  (typeof __BUILD_TIME__ !== "undefined" ? __BUILD_TIME__ : "dev");

// Global variable to track if version check is active
let isVersionCheckActive = false;
let versionCheckInterval: NodeJS.Timeout | null = null;
let versionCheckCallback: (() => void) | null = null;

export function startVersionCheck(onNewVersionDetected: () => void) {
  logger.log("[VERSION] ========================================");
  logger.log("[VERSION] startVersionCheck() called");
  logger.log("[VERSION] Current timestamp:", new Date().toISOString());

  if (isVersionCheckActive) {
    logger.log("[VERSION] ⚠️ Version check already active, updating callback");
    logger.log("[VERSION] Previous callback type:", typeof versionCheckCallback);
    versionCheckCallback = onNewVersionDetected;
    logger.log("[VERSION] New callback type:", typeof versionCheckCallback);
    logger.log("[VERSION] Exiting early - check already running");
    return;
  }

  isVersionCheckActive = true;
  versionCheckCallback = onNewVersionDetected;
  logger.log("[VERSION] ✅ Version check activated");
  logger.log("[VERSION] App version:", APP_VERSION);
  logger.log("[VERSION] Callback set:", typeof versionCheckCallback);

  // Check existing sessionStorage values
  const existingEtag = sessionStorage.getItem("app_etag");
  const existingLastModified = sessionStorage.getItem("app_last_modified");
  logger.log("[VERSION] 📦 SessionStorage on startup:");
  logger.log("[VERSION]   - app_etag:", existingEtag || "null");
  logger.log("[VERSION]   - app_last_modified:", existingLastModified || "null");

  // Check every 30 seconds for testing
  const CHECK_INTERVAL = 30 * 1000;

  const checkVersion = async () => {
    try {
      logger.log("[VERSION] ========================================");
      logger.log("[VERSION] 🔍 Running version check...");
      logger.log("[VERSION] Check time:", new Date().toISOString());

      // Fetch the index.html with cache-busting query param
      const cacheBuster = Date.now();
      logger.log("[VERSION] Cache buster value:", cacheBuster);

      const response = await fetch(`/?v=${cacheBuster}`, {
        method: "HEAD",
        cache: "no-cache",
      });

      logger.log("[VERSION] ✅ Fetch completed, status:", response.status);

      // Check ETag or Last-Modified header to detect changes
      const etag = response.headers.get("etag");
      const lastModified = response.headers.get("last-modified");

      logger.log("[VERSION] 📥 Headers received from server:");
      logger.log("[VERSION]   - ETag:", etag || "null");
      logger.log("[VERSION]   - Last-Modified:", lastModified || "null");

      // Get stored values
      const storedEtag = sessionStorage.getItem("app_etag");
      const storedLastModified = sessionStorage.getItem("app_last_modified");

      logger.log("[VERSION] 📦 Current sessionStorage values:");
      logger.log("[VERSION]   - Stored ETag:", storedEtag || "null");
      logger.log("[VERSION]   - Stored Last-Modified:", storedLastModified || "null");

      // Store initial values on first check (when nothing is stored)
      if (!storedEtag && !storedLastModified) {
        logger.log("[VERSION] ========================================");
        logger.log("[VERSION] 📝 FIRST CHECK - No stored values found");
        logger.log("[VERSION] This is the initial version check after page load");
        if (etag) {
          sessionStorage.setItem("app_etag", etag);
          logger.log("[VERSION] ✅ Initial ETag stored:", etag);
        }
        if (lastModified) {
          sessionStorage.setItem("app_last_modified", lastModified);
          logger.log("[VERSION] ✅ Initial Last-Modified stored:", lastModified);
        }
        logger.log("[VERSION] First check complete - no comparison needed");
        logger.log("[VERSION] ========================================");
        return;
      }

      // Compare with stored values
      logger.log("[VERSION] ========================================");
      logger.log("[VERSION] 🔍 COMPARING VALUES:");
      logger.log("[VERSION] Checking ETag:");
      logger.log("[VERSION]   - Current:", etag);
      logger.log("[VERSION]   - Stored:", storedEtag);
      logger.log("[VERSION]   - Match:", etag === storedEtag);
      logger.log("[VERSION] Checking Last-Modified:");
      logger.log("[VERSION]   - Current:", lastModified);
      logger.log("[VERSION]   - Stored:", storedLastModified);
      logger.log("[VERSION]   - Match:", lastModified === storedLastModified);

      const etagChanged = etag && storedEtag && etag !== storedEtag;
      const lastModifiedChanged = lastModified && storedLastModified && lastModified !== storedLastModified;
      const hasChanged = etagChanged || lastModifiedChanged;

      logger.log("[VERSION] 📊 Comparison results:");
      logger.log("[VERSION]   - ETag changed:", etagChanged);
      logger.log("[VERSION]   - Last-Modified changed:", lastModifiedChanged);
      logger.log("[VERSION]   - Has any change:", hasChanged);
      logger.log("[VERSION] ========================================");

      if (hasChanged) {
        logger.log("[VERSION] ========================================");
        logger.log("[VERSION] 🆕 NEW VERSION DETECTED!");
        logger.log("[VERSION] Changes:");
        if (etagChanged) {
          logger.log("[VERSION]   - ETag: '%s' -> '%s'", storedEtag, etag);
        }
        if (lastModifiedChanged) {
          logger.log("[VERSION]   - Last-Modified: '%s' -> '%s'", storedLastModified, lastModified);
        }

        // DO NOT update sessionStorage here - we want the toast to keep appearing
        // until the user actually refreshes. SessionStorage will be updated
        // automatically when the page reloads.
        
        logger.log("[VERSION] 📞 Preparing to call callback...");
        logger.log("[VERSION] Callback exists:", versionCheckCallback !== null);
        logger.log("[VERSION] Callback type:", typeof versionCheckCallback);

        // Call the callback using the current reference (not a stored copy)
        // This ensures we always use the latest callback that was set
        if (typeof versionCheckCallback === "function") {
          try {
            logger.log("[VERSION] 🔔 Calling versionCheckCallback NOW...");
            versionCheckCallback();
            logger.log("[VERSION] ✅ versionCheckCallback executed successfully");
          } catch (callbackError) {
            logger.log("[VERSION] ❌ Error calling version callback:", callbackError);
            logger.log("[VERSION] Error details:", {
              message: callbackError instanceof Error ? callbackError.message : String(callbackError),
              stack: callbackError instanceof Error ? callbackError.stack : undefined,
            });
          }
        } else {
          logger.log("[VERSION] ⚠️ versionCheckCallback is not a function!");
          logger.log("[VERSION] Actual type:", typeof versionCheckCallback);
          logger.log("[VERSION] Value:", versionCheckCallback);
        }

        logger.log("[VERSION] ========================================");
      } else {
        logger.log("[VERSION] ✅ No version change detected");
        logger.log("[VERSION] Both ETag and Last-Modified match stored values");
        logger.log("[VERSION] ========================================");
      }
    } catch (error) {
      logger.log("[VERSION] ❌ Error checking version:", error);
    }
  };

  // Run initial check after 10 seconds for testing
  logger.log("[VERSION] ⏰ Scheduling initial check in 10 seconds...");
  setTimeout(() => {
    logger.log("[VERSION] ========================================");
    logger.log("[VERSION] ⏰ Initial 10s delay complete");
    logger.log("[VERSION] Running first periodic version check");
    checkVersion();
  }, 10000);

  // Then check periodically
  versionCheckInterval = setInterval(() => {
    logger.log("[VERSION] ========================================");
    logger.log("[VERSION] ⏰ Periodic check triggered");
    checkVersion();
  }, CHECK_INTERVAL);
  logger.log("[VERSION] ⏰ Periodic checks scheduled every", CHECK_INTERVAL / 1000, "seconds");
  logger.log("[VERSION] ========================================");
}

export function stopVersionCheck() {
  if (versionCheckInterval) {
    clearInterval(versionCheckInterval);
    versionCheckInterval = null;
  }
  isVersionCheckActive = false;
  versionCheckCallback = null;
  logger.log("[VERSION] Version check stopped");
}