import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Settings2, 
  FlaskConical, 
  Container, 
  Activity, 
  Power, 
  BellRing, 
  History, 
  BarChart3, 
  Users, 
  MessageSquare,
  ServerCog,
  FileText
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useListActiveAlarms } from "@workspace/api-client-react";

const NAV_GROUPS = [
  {
    label: "OVERVIEW",
    items: [
      { href: "/", icon: LayoutDashboard, label: "Dashboard" },
      { href: "/production", icon: Settings2, label: "Production" },
    ]
  },
  {
    label: "BREWING",
    items: [
      { href: "/recipes", icon: FlaskConical, label: "Recipes" },
      { href: "/equipment", icon: Container, label: "Equipment" },
      { href: "/sensors", icon: Activity, label: "Sensors" },
      { href: "/actuators", icon: Power, label: "Actuators" },
    ]
  },
  {
    label: "MONITORING",
    items: [
      { href: "/alarms", icon: BellRing, label: "Alarms", badge: "alarms" },
      { href: "/history", icon: History, label: "History" },
      { href: "/reports", icon: BarChart3, label: "Reports" },
    ]
  },
  {
    label: "SYSTEM",
    items: [
      { href: "/users", icon: Users, label: "Users" },
      { href: "/ai", icon: MessageSquare, label: "AI Assistant" },
      { href: "/settings", icon: ServerCog, label: "Settings" },
      { href: "/logs", icon: FileText, label: "Logs" },
    ]
  }
];

export function Sidebar() {
  const [location] = useLocation();
  const { data: alarms } = useListActiveAlarms({ query: { refetchInterval: 5000 } });
  
  const activeAlarmsCount = alarms?.length || 0;

  return (
    <aside className="w-64 flex-shrink-0 bg-sidebar border-r border-sidebar-border h-full flex flex-col">
      <div className="h-16 flex items-center px-6 border-b border-sidebar-border">
        <div className="flex items-center gap-2 text-primary font-bold tracking-wider">
          <Settings2 className="w-6 h-6" />
          <span>BREWMASTER AI</span>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto py-4">
        {NAV_GROUPS.map((group, i) => (
          <div key={i} className="mb-6 px-4">
            <h3 className="px-2 mb-2 text-xs font-semibold text-muted-foreground tracking-widest uppercase">
              {group.label}
            </h3>
            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive = location === item.href;
                const Icon = item.icon;
                
                return (
                  <Link 
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-2 py-2 rounded-md transition-colors text-sm font-medium",
                      isActive 
                        ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                        : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground"
                    )}
                  >
                    <Icon className={cn("w-4 h-4", isActive && "text-primary")} />
                    <span>{item.label}</span>
                    {item.badge === "alarms" && activeAlarmsCount > 0 && (
                      <span className="ml-auto bg-destructive text-destructive-foreground text-[10px] px-2 py-0.5 rounded-full font-bold animate-pulse">
                        {activeAlarmsCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      
      <div className="p-4 border-t border-sidebar-border text-xs text-muted-foreground">
        <div className="flex items-center justify-between">
          <span>System Status</span>
          <span className="flex h-2 w-2 rounded-full bg-green-500"></span>
        </div>
        <div className="mt-1">v1.0.0-rc.1</div>
      </div>
    </aside>
  );
}
