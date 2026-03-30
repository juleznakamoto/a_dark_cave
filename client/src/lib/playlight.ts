import { logger } from "@/lib/logger";

/** True when the player landed with the Playlight campaign URL (`?utm_source=playlight`). */
export function isPlaylightReferralUrl(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("utm_source") === "playlight";
}

const NORMAL_PLAY_EXIT_WINDOW_MS = 5 * 60 * 1000;
const NORMAL_PLAY_EXIT_MAX_PER_WINDOW = 3;

type ExitIntentGameSlice = {
  flags: { gameStarted?: boolean };
  isPaused: boolean;
  leaderboardDialogOpen: boolean;
  idleModeDialog: { isOpen: boolean };
};

function isSpecialExitContext(state: ExitIntentGameSlice): boolean {
  return (
    state.isPaused ||
    state.leaderboardDialogOpen ||
    state.idleModeDialog.isOpen ||
    (typeof window !== "undefined" && window.location.pathname === "/end-screen")
  );
}

function isNormalPlayExitContext(state: ExitIntentGameSlice): boolean {
  return !!state.flags.gameStarted && !isSpecialExitContext(state);
}

const normalPlayExitIntentTimestamps: number[] = [];
let normalPlayExitUnlockTimerId: number | null = null;
/** Next `discoveryOpen` from ProfileMenu `setDiscovery()` must not consume normal-play quota. */
let skipNextDiscoveryOpenCount = false;

function pruneNormalPlayExitIntentTimestamps(now = Date.now()) {
  const cutoff = now - NORMAL_PLAY_EXIT_WINDOW_MS;
  while (
    normalPlayExitIntentTimestamps.length > 0 &&
    normalPlayExitIntentTimestamps[0]! <= cutoff
  ) {
    normalPlayExitIntentTimestamps.shift();
  }
}

/**
 * Call immediately before `playlightSDK.setDiscovery()` so that open does not count
 * toward the normal-play exit-intent rate limit.
 */
export function markPlaylightDiscoveryUserInitiated() {
  skipNextDiscoveryOpenCount = true;
}

// Track Playlight SDK initialization state to prevent duplicate subscriptions
let playlightSDKInstance: any = null;
let gameStoreUnsubscribe: (() => void) | null = null;
let initPlaylightPromise: Promise<void> | null = null;
// Tracks whether Playlight itself triggered the pause (vs. the player already being paused)
let playlightCausedPause = false;

// Export Playlight SDK initialization function - call after main component mounts
export async function initPlaylight() {
  // If initialization is already in progress or completed, return the existing promise
  if (initPlaylightPromise) {
    return initPlaylightPromise;
  }

  // Create and store the initialization promise immediately to prevent race conditions
  initPlaylightPromise = (async () => {
    try {
      const module = await import("https://sdk.playlight.dev/playlight-sdk.es.js");
      const playlightSDK = module.default;
      playlightSDKInstance = playlightSDK;

      const params = new URLSearchParams(window.location.search);
      const fromPlaylight = params.get("utm_source") === "playlight";

      // Initialize SDK with exit intent disabled; force sidebar visible for Playlight traffic
      playlightSDK.init({
        exitIntent: {
          enabled: false,
          immediate: false,
        },
        ...(fromPlaylight && { sidebar: { forceVisible: true } }),
      });

      // Import game store
      const { useGameStore } = await import("../game/state");
      type StoreState = ReturnType<typeof useGameStore.getState>;

      const scheduleNormalPlayExitUnlock = () => {
        if (normalPlayExitUnlockTimerId !== null) {
          clearTimeout(normalPlayExitUnlockTimerId);
          normalPlayExitUnlockTimerId = null;
        }
        pruneNormalPlayExitIntentTimestamps();
        if (normalPlayExitIntentTimestamps.length < NORMAL_PLAY_EXIT_MAX_PER_WINDOW) {
          return;
        }
        const oldest = normalPlayExitIntentTimestamps[0]!;
        const delay = Math.max(0, oldest + NORMAL_PLAY_EXIT_WINDOW_MS - Date.now());
        normalPlayExitUnlockTimerId = window.setTimeout(() => {
          normalPlayExitUnlockTimerId = null;
          pruneNormalPlayExitIntentTimestamps();
          syncExitIntent(useGameStore.getState());
          scheduleNormalPlayExitUnlock();
        }, delay);
      };

      const syncExitIntent = (state: StoreState) => {
        const gameStarted = !!state.flags.gameStarted;

        let shouldEnableExitIntent: boolean;
        if (!gameStarted) {
          shouldEnableExitIntent = false;
        } else if (isSpecialExitContext(state)) {
          shouldEnableExitIntent = true;
        } else {
          pruneNormalPlayExitIntentTimestamps();
          shouldEnableExitIntent =
            normalPlayExitIntentTimestamps.length < NORMAL_PLAY_EXIT_MAX_PER_WINDOW;
        }

        playlightSDK.setConfig({
          exitIntent: {
            enabled: shouldEnableExitIntent,
            immediate: false,
          },
        });
      };

      (window as any).playlightSDK = playlightSDK;

      // Clean up previous subscription if it exists (shouldn't happen, but defensive)
      if (gameStoreUnsubscribe) {
        gameStoreUnsubscribe();
        gameStoreUnsubscribe = null;
      }

      syncExitIntent(useGameStore.getState());

      // Reactively update exit intent based on game state
      gameStoreUnsubscribe = useGameStore.subscribe(syncExitIntent);

      // Set up event listeners for game pause/unpause
      playlightSDK.onEvent("discoveryOpen", () => {
        const state = useGameStore.getState();
        if (state.idleModeDialog.isOpen) {
          return;
        }

        const userInitiated = skipNextDiscoveryOpenCount;
        if (skipNextDiscoveryOpenCount) {
          skipNextDiscoveryOpenCount = false;
        }

        if (!state.isPaused) {
          playlightCausedPause = true;
          state.togglePause();
        } else {
          playlightCausedPause = false;
        }

        if (!userInitiated && isNormalPlayExitContext(state)) {
          pruneNormalPlayExitIntentTimestamps();
          normalPlayExitIntentTimestamps.push(Date.now());
          pruneNormalPlayExitIntentTimestamps();
          syncExitIntent(useGameStore.getState());
          scheduleNormalPlayExitUnlock();
        }
      });

      playlightSDK.onEvent("discoveryClose", () => {
        const state = useGameStore.getState();
        // Don't toggle pause if sleep mode is active
        if (state.idleModeDialog.isOpen) {
          return;
        }
        if (playlightCausedPause && state.isPaused) {
          playlightCausedPause = false;
          state.togglePause();
        }
      });
    } catch (error) {
      // Reset promise on error so retry is possible
      initPlaylightPromise = null;
      logger.error("Error loading the Playlight SDK:", error);
      throw error;
    }
  })();

  return initPlaylightPromise;
}
