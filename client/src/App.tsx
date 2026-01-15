import { useEffect, lazy, Suspense } from "react";
import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AdminDashboard from "@/pages/admin/dashboard";

// Eagerly load only the main game page
import Game from "@/pages/game";

// Lazy load all other pages
const EndScreenPage = lazy(() => import("@/pages/end-screen"));
const ButtonTest = lazy(() => import("@/pages/button-test"));
const NotFound = lazy(() => import("@/pages/not-found"));
const ResetPassword = lazy(() => import("@/pages/reset-password"));
const Imprint = lazy(() => import("@/pages/imprint"));
const Privacy = lazy(() => import("@/pages/privacy"));
const Terms = lazy(() => import("@/pages/terms"));
const Withdrawal = lazy(() => import("@/pages/withdrawal"));
const ExplosionTest = lazy(() => import("@/pages/explosion-test"));

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
        <Route path="/explosion-test" component={ExplosionTest} />
        <Route path="/button-test" component={ButtonTest} />
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
        // Postpone loading by 20 seconds to improve LCP/FCP/INP
        await new Promise(resolve => setTimeout(resolve, 20000));

        // Use requestIdleCallback to ensure SDK loading doesn't contribute to Total Blocking Time (TBT)
        const loadSdk = async () => {
          // Load CSS
          const link = document.createElement("link");
          link.rel = "stylesheet";
          link.href = "https://sdk.playlight.dev/playlight-sdk.css";
          document.head.appendChild(link);

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

        // Initialize SDK immediately with exit intent disabled
        playlightSDK.init({
          exitIntent: {
            enabled: false,
            immediate: false,
          },
        });

        // Import game store
        const { useGameStore } = await import("./game/state");

        // Reactively update exit intent based on game state
        // Use a flag to prevent unnecessary updates
        let lastExitIntentStatus = false;
        useGameStore.subscribe(
          (state) => {
            const isEndScreen = window.location.pathname === "/end-screen";
            const shouldEnableExitIntent =
              state.isPaused || state.idleModeDialog.isOpen || state.leaderboardDialogOpen || isEndScreen;

            if (shouldEnableExitIntent !== lastExitIntentStatus) {
              lastExitIntentStatus = shouldEnableExitIntent;
              playlightSDK.setConfig({
                exitIntent: {
                  enabled: shouldEnableExitIntent,
                  immediate: false,
                },
              });
            }
          }
        );

        // Set up event listeners for game pause/unpause
        playlightSDK.onEvent("discoveryOpen", () => {
          const state = useGameStore.getState();
          // Use a small delay or check to ensure we don't trigger rapid state changes
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
      };

      const handleIdle = () => {
        if ('requestIdleCallback' in window) {
          window.requestIdleCallback(() => loadSdk());
        } else {
          setTimeout(loadSdk, 1);
        }
      };

      handleIdle();
    } catch (error) {
        console.error("Error loading the Playlight SDK:", error);
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
