import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { Sidebar } from '@/components/layout/sidebar';

import Dashboard from '@/pages/dashboard';
import Production from '@/pages/production';
import Recipes from '@/pages/recipes';
import Equipment from '@/pages/equipment';
import Sensors from '@/pages/sensors';
import Actuators from '@/pages/actuators';
import Alarms from '@/pages/alarms';
import History from '@/pages/history';
import Reports from '@/pages/reports';
import Users from '@/pages/users';
import AiAssistant from '@/pages/ai-assistant';
import Settings from '@/pages/settings';

const queryClient = new QueryClient();

function Router() {
  return (
    <div className="flex h-[100dvh] w-full bg-background text-foreground overflow-hidden font-sans">
      <Sidebar />
      <main className="flex-1 overflow-y-auto overflow-x-hidden relative">
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/production" component={Production} />
          <Route path="/recipes" component={Recipes} />
          <Route path="/equipment" component={Equipment} />
          <Route path="/sensors" component={Sensors} />
          <Route path="/actuators" component={Actuators} />
          <Route path="/alarms" component={Alarms} />
          <Route path="/history" component={History} />
          <Route path="/reports" component={Reports} />
          <Route path="/users" component={Users} />
          <Route path="/ai" component={AiAssistant} />
          <Route path="/settings" component={Settings} />
          <Route path="/logs" component={History} />
          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
  );
}

function App() {
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
