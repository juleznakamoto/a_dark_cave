import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Game from "@/pages/game";
import BuildingProgress from "@/pages/building-progress";
import HeroTest from "@/pages/hero-test";
import NotFound from "@/pages/not-found";
import ResetPassword from "@/pages/reset-password";
import Imprint from "@/pages/imprint";
import Privacy from "@/pages/privacy";
import Terms from "@/pages/terms";
import Withdrawal from "@/pages/withdrawal";
import ExplosionTest from "@/pages/explosion-test";
import AdminDashboard from '@/pages/admin/dashboard';


const isDev = import.meta.env.DEV;

function Router() {
  return (
    <Switch>
      <Route path="/" component={Game} />
      <Route path="/boost" component={Game} />
      <Route path="/hero-test" component={HeroTest} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/imprint" component={Imprint} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/terms" component={Terms} />
      <Route path="/withdrawal" component={Withdrawal} />
      <Route path="/admin/dashboard/dev" component={() => <AdminDashboard environment="dev" />} />
      <Route path="/admin/dashboard/prod" component={() => <AdminDashboard environment="prod" />} />
      <Route path="/admin/dashboard" component={() => <AdminDashboard environment="prod" />} />
      {isDev && <Route path="/explosion-test" component={ExplosionTest} />}
      <Route component={NotFound} />
    </Switch>
  );
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