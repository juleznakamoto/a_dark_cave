import { lazy, Suspense } from "react";
import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AdminDashboard from "@/pages/admin/dashboard";
import { useEffect } from "react"

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
// const ButtonTest = lazy(() => import("@/pages/button-test"));
// const ExplosionTest = lazy(() => import("@/pages/explosion-test"));

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
        {/* <Route path="/button-test" component={ButtonTest} /> */}
        {/* <Route path="/explosion-test" component={ExplosionTest} /> */}
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
    let exitIntentTimeout: NodeJS.Timeout | null = null;

    const initPlaylight = async () => {
      try {
        // Wait for index.html initialization to finish
        let attempts = 0;
        const maxAttempts = 20;
        
        const checkSDK = () => {
          // @ts-ignore
          if (window.playlightSDK) {
            // @ts-ignore
            const playlightSDK = window.playlightSDK;
            
            // Import game store
            import("./game/state").then(({ useGameStore }) => {
              // Reactively update exit intent based on game state
              useGameStore.subscribe((state) => {
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
                if (!state.isPaused) {
                  state.togglePause();
                }
              });

              playlightSDK.onEvent("discoveryClose", () => {
                const state = useGameStore.getState();
                if (state.isPaused) {
                  state.togglePause();
                }
              });
            });
            return true;
          }
          return false;
        };

        const interval = setInterval(() => {
          if (checkSDK() || attempts >= maxAttempts) {
            clearInterval(interval);
          }
          attempts++;
        }, 500);

      } catch (error) {
        console.error("Error connecting to Playlight SDK:", error);
      }
    };

    initPlaylight();

    // Cleanup timeout on unmount
    return () => {
      if (exitIntentTimeout) {
        clearTimeout(exitIntentTimeout);
      }
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

