import { logger } from "@/lib/logger";
import {
  installPlaylightExitIntentCloseButton,
  scanPlaylightExitIntentBar,
} from "@/lib/playlightExitIntentClose";
import { getActivePlaylightExitMilestone } from "@/game/playlightExitIntent";

/** True when the player landed with the Playlight campaign URL (`?utm_source=playlight`). */
export function isPlaylightReferralUrl(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("utm_source") === "playlight";
}
/** Ignore duplicate `exitIntent` emissions from the SDK within one gesture. */
const EXIT_INTENT_EVENT_DEDUP_MS = 600;
/**
 * After the last allowed show in normal play we must not set `exitIntent.enabled: false` until
 * the SDK has run its auto-dismiss (~1500ms in their bundle); doing it immediately breaks the
 * close timer and the top bar can stay stuck open.
 */
const EXIT_INTENT_DISABLE_DEFER_MS = 2000;
/** No mouse/keys/etc. (see `getMsSinceUserActivity` in `loop.ts`) for this long while eligible → show Discovery. */
const DISCOVERY_INACTIVITY_MS = 30 * 1000;

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

let exitIntentDisableDeferredUntil = 0;
let exitIntentDeferTimerId: number | null = null;
/** Skip quota for the next `exitIntent` event (e.g. after `setDiscovery()` from the menu). */
let skipNextExitIntentQuota = false;
let lastExitIntentEventRecordedAt = 0;
/**
 * Last `enabled` value pushed to the SDK. `syncExitIntent` runs on every game-store change (the
 * loop writes `playTime` ~60x/sec), so we must only call `setConfig` when the value actually
 * changes; re-pushing `enabled: true` every frame re-arms the SDK and pops the banner repeatedly.
 */
let lastAppliedExitIntentEnabled: boolean | null = null;

/**
 * Call immediately before `playlightSDK.setDiscovery()` so that the resulting flow does not
 * consume normal-play exit-intent quota if the SDK emits `exitIntent`.
 */
export function markPlaylightDiscoveryUserInitiated() {
  skipNextExitIntentQuota = true;
}

/**
 * The close-button dismiss path force-enables exit intent on the SDK directly. Keep our
 * change-detection cache in sync so the next `syncExitIntent` still re-applies a needed disable
 * (otherwise we'd think `enabled` was already `true` and skip turning it back off).
 */
export function noteExitIntentForcedEnabled() {
  lastAppliedExitIntentEnabled = true;
}

// Track Playlight SDK initialization state to prevent duplicate subscriptions
let playlightSDKInstance: any = null;
let gameStoreUnsubscribe: (() => void) | null = null;
let initPlaylightPromise: Promise<void> | null = null;
// Tracks whether Playlight itself triggered the pause (vs. the player already being paused)
let playlightCausedPause = false;
let longPauseDiscoveryPollIntervalId: number | null = null;
/** One automatic Discovery open per pause streak until the player unpauses. */
let longPauseDiscoveryFiredThisPauseStreak = false;

function resetLongPauseDiscoveryFired() {
  longPauseDiscoveryFiredThisPauseStreak = false;
}

function teardownLongPauseDiscoveryPoll() {
  if (longPauseDiscoveryPollIntervalId !== null) {
    clearInterval(longPauseDiscoveryPollIntervalId);
    longPauseDiscoveryPollIntervalId = null;
  }
  longPauseDiscoveryFiredThisPauseStreak = false;
}

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

      // Initialize SDK with exit intent disabled; exit intent synced from game state below.
      playlightSDK.init({
        exitIntent: {
          enabled: false,
          immediate: false,
        },
      });

      // Import game store + inactivity (store does not update on input)
      const { useGameStore } = await import("../game/state");
      const { getMsSinceUserActivity } = await import("../game/loop");
      type StoreState = ReturnType<typeof useGameStore.getState>;

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

        const storeState = useGameStore.getState();
        const playTime = storeState.playTime ?? 0;
        const milestoneIndex = storeState.playlightExitIntentMilestoneIndex ?? 0;
        const milestone = getActivePlaylightExitMilestone(playTime, milestoneIndex);
        if (milestone == null) return;

        useGameStore.setState({
          playlightExitIntentMilestoneIndex: milestoneIndex + 1,
        });

        exitIntentDisableDeferredUntil = now + EXIT_INTENT_DISABLE_DEFER_MS;
        if (exitIntentDeferTimerId !== null) {
          clearTimeout(exitIntentDeferTimerId);
        }
        exitIntentDeferTimerId = window.setTimeout(() => {
          exitIntentDeferTimerId = null;
          exitIntentDisableDeferredUntil = 0;
          syncExitIntent(useGameStore.getState());
        }, EXIT_INTENT_DISABLE_DEFER_MS);

        syncExitIntent(useGameStore.getState());
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
          const playTime = state.playTime ?? 0;
          const activeMilestone = getActivePlaylightExitMilestone(
            playTime,
            state.playlightExitIntentMilestoneIndex ?? 0,
          );
          const deferActive = Date.now() < exitIntentDisableDeferredUntil;
          if (deferActive) {
            shouldEnableExitIntent = true;
          } else if (activeMilestone == null) {
            clearExitIntentDisableDefer();
            shouldEnableExitIntent = false;
          } else {
            clearExitIntentDisableDefer();
            shouldEnableExitIntent = true;
          }
        }

        if (shouldEnableExitIntent === lastAppliedExitIntentEnabled) {
          return;
        }
        lastAppliedExitIntentEnabled = shouldEnableExitIntent;

        playlightSDK.setConfig({
          exitIntent: {
            enabled: shouldEnableExitIntent,
            immediate: false,
          },
        });
      };

      const syncLongPauseDiscovery = (state: StoreState) => {
        const eligible =
          !!state.flags.gameStarted &&
          state.isPaused &&
          !playlightCausedPause &&
          !state.idleModeDialog.isOpen &&
          (typeof document === "undefined" || !document.hidden);

        if (!eligible) {
          resetLongPauseDiscoveryFired();
          return;
        }

        if (longPauseDiscoveryFiredThisPauseStreak) {
          return;
        }

        if (getMsSinceUserActivity() < DISCOVERY_INACTIVITY_MS) {
          return;
        }

        longPauseDiscoveryFiredThisPauseStreak = true;
        markPlaylightDiscoveryUserInitiated();
        playlightSDK.setDiscovery(true);
      };

      const syncFromStore = (state: StoreState) => {
        syncExitIntent(state);
        syncLongPauseDiscovery(state);
      };

      (window as any).playlightSDK = playlightSDK;
      installPlaylightExitIntentCloseButton();

      // Clean up previous subscription if it exists (shouldn't happen, but defensive)
      if (gameStoreUnsubscribe) {
        gameStoreUnsubscribe();
        gameStoreUnsubscribe = null;
      }
      teardownLongPauseDiscoveryPoll();

      syncFromStore(useGameStore.getState());

      // Reactively update exit intent and discovery from game state; poll inactivity (store is not
      // updated on mouse/keys).
      gameStoreUnsubscribe = useGameStore.subscribe(syncFromStore);
      longPauseDiscoveryPollIntervalId = window.setInterval(() => {
        syncLongPauseDiscovery(useGameStore.getState());
      }, 500);

      // Rate limit uses SDK `exitIntent` (top bar / indicator), not discovery opens.
      playlightSDK.onEvent("exitIntent", () => {
        requestAnimationFrame(() => scanPlaylightExitIntentBar());
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
