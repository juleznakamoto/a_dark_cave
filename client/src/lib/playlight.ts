
import { logger } from './logger';

const isDev = import.meta.env.DEV;

class PlaylightSDK {
  private initialized = false;
  private sdk: any = null;

  async init() {
    if (!isDev) {
      logger.log('[PLAYLIGHT] Skipping initialization - not in dev mode');
      return;
    }

    try {
      // Load the CSS
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://sdk.playlight.dev/playlight-sdk.css';
      document.head.appendChild(link);

      // Load and initialize the SDK
      const module = await import('https://sdk.playlight.dev/playlight-sdk.es.js');
      this.sdk = module.default;
      
      // Initialize with custom config
      this.sdk.init({
        exitIntent: {
          enabled: true,
          immediate: false
        },
        sidebar: {
          hasFrameworkRoot: true,
          forceVisible: false
        }
      });

      this.initialized = true;
      logger.log('[PLAYLIGHT] SDK initialized successfully');
    } catch (error) {
      logger.error('[PLAYLIGHT] Failed to initialize SDK:', error);
    }
  }

  setDiscovery(visible: boolean = true) {
    if (!isDev || !this.initialized || !this.sdk) return;
    
    try {
      this.sdk.setDiscovery(visible);
      logger.log('[PLAYLIGHT] Discovery visibility set to:', visible);
    } catch (error) {
      logger.error('[PLAYLIGHT] Failed to set discovery:', error);
    }
  }

  onEvent(event: string, callback: () => void) {
    if (!isDev || !this.initialized || !this.sdk) return;
    
    try {
      this.sdk.onEvent(event, callback);
      logger.log('[PLAYLIGHT] Event listener registered for:', event);
    } catch (error) {
      logger.error('[PLAYLIGHT] Failed to register event:', error);
    }
  }
}

export const playlight = new PlaylightSDK();
