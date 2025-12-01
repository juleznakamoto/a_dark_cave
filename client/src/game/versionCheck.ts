
import { logger } from '@/lib/logger';

// Version is set at build time
export const APP_VERSION = import.meta.env.VITE_APP_VERSION || (typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : 'dev');

// Global variable to track if version check is active
let isVersionCheckActive = false;
let versionCheckInterval: NodeJS.Timeout | null = null;

export function startVersionCheck(onNewVersionDetected: () => void) {
  if (isVersionCheckActive) {
    logger.log('[VERSION] Version check already active');
    return;
  }

  isVersionCheckActive = true;
  logger.log('[VERSION] Starting version check with version:', APP_VERSION);

  // Check every 5 minutes
  const CHECK_INTERVAL = 0.1 * 60 * 1000;

  const checkVersion = async () => {
    try {
      // Fetch the index.html with cache-busting query param
      const response = await fetch(`/?v=${Date.now()}`, {
        method: 'HEAD',
        cache: 'no-cache',
      });

      // Check ETag or Last-Modified header to detect changes
      const etag = response.headers.get('etag');
      const lastModified = response.headers.get('last-modified');

      // Store initial values on first check
      if (!sessionStorage.getItem('app_etag') && etag) {
        sessionStorage.setItem('app_etag', etag);
        logger.log('[VERSION] Initial ETag stored:', etag);
        return;
      }

      if (!sessionStorage.getItem('app_last_modified') && lastModified) {
        sessionStorage.setItem('app_last_modified', lastModified);
        logger.log('[VERSION] Initial Last-Modified stored:', lastModified);
        return;
      }

      // Compare with stored values
      const storedEtag = sessionStorage.getItem('app_etag');
      const storedLastModified = sessionStorage.getItem('app_last_modified');

      const hasChanged = (etag && etag !== storedEtag) || 
                        (lastModified && lastModified !== storedLastModified);

      if (hasChanged) {
        logger.log('[VERSION] 🆕 New version detected!', {
          oldETag: storedEtag,
          newETag: etag,
          oldLastModified: storedLastModified,
          newLastModified: lastModified,
        });
        
        stopVersionCheck();
        
        // Safely call the callback after a small delay to ensure cleanup
        setTimeout(() => {
          if (typeof onNewVersionDetected === 'function') {
            try {
              onNewVersionDetected();
            } catch (callbackError) {
              logger.log('[VERSION] ❌ Error calling version callback:', callbackError);
            }
          } else {
            logger.log('[VERSION] ⚠️ onNewVersionDetected is not a function:', typeof onNewVersionDetected);
          }
        }, 100);
      } else {
        logger.log('[VERSION] ✅ Version is current');
      }
    } catch (error) {
      logger.log('[VERSION] ❌ Error checking version:', error);
    }
  };

  // Run initial check after 30 seconds
  setTimeout(checkVersion, 30000);

  // Then check periodically
  versionCheckInterval = setInterval(checkVersion, CHECK_INTERVAL);
  logger.log('[VERSION] Version check scheduled every', CHECK_INTERVAL / 1000, 'seconds');
}

export function stopVersionCheck() {
  if (versionCheckInterval) {
    clearInterval(versionCheckInterval);
    versionCheckInterval = null;
  }
  isVersionCheckActive = false;
  logger.log('[VERSION] Version check stopped');
}
