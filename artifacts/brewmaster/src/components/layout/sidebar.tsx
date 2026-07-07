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
  FileText,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useListActiveAlarms } from "@workspace/api-client-react";

const NAV_GROUPS = [
  {
    label: "VISÃO GERAL",
    items: [
      { href: "/", icon: LayoutDashboard, label: "Painel" },
      { href: "/production", icon: Settings2, label: "Produção" },
    ]
  },
  {
    label: "FABRICAÇÃO",
    items: [
      { href: "/recipes", icon: FlaskConical, label: "Receitas" },
      { href: "/equipment", icon: Container, label: "Equipamentos" },
      { href: "/sensors", icon: Activity, label: "Sensores" },
      { href: "/actuators", icon: Power, label: "Atuadores" },
    ]
  },
  {
    label: "MONITORAMENTO",
    items: [
      { href: "/alarms", icon: BellRing, label: "Alarmes", badge: "alarms" },
      { href: "/history", icon: History, label: "Histórico" },
      { href: "/reports", icon: BarChart3, label: "Relatórios" },
    ]
  },
  {
    label: "SISTEMA",
    items: [
      { href: "/users", icon: Users, label: "Usuários" },
      { href: "/ai", icon: MessageSquare, label: "Assistente IA" },
      { href: "/settings", icon: ServerCog, label: "Configurações" },
      { href: "/logs", icon: FileText, label: "Logs" },
    ]
  }
];

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
}

export function Sidebar({ open = false, onClose }: SidebarProps) {
  const [location] = useLocation();
  const { data: alarms } = useListActiveAlarms({ query: { refetchInterval: 5000 } });
  
  const activeAlarmsCount = alarms?.length || 0;

  return (
    <aside className={cn(
      "w-64 flex-shrink-0 bg-sidebar border-r border-sidebar-border h-full flex flex-col",
      "fixed inset-y-0 left-0 z-30 transition-transform duration-300",
      "md:relative md:translate-x-0",
      open ? "translate-x-0" : "-translate-x-full"
    )}>
      <div className="h-16 flex items-center justify-between px-6 border-b border-sidebar-border">
        <div className="flex items-center gap-2 text-primary font-bold tracking-wider">
          <Settings2 className="w-6 h-6" />
          <span>BREWMASTER AI</span>
        </div>
        {/* Botão fechar (somente mobile) */}
        <button
          onClick={onClose}
          className="md:hidden p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
          aria-label="Fechar menu"
        >
          <X className="w-5 h-5" />
        </button>
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
                    onClick={onClose}
                    className={cn(
                      "flex items-center gap-3 px-2 py-2 rounded-md transition-colors text-sm font-medium",
                      isActive 
                        ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                        : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground"
                    )}
                  >
                    <Icon className={cn("w-4 h-4 shrink-0", isActive && "text-primary")} />
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
          <span>Status do Sistema</span>
          <span className="flex h-2 w-2 rounded-full bg-green-500"></span>
        </div>
        <div className="mt-1">v1.0.0-rc.1</div>
      </div>
    </aside>
  );
}
