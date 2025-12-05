import { useEffect } from "react";
import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Game from "@/pages/game";
import EndScreenPage from "@/pages/end-screen";
import HeroTest from "@/pages/hero-test";
import ButtonTest from "@/pages/button-test";
import NotFound from "@/pages/not-found";
import ResetPassword from "@/pages/reset-password";
import Imprint from "@/pages/imprint";
import Privacy from "@/pages/privacy";
import Terms from "@/pages/terms";
import Withdrawal from "@/pages/withdrawal";
import ExplosionTest from "@/pages/explosion-test";
import AdminDashboard from "@/pages/admin/dashboard";
import TabAnimationTest from "@/pages/tab-animation-test";

const isDev = import.meta.env.DEV;

function Router() {
  return (
    <Switch>
      <Route path="/" component={Game} />
      <Route path="/end-screen" component={EndScreenPage} />
      <Route path="/imprint" component={Imprint} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/terms" component={Terms} />
      <Route path="/withdrawal" component={Withdrawal} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/explosion-test" component={ExplosionTest} />
      <Route path="/hero-test" component={HeroTest} />
      <Route path="/tab-animation-test" component={TabAnimationTest} />
      <Route path="/button-test" component={ButtonTest} />
      <Route path="/admin/dashboard" component={AdminDashboard} />
      <Route path="/game" component={Game} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  useEffect(() => {
    // Initialize Playlight SDK with game pause integration
    (async () => {
      try {
        const module = await import(
          "https://sdk.playlight.dev/playlight-sdk.es.js"
        );
        const playlightSDK = module.default;

        // Initialize SDK
        playlightSDK.init();

        // Import game store
        const { useGameStore } = await import('./game/state');

        // Set up event listeners for game pause/unpause
        playlightSDK.onEvent('discoveryOpen', () => {
          console.log("[PLAYLIGHT] Discovery opened - pausing game");
          const state = useGameStore.getState();
          if (!state.isPaused) {
            state.togglePause();
          }
        });

        playlightSDK.onEvent('discoveryClose', () => {
          console.log("[PLAYLIGHT] Discovery closed - resuming game");
          const state = useGameStore.getState();
          if (state.isPaused) {
            state.togglePause();
          }
        });

        console.log("[PLAYLIGHT] SDK initialized with game pause integration");
      } catch (error) {
        console.error("Error loading the Playlight SDK:", error);
      }
    })();
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