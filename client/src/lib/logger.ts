
const isDev = import.meta.env.DEV;

export const logger = {
  log: (...args: any[]) => {
    if (isDev) {
      logger.log(...args);
    }
  },
  warn: (...args: any[]) => {
    if (isDev) {
      logger.warn(...args);
    }
  },
  error: (...args: any[]) => {
    // Always log errors, even in production
    logger.error(...args);
  },
  debug: (...args: any[]) => {
    if (isDev) {
      logger.debug(...args);
    }
  }
};
