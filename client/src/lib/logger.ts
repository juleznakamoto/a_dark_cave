
const isDev = import.meta.env.DEV;

// Get the last 4 digits of the version for log prefixing
const getVersionSuffix = () => {
  const version = import.meta.env.VITE_APP_VERSION || 
                  (typeof __BUILD_TIME__ !== "undefined" ? __BUILD_TIME__ : "dev");
  // Extract last 4 characters
  return version.slice(-4);
};

const versionSuffix = getVersionSuffix();

const prefixArgs = (...args: any[]) => {
  if (args.length === 0) return args;
  
  // If first arg is a string, prefix it with version
  if (typeof args[0] === 'string') {
    return [`v${versionSuffix} ${args[0]}`, ...args.slice(1)];
  }
  
  // Otherwise, add version as first arg
  return [`v${versionSuffix}`, ...args];
};

export const logger = {
  log: (...args: any[]) => {
    // Always log VERSION messages in production for debugging
    const isVersionLog = args.some(arg => 
      typeof arg === 'string' && arg.includes('[VERSION]')
    );
    if (isDev || isVersionLog) {
      console.log(...prefixArgs(...args));
    }
  },
  warn: (...args: any[]) => {
    if (isDev) {
      console.warn(...prefixArgs(...args));
    }
  },
  error: (...args: any[]) => {
    // Always log errors, even in production
    console.error(...prefixArgs(...args));
  },
  debug: (...args: any[]) => {
    if (isDev) {
      console.debug(...prefixArgs(...args));
    }
  }
};
