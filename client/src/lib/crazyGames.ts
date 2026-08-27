/**
 * Thin wrapper around the CrazyGames HTML5 SDK v3.
 *
 * The hosted folder (`VITE_CRAZYGAMES=1`) loads `crazygames-sdk-v3.js` in
 * index.html. On `/crazygames` on our own site the script is absent and every
 * method is a no-op. Always go through this module; game code never touches
 * `window.CrazyGames` directly.
 */
import { isCrazyGamesBuild } from "@/lib/edition";
import { logger } from "@/lib/logger";

const SDK_WAIT_MS = 5000;
const INIT_TIMEOUT_MS = 8000;

export interface CrazyGamesDataModule {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  clear(): void;
}

export interface CrazyGamesSdk {
  init(): Promise<void>;
  data?: CrazyGamesDataModule;
}

let initPromise: Promise<boolean> | null = null;

function getSdk(): CrazyGamesSdk | undefined {
  if (typeof window === "undefined") return undefined;
  return window.CrazyGames?.SDK;
}

/** True when the v3 SDK object is already on the page. */
export function hasCrazyGamesSdk(): boolean {
  return !!getSdk();
}

function waitForSdk(ms: number): Promise<CrazyGamesSdk | undefined> {
  const existing = getSdk();
  if (existing || ms <= 0) return Promise.resolve(existing);
  return new Promise((resolve) => {
    const startedAt = Date.now();
    const timer = setInterval(() => {
      const sdk = getSdk();
      if (sdk || Date.now() - startedAt >= ms) {
        clearInterval(timer);
        resolve(sdk);
      }
    }, 50);
  });
}

async function initializeCrazyGamesSdk(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!isCrazyGamesBuild && !getSdk()) return false;

  const sdk = await waitForSdk(isCrazyGamesBuild ? SDK_WAIT_MS : 0);
  if (!sdk?.init) return false;

  try {
    await Promise.race([
      sdk.init(),
      new Promise<never>((_, reject) => {
        setTimeout(
          () => reject(new Error("CrazyGames SDK init timed out")),
          INIT_TIMEOUT_MS,
        );
      }),
    ]);
    return true;
  } catch (error) {
    logger.warn("[CRAZYGAMES] SDK init failed:", error);
    return false;
  }
}

/**
 * Initialize the SDK once. Safe to call from boot and again from save/load.
 * Returns true only after a successful `SDK.init()`.
 */
export async function initCrazyGamesSdk(): Promise<boolean> {
  if (!initPromise) {
    initPromise = initializeCrazyGamesSdk();
  }
  return initPromise;
}

/** Data module after init, or null when the SDK is missing / disabled. */
export function getCrazyGamesData(): CrazyGamesDataModule | null {
  try {
    return getSdk()?.data ?? null;
  } catch {
    return null;
  }
}
