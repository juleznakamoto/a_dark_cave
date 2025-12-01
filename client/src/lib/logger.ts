
const isDev = import.meta.env.DEV;

export const logger = {
  log: (...args: any[]) => {
    // Always log VERSION messages in production for debugging
    const isVersionLog = args.some(arg => 
      typeof arg === 'string' && arg.includes('[VERSION]')
    );
    if (isDev || isVersionLog) {
      console.log(...args);
    }
  },
  warn: (...args: any[]) => {
    if (isDev) {
      console.warn(...args);
    }
  },
  error: (...args: any[]) => {
    // Always log errors, even in production
    console.error(...args);
  },
  debug: (...args: any[]) => {
    if (isDev) {
      console.debug(...args);
    }
  }
};
