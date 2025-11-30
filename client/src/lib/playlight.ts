
import { logger } from './logger';

// Only initialize in development mode
const isDev = import.meta.env.DEV;

class PlaylightAnalytics {
  private initialized = false;

  async init() {
    if (!isDev) {
      logger.log('[PLAYLIGHT] Skipping initialization - not in dev mode');
      return;
    }

    try {
      const { init } = await import('@playlight/analytics');
      
      // Initialize Playlight - you'll need to add your project ID to .env
      await init({
        projectId: import.meta.env.VITE_PLAYLIGHT_PROJECT_ID || 'your-project-id',
        debug: true,
      });

      this.initialized = true;
      logger.log('[PLAYLIGHT] Analytics initialized successfully');
    } catch (error) {
      logger.error('[PLAYLIGHT] Failed to initialize:', error);
    }
  }

  track(eventName: string, properties?: Record<string, any>) {
    if (!isDev || !this.initialized) return;

    import('@playlight/analytics').then(({ track }) => {
      track(eventName, properties);
      logger.log('[PLAYLIGHT] Event tracked:', eventName, properties);
    }).catch(error => {
      logger.error('[PLAYLIGHT] Failed to track event:', error);
    });
  }

  identify(userId: string, traits?: Record<string, any>) {
    if (!isDev || !this.initialized) return;

    import('@playlight/analytics').then(({ identify }) => {
      identify(userId, traits);
      logger.log('[PLAYLIGHT] User identified:', userId, traits);
    }).catch(error => {
      logger.error('[PLAYLIGHT] Failed to identify user:', error);
    });
  }
}

export const playlight = new PlaylightAnalytics();
