import { lazy, Suspense } from "react";
import { Switch, Route, Redirect } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AdminDashboard from "@/pages/admin/dashboard";
import { logger } from "@/lib/logger";

// Lazy load game page (only loads after Light Fire click)
const Game = lazy(() => import("@/pages/game"));
// Start screen page - lightweight wrapper that conditionally loads Game
const StartScreenPage = lazy(() => import("@/pages/start-screen-page"));

// Lazy load all other pages
const EndScreenPage = lazy(() => import("@/pages/end-screen"));
const NotFound = lazy(() => import("@/pages/not-found"));
const ResetPassword = lazy(() => import("@/pages/reset-password"));
const Imprint = lazy(() => import("@/pages/imprint"));
const Privacy = lazy(() => import("@/pages/privacy"));
const Terms = lazy(() => import("@/pages/terms"));
const Withdrawal = lazy(() => import("@/pages/withdrawal"));
const ButtonTest = lazy(() => import("@/pages/button-test"));

function Router() {
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 bg-black"></div>
      }
    >
      <Switch>
        <Route path="/" component={StartScreenPage} />
        <Route path="/boost" component={StartScreenPage} />
        <Route path="/game">{() => <Redirect to="/" />}</Route>
        <Route path="/end-screen" component={EndScreenPage} />
        <Route path="/imprint" component={Imprint} />
        <Route path="/privacy" component={Privacy} />
        <Route path="/terms" component={Terms} />
        <Route path="/withdrawal" component={Withdrawal} />
        <Route path="/reset-password" component={ResetPassword} />
        <Route path="/button-test" component={ButtonTest} />
        <Route path="/admin/dashboard">
          <AdminDashboard />
        </Route>
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

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
      const { useGameStore } = await import("./game/state");

      // Clean up previous subscription if it exists (shouldn't happen, but defensive)
      if (gameStoreUnsubscribe) {
        gameStoreUnsubscribe();
        gameStoreUnsubscribe = null;
      }

      // Reactively update exit intent based on game state
      // Store unsubscribe function to prevent memory leaks
      gameStoreUnsubscribe = useGameStore.subscribe(
        (state) => {
          const isEndScreen = window.location.pathname === "/end-screen";
          const shouldEnableExitIntent =
            state.isPaused || state.idleModeDialog.isOpen || state.leaderboardDialogOpen || isEndScreen;

          playlightSDK.setConfig({
            exitIntent: {
              enabled: shouldEnableExitIntent,
              immediate: false,
            },
          });
        }
      );

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

function App() {

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
