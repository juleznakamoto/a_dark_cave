import { logger } from "@/lib/logger";

/** True when the player landed with the Playlight campaign URL (`?utm_source=playlight`). */
export function isPlaylightReferralUrl(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("utm_source") === "playlight";
}

/** No mouse/keys/etc. (see `getMsSinceUserActivity` in `loop.ts`) for this long while eligible → show Discovery. */
const DISCOVERY_INACTIVITY_MS = 30 * 1000;

const PLAYLIGHT_CSS_HREF = "https://sdk.playlight.dev/playlight-sdk.css";
const PLAYLIGHT_CSS_ID = "playlight-sdk-css";

// Track Playlight SDK initialization state to prevent duplicate subscriptions
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

/** Inject Playlight CSS on demand — never in index.html (blocks start-screen LCP). */
function ensurePlaylightStylesheet(): void {
  if (typeof document === "undefined") return;
  if (document.getElementById(PLAYLIGHT_CSS_ID)) return;
  const link = document.createElement("link");
  link.id = PLAYLIGHT_CSS_ID;
  link.rel = "stylesheet";
  link.href = PLAYLIGHT_CSS_HREF;
  document.head.appendChild(link);
}

/**
 * Load Playlight SDK + CSS. Call only after Make Fire / when gameplay mounts.
 * Not needed on the start screen.
 */
export async function initPlaylight() {
  // If initialization is already in progress or completed, return the existing promise
  if (initPlaylightPromise) {
    return initPlaylightPromise;
  }

  // Create and store the initialization promise immediately to prevent race conditions
  initPlaylightPromise = (async () => {
    try {
      ensurePlaylightStylesheet();
      const module = await import("https://sdk.playlight.dev/playlight-sdk.es.js");
      const playlightSDK = module.default;

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
        playlightSDK.setDiscovery(true);
      };

      (window as any).playlightSDK = playlightSDK;

      // Clean up previous subscription if it exists (shouldn't happen, but defensive)
      if (gameStoreUnsubscribe) {
        gameStoreUnsubscribe();
        gameStoreUnsubscribe = null;
      }
      teardownLongPauseDiscoveryPoll();

      syncLongPauseDiscovery(useGameStore.getState());

      // Reactively update discovery from game state; poll inactivity (store is not
      // updated on mouse/keys).
      gameStoreUnsubscribe = useGameStore.subscribe(syncLongPauseDiscovery);
      longPauseDiscoveryPollIntervalId = window.setInterval(() => {
        syncLongPauseDiscovery(useGameStore.getState());
      }, 500);

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
