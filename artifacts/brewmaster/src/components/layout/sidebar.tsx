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
  X,
  GitBranch,
  Cpu,
  Wifi,
  Sun,
  Moon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useListActiveAlarms, getListActiveAlarmsQueryKey } from "@workspace/api-client-react";

const NAV_GROUPS = [
  {
    label: "VISÃO GERAL",
    items: [
      { href: "/",          icon: LayoutDashboard, label: "Painel Industrial" },
      { href: "/scada",     icon: GitBranch,       label: "SCADA" },
      { href: "/production",icon: Settings2,       label: "Produção" },
    ]
  },
  {
    label: "CONTROLE",
    items: [
      { href: "/control",   icon: Cpu,             label: "Centro de Controle" },
      { href: "/actuators", icon: Power,           label: "Atuadores" },
      { href: "/sensors",   icon: Activity,        label: "Sensores" },
    ]
  },
  {
    label: "FABRICAÇÃO",
    items: [
      { href: "/recipes",   icon: FlaskConical,    label: "Receitas" },
      { href: "/equipment", icon: Container,       label: "Equipamentos" },
      { href: "/devices",   icon: Wifi,            label: "Dispositivos IoT" },
    ]
  },
  {
    label: "MONITORAMENTO",
    items: [
      { href: "/alarms",    icon: BellRing,        label: "Alarmes", badge: "alarms" },
      { href: "/history",   icon: History,         label: "Histórico" },
      { href: "/reports",   icon: BarChart3,       label: "Relatórios" },
    ]
  },
  {
    label: "SISTEMA",
    items: [
      { href: "/users",     icon: Users,           label: "Usuários" },
      { href: "/ai",        icon: MessageSquare,   label: "Assistente IA" },
      { href: "/settings",  icon: ServerCog,       label: "Configurações" },
      { href: "/logs",      icon: FileText,        label: "Logs" },
    ]
  }
];

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
  isDark?: boolean;
  onThemeToggle?: () => void;
}

export function Sidebar({ open = false, onClose, isDark = true, onThemeToggle }: SidebarProps) {
  const [location] = useLocation();
  const { data: alarms } = useListActiveAlarms({ query: { refetchInterval: 5000, queryKey: getListActiveAlarmsQueryKey() } });

  const activeAlarmsCount = alarms?.length ?? 0;

  return (
    <aside className={cn(
      "w-64 flex-shrink-0 bg-sidebar border-r border-sidebar-border h-full flex flex-col",
      "fixed inset-y-0 left-0 z-30 transition-transform duration-300",
      "md:relative md:translate-x-0",
      open ? "translate-x-0" : "-translate-x-full"
    )}>
      {/* Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border shrink-0">
        <div className="flex items-center gap-2 text-primary font-bold tracking-wider">
          <Settings2 className="w-5 h-5" />
          <span className="text-sm">BREWMASTER AI</span>
        </div>
        <div className="flex items-center gap-1">
          {onThemeToggle && (
            <button
              onClick={onThemeToggle}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
              aria-label="Alternar tema"
              title={isDark ? "Modo claro" : "Modo escuro"}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          )}
          <button
            onClick={onClose}
            className="md:hidden p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
            aria-label="Fechar menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto py-3">
        {NAV_GROUPS.map((group, i) => (
          <div key={i} className="mb-4 px-3">
            <h3 className="px-2 mb-1.5 text-[10px] font-semibold text-muted-foreground tracking-widest uppercase">
              {group.label}
            </h3>
            <div className="space-y-0.5">
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
                    <span className="truncate">{item.label}</span>
                    {item.badge === "alarms" && activeAlarmsCount > 0 && (
                      <span className="ml-auto bg-destructive text-destructive-foreground text-[10px] px-1.5 py-0.5 rounded-full font-bold animate-pulse min-w-[18px] text-center">
                        {activeAlarmsCount > 99 ? "99+" : activeAlarmsCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-sidebar-border shrink-0">
        <div className="flex items-center justify-between text-xs text-muted-foreground px-2">
          <span>Sistema</span>
          <div className="flex items-center gap-1.5">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500" title="Online" />
            <span>v2.0.0</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
