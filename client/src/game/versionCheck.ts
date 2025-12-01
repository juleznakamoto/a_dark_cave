
import { logger } from '@/lib/logger';

// Version is set at build time
export const APP_VERSION = import.meta.env.VITE_APP_VERSION || (typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : 'dev');

// Global variable to track if version check is active
let isVersionCheckActive = false;
let versionCheckInterval: NodeJS.Timeout | null = null;
let versionCheckCallback: (() => void) | null = null;

export function startVersionCheck(onNewVersionDetected: () => void) {
  if (isVersionCheckActive) {
    logger.log('[VERSION] Version check already active, updating callback');
    versionCheckCallback = onNewVersionDetected;
    return;
  }

  isVersionCheckActive = true;
  versionCheckCallback = onNewVersionDetected;
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
        
        // Update sessionStorage with new values so refresh doesn't trigger dialog again
        if (etag) {
          sessionStorage.setItem('app_etag', etag);
        }
        if (lastModified) {
          sessionStorage.setItem('app_last_modified', lastModified);
        }
        
        // Store callback before stopping (which sets it to null)
        const callbackToExecute = versionCheckCallback;
        
        stopVersionCheck();
        
        logger.log('[VERSION] Preparing to call onNewVersionDetected callback');
        logger.log('[VERSION] Callback type:', typeof callbackToExecute);
        logger.log('[VERSION] Callback function:', callbackToExecute);
        
        // Safely call the callback after a small delay to ensure cleanup
        setTimeout(() => {
          if (typeof callbackToExecute === 'function') {
            try {
              logger.log('[VERSION] Calling onNewVersionDetected...');
              callbackToExecute();
              logger.log('[VERSION] ✅ onNewVersionDetected called successfully');
            } catch (callbackError) {
              logger.log('[VERSION] ❌ Error calling version callback:', callbackError);
            }
          } else {
            logger.log('[VERSION] ⚠️ callbackToExecute is not a function:', typeof callbackToExecute);
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
  versionCheckCallback = null;
  logger.log('[VERSION] Version check stopped');
}
