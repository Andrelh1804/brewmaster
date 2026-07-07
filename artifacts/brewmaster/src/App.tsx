import { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { Sidebar } from '@/components/layout/sidebar';
import { Menu, Settings2, Sun, Moon } from 'lucide-react';

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
import Scada from '@/pages/scada';
import ControlCenter from '@/pages/control-center';
import Devices from '@/pages/devices';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 2000 },
  },
});

function useTheme() {
  const [isDark, setIsDark] = useState(() => {
    try {
      const stored = localStorage.getItem('bm-theme');
      if (stored) return stored === 'dark';
    } catch {}
    return true; // default dark
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }
    try { localStorage.setItem('bm-theme', isDark ? 'dark' : 'light'); } catch {}
  }, [isDark]);

  return { isDark, toggle: () => setIsDark((v) => !v) };
}

function Router() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isDark, toggle } = useTheme();

  return (
    <div className="flex h-[100dvh] w-full bg-background text-foreground overflow-hidden font-sans">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} isDark={isDark} onThemeToggle={toggle} />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Mobile header */}
        <div className="h-14 flex items-center px-4 border-b border-border md:hidden bg-sidebar shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
            aria-label="Abrir menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 ml-3 text-primary font-bold tracking-wider">
            <Settings2 className="w-5 h-5" />
            <span>BREWMASTER AI</span>
          </div>
          <button
            onClick={toggle}
            className="ml-auto p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
            aria-label="Alternar tema"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>

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
            <Route path="/scada" component={Scada} />
            <Route path="/control" component={ControlCenter} />
            <Route path="/devices" component={Devices} />
            <Route component={NotFound} />
          </Switch>
        </main>
      </div>
    </div>
  );
}

function App() {
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
