import { lazy, Suspense, useEffect } from "react";
import { Switch, Route, Redirect } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { initPlaylight } from "@/lib/playlight";
import { isGalaxyEdition } from "@/lib/edition";

const steamBuild = import.meta.env.VITE_STEAM_BUILD === "1";

function redirectHome() {
  return Promise.resolve({ default: () => <Redirect to="/" /> });
}

// Lazy load admin dashboard (recharts, date-fns, 11 tabs - only admins need this)
const AdminDashboard = lazy(() =>
  steamBuild ? redirectHome() : import("@/pages/admin/dashboard"),
);

// Lazy load game page (only loads after Light Fire click)
const Game = lazy(() => import("@/pages/game"));
// Start screen page - lightweight wrapper that conditionally loads Game
const StartScreenPage = lazy(() => import("@/pages/start-screen-page"));

// Lazy load all other pages
const EndScreenPage = lazy(() => import("@/pages/end-screen"));
const NotFound = lazy(() => import("@/pages/not-found"));
const ResetPassword = lazy(() =>
  steamBuild ? redirectHome() : import("@/pages/reset-password"),
);
const Imprint = lazy(() =>
  steamBuild ? redirectHome() : import("@/pages/imprint"),
);
const Privacy = lazy(() =>
  steamBuild ? redirectHome() : import("@/pages/privacy"),
);
const Terms = lazy(() =>
  steamBuild ? redirectHome() : import("@/pages/terms"),
);
const Withdrawal = lazy(() =>
  steamBuild ? redirectHome() : import("@/pages/withdrawal"),
);
const Unsubscribe = lazy(() =>
  steamBuild ? redirectHome() : import("@/pages/unsubscribe"),
);
const StarshipShaderDemo = lazy(() => import("@/pages/starship-shader-demo"));
const AnimationsDemo = lazy(() => import("@/pages/animations-demo"));
const CombatDialogDemo = lazy(() => import("@/pages/combat-dialog-demo"));

function Router() {
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 bg-black"></div>
      }
    >
      <Switch>
        <Route path="/" component={StartScreenPage} />
        <Route path="/galaxy" component={StartScreenPage} />
        <Route path="/boost" component={StartScreenPage} />
        <Route path="/game">{() => <Redirect to="/" />}</Route>
        <Route path="/end-screen" component={EndScreenPage} />
        <Route path="/imprint" component={Imprint} />
        <Route path="/privacy" component={Privacy} />
        <Route path="/terms" component={Terms} />
        <Route path="/withdrawal" component={Withdrawal} />
        <Route path="/unsubscribe" component={Unsubscribe} />
        <Route path="/reset-password" component={ResetPassword} />
        <Route path="/admin/dashboard" component={AdminDashboard} />
        <Route path="/dev/starship-shader" component={StarshipShaderDemo} />
        <Route path="/dev/animations" component={AnimationsDemo} />
        <Route path="/dev/combat-dialog" component={CombatDialogDemo} />
        <Route path="/dev/estate-bar-upgrade">
          {() => <Redirect to="/dev/animations#estate-bars" />}
        </Route>
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  useEffect(() => {
    // Playlight is a web-only discovery SDK; Steam and Galaxy editions ship no online services.
    if (steamBuild || isGalaxyEdition()) return;
    initPlaylight().catch(() => { });
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
