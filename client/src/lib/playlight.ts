import { logger } from "@/lib/logger";

// Track Playlight SDK initialization state to prevent duplicate subscriptions
let playlightSDKInstance: any = null;
let gameStoreUnsubscribe: (() => void) | null = null;
let initPlaylightPromise: Promise<void> | null = null;

// Export Playlight SDK initialization function to be called on user interaction
export async function initPlaylight() {
  // If initialization is already in progress or completed, return the existing promise
  if (initPlaylightPromise) {
    return initPlaylightPromise;
  }

  // Create and store the initialization promise immediately to prevent race conditions
  initPlaylightPromise = (async () => {
    try {
      // Inject the Playlight SDK CSS now that the user has interacted
      if (!document.getElementById("playlight-sdk-css")) {
        const link = document.createElement("link");
        link.id = "playlight-sdk-css";
        link.rel = "stylesheet";
        link.href = "https://sdk.playlight.dev/playlight-sdk.css";
        document.head.appendChild(link);
      }

      const script = document.createElement("script");
      script.src = "https://sdk.playlight.dev/playlight-sdk.es.js";
      script.type = "module";
      script.async = true;

      const loadPromise = new Promise((resolve, reject) => {
        script.onload = resolve;
        script.onerror = reject;
      });

      document.body.appendChild(script);
      await loadPromise;

      // @ts-ignore - The SDK is loaded globally as a module but we need to access its export
      // The previous dynamic import was also from the same URL
      const module = await import("https://sdk.playlight.dev/playlight-sdk.es.js");
      const playlightSDK = module.default;
      playlightSDKInstance = playlightSDK;

      // Initialize SDK immediately with exit intent disabled
      playlightSDK.init({
        exitIntent: {
          enabled: false,
          immediate: false,
        },
      });

      // Import game store
      const { useGameStore } = await import("../game/state");

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
          useGameStore.setState({ isPausedPreviously: false });
          state.togglePause();
        } else {
          useGameStore.setState({ isPausedPreviously: true });
        }
      });

      playlightSDK.onEvent("discoveryClose", () => {
        const state = useGameStore.getState();
        // Don't toggle pause if sleep mode is active
        if (state.idleModeDialog.isOpen) {
          return;
        }
        if (state.isPaused && !state.isPausedPreviously) {
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
