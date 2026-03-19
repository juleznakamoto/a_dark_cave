import { logger } from "@/lib/logger";

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
      (window as any).playlightSDK = playlightSDK;

      // Clean up previous subscription if it exists (shouldn't happen, but defensive)
      if (gameStoreUnsubscribe) {
        gameStoreUnsubscribe();
        gameStoreUnsubscribe = null;
      }

      // Reactively update exit intent based on game state
      // Store unsubscribe function to prevent memory leaks
      gameStoreUnsubscribe = useGameStore.subscribe((state) => {
        const isEndScreen = window.location.pathname === "/end-screen";
        const shouldEnableExitIntent =
          state.isPaused ||
          state.idleModeDialog.isOpen ||
          state.leaderboardDialogOpen ||
          isEndScreen;

        playlightSDK.setConfig({
          exitIntent: {
            enabled: shouldEnableExitIntent,
            immediate: false,
          },
        });
      });

      // Set up event listeners for game pause/unpause
      playlightSDK.onEvent("discoveryOpen", () => {
        const state = useGameStore.getState();
        // Don't toggle pause if sleep mode is active
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
