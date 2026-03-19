import { lazy, Suspense, useEffect } from "react";
import { Switch, Route, Redirect } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { initPlaylight } from "@/lib/playlight";

// Lazy load admin dashboard (recharts, date-fns, 11 tabs - only admins need this)
const AdminDashboard = lazy(() => import("@/pages/admin/dashboard"));

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
const ExplosionTest = lazy(() => import("@/pages/explosion-test"));

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
        <Route path="/explosion-test" component={ExplosionTest} />
        <Route path="/admin/dashboard" component={AdminDashboard} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  useEffect(() => {
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
