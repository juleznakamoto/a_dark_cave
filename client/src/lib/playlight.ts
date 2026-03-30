import { logger } from "@/lib/logger";

/** True when the player landed with the Playlight campaign URL (`?utm_source=playlight`). */
export function isPlaylightReferralUrl(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("utm_source") === "playlight";
}

const NORMAL_PLAY_EXIT_WINDOW_MS = 5 * 60 * 1000;
const NORMAL_PLAY_EXIT_MAX_PER_WINDOW = 3;
/** Ignore duplicate `exitIntent` emissions from the SDK within one gesture. */
const EXIT_INTENT_EVENT_DEDUP_MS = 600;
/**
 * After the last allowed show in normal play we must not set `exitIntent.enabled: false` until
 * the SDK has run its auto-dismiss (~1500ms in their bundle); doing it immediately breaks the
 * close timer and the top bar can stay stuck open.
 */
const EXIT_INTENT_DISABLE_DEFER_MS = 2000;

type ExitIntentGameSlice = {
  flags: { gameStarted?: boolean };
  isPaused: boolean;
  leaderboardDialogOpen: boolean;
  idleModeDialog: { isOpen: boolean };
};

/**
 * Contexts where exit intent stays unlimited. Player pause counts only when the player
 * paused the game — not when we paused for Playlight discovery (`playlightCausedPause`),
 * otherwise a discovery open would re-enable exit intent and void the normal-play cap.
 */
function isSpecialExitContext(state: ExitIntentGameSlice): boolean {
  const playerPausedNotForDiscovery = state.isPaused && !playlightCausedPause;
  return (
    playerPausedNotForDiscovery ||
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
let exitIntentDisableDeferredUntil = 0;
let exitIntentDeferTimerId: number | null = null;
/** Skip quota for the next `exitIntent` event (e.g. after `setDiscovery()` from the menu). */
let skipNextExitIntentQuota = false;
let lastExitIntentEventRecordedAt = 0;

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
 * Call immediately before `playlightSDK.setDiscovery()` so that the resulting flow does not
 * consume normal-play exit-intent quota if the SDK emits `exitIntent`.
 */
export function markPlaylightDiscoveryUserInitiated() {
  skipNextExitIntentQuota = true;
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

      const clearExitIntentDisableDefer = () => {
        exitIntentDisableDeferredUntil = 0;
        if (exitIntentDeferTimerId !== null) {
          clearTimeout(exitIntentDeferTimerId);
          exitIntentDeferTimerId = null;
        }
      };

      const recordNormalPlayExitIntentShown = () => {
        const now = Date.now();
        if (now - lastExitIntentEventRecordedAt < EXIT_INTENT_EVENT_DEDUP_MS) {
          return;
        }
        lastExitIntentEventRecordedAt = now;

        pruneNormalPlayExitIntentTimestamps();
        normalPlayExitIntentTimestamps.push(now);
        pruneNormalPlayExitIntentTimestamps();

        const atCap =
          normalPlayExitIntentTimestamps.length >= NORMAL_PLAY_EXIT_MAX_PER_WINDOW;
        if (atCap) {
          exitIntentDisableDeferredUntil = now + EXIT_INTENT_DISABLE_DEFER_MS;
          if (exitIntentDeferTimerId !== null) {
            clearTimeout(exitIntentDeferTimerId);
          }
          exitIntentDeferTimerId = window.setTimeout(() => {
            exitIntentDeferTimerId = null;
            exitIntentDisableDeferredUntil = 0;
            syncExitIntent(useGameStore.getState());
          }, EXIT_INTENT_DISABLE_DEFER_MS);
        }

        syncExitIntent(useGameStore.getState());
        scheduleNormalPlayExitUnlock();
      };

      const syncExitIntent = (state: StoreState) => {
        const gameStarted = !!state.flags.gameStarted;

        let shouldEnableExitIntent: boolean;
        if (!gameStarted) {
          clearExitIntentDisableDefer();
          shouldEnableExitIntent = false;
        } else if (isSpecialExitContext(state)) {
          clearExitIntentDisableDefer();
          shouldEnableExitIntent = true;
        } else {
          pruneNormalPlayExitIntentTimestamps();
          const atCap =
            normalPlayExitIntentTimestamps.length >= NORMAL_PLAY_EXIT_MAX_PER_WINDOW;
          if (!atCap) {
            clearExitIntentDisableDefer();
            shouldEnableExitIntent = true;
          } else {
            const deferActive = Date.now() < exitIntentDisableDeferredUntil;
            shouldEnableExitIntent = deferActive;
          }
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

      // Rate limit uses SDK `exitIntent` (top bar / indicator), not discovery opens.
      playlightSDK.onEvent("exitIntent", () => {
        const state = useGameStore.getState();
        if (skipNextExitIntentQuota) {
          skipNextExitIntentQuota = false;
          return;
        }
        if (!isNormalPlayExitContext(state)) {
          return;
        }
        recordNormalPlayExitIntentShown();
      });

      // Set up event listeners for game pause/unpause
      playlightSDK.onEvent("discoveryOpen", () => {
        const state = useGameStore.getState();
        if (state.idleModeDialog.isOpen) {
          return;
        }

        if (!state.isPaused) {
          playlightCausedPause = true;
          state.togglePause();
        } else {
          playlightCausedPause = false;
        }
      });

      playlightSDK.onEvent("discoveryClose", () => {
        const state = useGameStore.getState();
        // Don't toggle pause if sleep mode is active
        if (state.idleModeDialog.isOpen) {
          return;
        }
        if (playlightCausedPause && state.isPaused) {
          state.togglePause();
          playlightCausedPause = false;
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
