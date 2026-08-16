import { lazy, Suspense, useEffect } from "react";
import { Switch, Route, Redirect, Router as WouterRouter } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import DeferredAppChrome from "@/components/DeferredAppChrome";
import PageLoadSpinner, {
  dismissBootSpinner,
} from "@/components/ui/page-load-spinner";
import AppErrorBoundary from "@/components/AppErrorBoundary";

const steamBuild = import.meta.env.VITE_STEAM_BUILD === "1";
const crazyGamesBuild = import.meta.env.VITE_CRAZYGAMES === "1";
const offlinePortalBuild = steamBuild || crazyGamesBuild;

function redirectHome() {
  return Promise.resolve({ default: () => <Redirect to="/" /> });
}

// Lazy load admin dashboard (recharts, date-fns, 11 tabs - only admins need this)
const AdminDashboard = lazy(() =>
  offlinePortalBuild ? redirectHome() : import("@/pages/admin/dashboard"),
);

// Start screen page - lightweight wrapper that conditionally loads Game
const StartScreenPage = lazy(() => import("@/pages/start-screen-page"));

// Lazy load all other pages
const EndScreenPage = lazy(() => import("@/pages/end-screen"));
const NotFound = lazy(() => import("@/pages/not-found"));
const ResetPassword = lazy(() =>
  offlinePortalBuild ? redirectHome() : import("@/pages/reset-password"),
);
const Imprint = lazy(() =>
  offlinePortalBuild ? redirectHome() : import("@/pages/imprint"),
);
const Privacy = lazy(() =>
  offlinePortalBuild ? redirectHome() : import("@/pages/privacy"),
);
const Terms = lazy(() =>
  offlinePortalBuild ? redirectHome() : import("@/pages/terms"),
);
const Withdrawal = lazy(() =>
  offlinePortalBuild ? redirectHome() : import("@/pages/withdrawal"),
);
const Unsubscribe = lazy(() =>
  offlinePortalBuild ? redirectHome() : import("@/pages/unsubscribe"),
);
const StarshipShaderDemo = lazy(() => import("@/pages/starship-shader-demo"));
const AnimationsDemo = lazy(() => import("@/pages/animations-demo"));
const CombatDialogDemo = lazy(() => import("@/pages/combat-dialog-demo"));
const DemoEndScreenDemo = lazy(() => import("@/pages/demo-end-screen-demo"));
const SoundsDemo = lazy(() => import("@/pages/sounds-demo"));

function AppRoutes() {
  return (
    <Suspense fallback={<PageLoadSpinner />}>
      <Switch>
        <Route path="/" component={StartScreenPage} />
        <Route path="/galaxy" component={StartScreenPage} />
        <Route path="/crazygames" component={StartScreenPage} />
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
        <Route path="/dev/demo-end" component={DemoEndScreenDemo} />
        <Route path="/dev/sounds" component={SoundsDemo} />
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
    // Safety: drop the HTML boot spinner if a route never mounts PageLoadSpinner.
    dismissBootSpinner();
  }, []);

  return (
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <DeferredAppChrome>
          {crazyGamesBuild ? (
            <WouterRouter hook={useHashLocation}>
              <AppRoutes />
            </WouterRouter>
          ) : (
            <AppRoutes />
          )}
        </DeferredAppChrome>
      </QueryClientProvider>
    </AppErrorBoundary>
  );
}

export default App;
