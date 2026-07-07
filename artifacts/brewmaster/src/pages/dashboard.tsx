import {
  useGetDashboardOverview,
  useGetDashboardSensorSummary,
  useGetDashboardRecentEvents,
  useGetIndustrialMetrics,
  getGetDashboardOverviewQueryKey,
  getGetDashboardSensorSummaryQueryKey,
  getGetDashboardRecentEventsQueryKey,
  getGetIndustrialMetricsQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  BellRing,
  Container,
  Settings2,
  Zap,
  Droplets,
  Flame,
  TrendingUp,
  Wifi,
  WifiOff,
  Database,
  Cloud,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const IOT_STATUS_LABELS: Record<string, string> = {
  online: "Online",
  simulated: "Simulado",
  offline: "Offline",
};

function StatusDot({ status }: { status: string }) {
  return (
    <span className={cn(
      "flex h-2 w-2 rounded-full",
      status === "connected" ? "bg-emerald-500" :
      status === "error"     ? "bg-destructive animate-pulse" :
      "bg-slate-500"
    )} />
  );
}

function MetricCard({
  title,
  value,
  unit,
  sub,
  icon: Icon,
  iconClass,
  critical,
}: {
  title: string;
  value: string | number;
  unit?: string;
  sub?: string;
  icon: React.ElementType;
  iconClass?: string;
  critical?: boolean;
}) {
  return (
    <Card className={cn(
      "bg-gradient-to-br from-card to-sidebar shadow-lg border transition-all",
      critical && "border-destructive/50"
    )}>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 px-4 pt-4">
        <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={cn("h-4 w-4 shrink-0", iconClass ?? "text-muted-foreground")} />
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="flex items-baseline gap-1">
          <span className={cn("text-xl sm:text-2xl font-bold text-foreground font-mono", critical && "text-destructive")}>
            {value}
          </span>
          {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
        </div>
        {sub && <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wide">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { data: overview } = useGetDashboardOverview({
    query: { refetchInterval: 5000, queryKey: getGetDashboardOverviewQueryKey() }
  });
  const { data: sensors, isLoading: sensorsLoading } = useGetDashboardSensorSummary({
    query: { refetchInterval: 5000, queryKey: getGetDashboardSensorSummaryQueryKey() }
  });
  const { data: events, isLoading: eventsLoading } = useGetDashboardRecentEvents({
    query: { refetchInterval: 5000, queryKey: getGetDashboardRecentEventsQueryKey() }
  });
  const { data: industrial } = useGetIndustrialMetrics({
    query: { refetchInterval: 8000, queryKey: getGetIndustrialMetricsQueryKey() }
  });

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Painel Industrial</h1>
        <div className="flex items-center gap-2">
          {overview && (
            <Badge variant={overview.iotStatus === 'online' ? 'success' : overview.iotStatus === 'simulated' ? 'warning' : 'destructive'} className="uppercase text-[10px] tracking-wider">
              ● {IOT_STATUS_LABELS[overview.iotStatus] ?? overview.iotStatus}
            </Badge>
          )}
          {industrial && (
            <Badge
              className={cn(
                "uppercase text-[10px] tracking-wider",
                industrial.systemHealth === "good"     && "bg-emerald-900 text-emerald-300",
                industrial.systemHealth === "warning"  && "bg-amber-900 text-amber-300",
                industrial.systemHealth === "critical" && "bg-red-900 text-red-300 animate-pulse",
              )}
            >
              {industrial.systemHealth === "good" ? "✓ Sistema OK" :
               industrial.systemHealth === "warning" ? "⚠ Atenção" : "✕ Crítico"}
            </Badge>
          )}
        </div>
      </div>

      {/* Production + Equipment + Alarms + Recipes */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard
          title="Produção Ativa"
          value={overview?.activeProduction ? overview.activeProduction.recipeName : "Nenhuma"}
          sub={overview?.activeProduction ? `Etapa: ${overview.activeProduction.currentStage}` : "Aguardando início"}
          icon={Settings2}
          iconClass="text-primary"
        />
        <MetricCard
          title="Alarmes Ativos"
          value={overview?.activeAlarms ?? 0}
          sub="não reconhecidos"
          icon={BellRing}
          iconClass={(overview?.activeAlarms ?? 0) > 0 ? "text-destructive animate-pulse" : "text-muted-foreground"}
          critical={(overview?.activeAlarms ?? 0) > 0}
        />
        <MetricCard
          title="Equipamentos"
          value={`${overview?.connectedEquipment ?? 0} / ${overview?.totalEquipment ?? 0}`}
          sub="conectados"
          icon={Container}
          iconClass="text-muted-foreground"
        />
        <MetricCard
          title="Total Receitas"
          value={overview?.totalRecipes ?? 0}
          sub="disponíveis"
          icon={Activity}
          iconClass="text-muted-foreground"
        />
      </div>

      {/* Industrial Metrics */}
      {industrial && (
        <>
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-3">Consumos Industriais</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <MetricCard title="Potência" value={industrial.powerKW.toFixed(1)} unit="kW" sub="Atual" icon={Zap} iconClass="text-yellow-400" />
              <MetricCard title="Energia Hoje" value={industrial.powerKWhToday.toFixed(1)} unit="kWh" sub="Acumulado" icon={Zap} iconClass="text-amber-400" />
              <MetricCard title="Vazão Água" value={industrial.waterLitersPerHour.toFixed(0)} unit="L/h" sub="Atual" icon={Droplets} iconClass="text-blue-400" />
              <MetricCard title="Água Hoje" value={industrial.waterLitersToday.toFixed(0)} unit="L" sub="Acumulado" icon={Droplets} iconClass="text-cyan-400" />
              <MetricCard title="Gás Hoje" value={industrial.gasM3Today.toFixed(2)} unit="m³" sub="Acumulado" icon={Flame} iconClass="text-orange-400" />
              <MetricCard title="Eficiência" value={`${industrial.efficiency}%`} sub="Sistema" icon={TrendingUp} iconClass="text-emerald-400" />
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-3">Produção</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <MetricCard title="Lotes Hoje" value={industrial.productionToday} sub="Concluídos" icon={CheckCircle2} iconClass="text-emerald-400" />
              <MetricCard title="Lotes no Mês" value={industrial.productionMonth} sub="Concluídos" icon={TrendingUp} iconClass="text-primary" />
              {overview?.lastProduction && (
                <MetricCard
                  title="Último Lote"
                  value={format(new Date(overview.lastProduction), "dd/MM HH:mm")}
                  sub="Concluído"
                  icon={Clock}
                  iconClass="text-muted-foreground"
                />
              )}
            </div>
          </div>

          {/* System Status */}
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-3">Status dos Sistemas</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "MQTT",      status: industrial.mqttStatus,  icon: Wifi },
                { label: "WebSocket", status: industrial.wsStatus,    icon: Activity },
                { label: "Banco",     status: industrial.dbStatus,    icon: Database },
                { label: "Nuvem",     status: industrial.cloudStatus, icon: Cloud },
              ].map(({ label, status, icon: Icon }) => (
                <Card key={label} className="bg-sidebar border-border/50">
                  <CardContent className="p-3 flex items-center gap-2.5">
                    <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <StatusDot status={status} />
                        <span className="text-xs font-medium capitalize">
                          {status === "connected" ? "Conectado" :
                           status === "error"     ? "Erro" : "Desconectado"}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Sensors + Events */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="col-span-1 lg:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold tracking-tight">Sensores ao Vivo</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
            {sensorsLoading ? (
              <div className="col-span-full h-32 flex items-center justify-center text-muted-foreground animate-pulse">
                Carregando sensores...
              </div>
            ) : sensors?.map(sensor => (
              <Card key={sensor.sensorId} className="border-border/50 bg-sidebar/50 backdrop-blur hover:bg-sidebar transition-colors">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-widest truncate max-w-[90px]" title={sensor.sensorName}>
                      {sensor.sensorName}
                    </div>
                    <div className={cn("h-2 w-2 rounded-full shrink-0",
                      sensor.status === 'normal'   ? 'bg-emerald-500' :
                      sensor.status === 'warning'  ? 'bg-amber-500 animate-pulse' :
                      sensor.status === 'critical' ? 'bg-destructive animate-pulse' : 'bg-gray-500'
                    )} />
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className={cn(
                      "text-2xl sm:text-3xl font-mono tracking-tighter font-bold",
                      sensor.status === 'critical' ? 'text-destructive' :
                      sensor.status === 'warning'  ? 'text-amber-400' : 'text-foreground'
                    )}>
                      {sensor.value.toFixed(1)}
                    </span>
                    <span className="text-sm font-semibold text-muted-foreground">{sensor.unit}</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1 uppercase">{sensor.type}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight">Eventos Recentes</h2>
          <Card className="bg-sidebar border-border/50 shadow-inner">
            <CardContent className="p-0">
              <div className="divide-y divide-border/50 max-h-[400px] overflow-y-auto">
                {eventsLoading ? (
                  <div className="p-6 text-center text-muted-foreground animate-pulse">Carregando...</div>
                ) : events?.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground">Nenhum evento</div>
                ) : events?.map(event => (
                  <div key={event.id} className="px-4 py-2.5 hover:bg-sidebar-accent/30 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-xs font-medium text-foreground truncate flex-1">{event.message}</div>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                        {event.type.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {format(new Date(event.createdAt), "dd/MM HH:mm")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
