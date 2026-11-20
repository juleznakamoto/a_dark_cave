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
import { shouldBootGameSurface } from "@/game/startupBootSurface";

const crazyGamesBuild = import.meta.env.VITE_CRAZYGAMES === "1";
const itchBuild = import.meta.env.VITE_ITCH === "1";
const hashRoutedPortalBuild = crazyGamesBuild || itchBuild;

// Real dynamic imports. A false branch still ships the page. Packaged builds
// alias these modules to a redirect stub in vite.sitePages.ts.
const AdminDashboard = lazy(() => import("@/pages/admin/dashboard"));

const StartScreenPage = lazy(() => import("@/pages/start-screen-page"));
const GamePage = lazy(() => import("@/pages/game"));

/** forceGame, in-game resume, and portal editions skip the start-screen chunk. */
function PlayRoute() {
  return shouldBootGameSurface(window.location) ? (
    <GamePage />
  ) : (
    <StartScreenPage />
  );
}

// Lazy load all other pages
const EndScreenPage = lazy(() => import("@/pages/end-screen"));
const NotFound = lazy(() => import("@/pages/not-found"));
const ResetPassword = lazy(() => import("@/pages/reset-password"));
const Imprint = lazy(() => import("@/pages/imprint"));
const Privacy = lazy(() => import("@/pages/privacy"));
const Faq = lazy(() => import("@/pages/faq"));
const About = lazy(() => import("@/pages/about"));
const Press = lazy(() => import("@/pages/press"));
const Terms = lazy(() => import("@/pages/terms"));
const Withdrawal = lazy(() => import("@/pages/withdrawal"));
const Unsubscribe = lazy(() => import("@/pages/unsubscribe"));
// Production builds alias these to the same stub. The dev server keeps them.
const StarshipShaderDemo = lazy(() => import("@/pages/starship-shader-demo"));
const AnimationsDemo = lazy(() => import("@/pages/animations-demo"));
const CombatDialogDemo = lazy(() => import("@/pages/combat-dialog-demo"));
const DemoEndScreenDemo = lazy(() => import("@/pages/demo-end-screen-demo"));
const SoundsDemo = lazy(() => import("@/pages/sounds-demo"));
const ProductionIconsDemo = lazy(
  () => import("@/pages/production-icons-demo"),
);
const VillageMapDemo = lazy(() => import("@/pages/village-map-demo"));
const BuildingShapeDemo = lazy(() => import("@/pages/building-shape-demo"));
const TooltipsDemo = lazy(() => import("@/pages/tooltips-demo"));
const DialogsDemo = lazy(() => import("@/pages/dialogs-demo"));
const ToastsDemo = lazy(() => import("@/pages/toasts-demo"));
const DevDashboard = lazy(() => import("@/pages/dev-dashboard"));

function AppRoutes() {
  return (
    <Suspense fallback={<PageLoadSpinner />}>
      <Switch>
        <Route path="/" component={PlayRoute} />
        <Route path="/galaxy" component={PlayRoute} />
        <Route path="/crazygames" component={PlayRoute} />
        <Route path="/itch" component={PlayRoute} />
        <Route path="/boost" component={PlayRoute} />
        <Route path="/game">{() => <Redirect to="/" />}</Route>
        <Route path="/end-screen" component={EndScreenPage} />
        <Route path="/imprint" component={Imprint} />
        <Route path="/privacy" component={Privacy} />
        <Route path="/faq" component={Faq} />
        <Route path="/about" component={About} />
        <Route path="/press" component={Press} />
        <Route path="/terms" component={Terms} />
        <Route path="/withdrawal" component={Withdrawal} />
        <Route path="/unsubscribe" component={Unsubscribe} />
        <Route path="/reset-password" component={ResetPassword} />
        <Route path="/admin/dashboard" component={AdminDashboard} />
        <Route path="/dev" component={DevDashboard} />
        <Route path="/dev/starship-shader" component={StarshipShaderDemo} />
        <Route path="/dev/animations" component={AnimationsDemo} />
        <Route path="/dev/combat-dialog" component={CombatDialogDemo} />
        <Route path="/dev/demo-end" component={DemoEndScreenDemo} />
        <Route path="/dev/sounds" component={SoundsDemo} />
        <Route
          path="/dev/production-icons"
          component={ProductionIconsDemo}
        />
        <Route path="/dev/village-map" component={VillageMapDemo} />
        <Route path="/dev/building-shapes" component={BuildingShapeDemo} />
        <Route path="/dev/tooltips" component={TooltipsDemo} />
        <Route path="/dev/dialogs" component={DialogsDemo} />
        <Route path="/dev/toasts" component={ToastsDemo} />
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
          {hashRoutedPortalBuild ? (
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
