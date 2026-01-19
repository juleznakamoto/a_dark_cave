import { lazy, Suspense, useEffect } from "react";
import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AdminDashboard from "@/pages/admin/dashboard";

// Eager load game page
import Game from "@/pages/game";

// Lazy load all other pages
const EndScreenPage = lazy(() => import("@/pages/end-screen"));
const NotFound = lazy(() => import("@/pages/not-found"));
const ResetPassword = lazy(() => import("@/pages/reset-password"));
const Imprint = lazy(() => import("@/pages/imprint"));
const Privacy = lazy(() => import("@/pages/privacy"));
const Terms = lazy(() => import("@/pages/terms"));
const Withdrawal = lazy(() => import("@/pages/withdrawal"));

function Router() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen">
          Loading...
        </div>
      }
    >
      <Switch>
        <Route path="/" component={Game} />
        <Route path="/boost" component={Game} />
        <Route path="/end-screen" component={EndScreenPage} />
        <Route path="/imprint" component={Imprint} />
        <Route path="/privacy" component={Privacy} />
        <Route path="/terms" component={Terms} />
        <Route path="/withdrawal" component={Withdrawal} />
        <Route path="/reset-password" component={ResetPassword} />
        <Route path="/admin/dashboard">
          <AdminDashboard />
        </Route>
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  useEffect(() => {
    let unsubscribeGameStore: (() => void) | null = null;

    const initPlaylight = async () => {
      try {
        // Dynamically import Playlight SDK as a module
        const module = await import("https://sdk.playlight.dev/playlight-sdk.es.js");
        const playlightSDK = module.default;

        // Initialize SDK immediately with exitIntent disabled
        playlightSDK.init({
          exitIntent: {
            enabled: false,
            immediate: false,
          },
        });

        // Import game store
        const { useGameStore } = await import("./game/state");

        // Reactively update exitIntent based on game state
        unsubscribeGameStore = useGameStore.subscribe((state) => {
          const isEndScreen = window.location.pathname === "/end-screen";
          const shouldEnableExitIntent =
            state.isPaused || state.idleModeDialog.isOpen || state.leaderboardDialogOpen || isEndScreen;

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
          if (!state.isPaused) state.togglePause();
        });

        playlightSDK.onEvent("discoveryClose", () => {
          const state = useGameStore.getState();
          if (state.isPaused) state.togglePause();
        });
      } catch (error) {
        console.error("Error loading the Playlight SDK:", error);
      }
    };

    initPlaylight();

    return () => {
      // Cleanup subscription on unmount
      if (unsubscribeGameStore) unsubscribeGameStore();
    };
  }, []);

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
