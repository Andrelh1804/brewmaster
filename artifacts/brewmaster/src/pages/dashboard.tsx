import {
  useGetDashboardOverview,
  useGetDashboardSensorSummary,
  useGetDashboardRecentEvents,
  getGetDashboardOverviewQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, BellRing, Container, Settings2, ShieldAlert, CheckCircle2, Clock } from "lucide-react";
import { format } from "date-fns";

const IOT_STATUS_LABELS: Record<string, string> = {
  online: "Online",
  simulated: "Simulado",
  offline: "Offline",
};

export default function Dashboard() {
  const { data: overview, isLoading: overviewLoading } = useGetDashboardOverview({
    query: { refetchInterval: 5000, queryKey: getGetDashboardOverviewQueryKey() }
  });

  const { data: sensors, isLoading: sensorsLoading } = useGetDashboardSensorSummary({
    query: { refetchInterval: 5000 }
  });

  const { data: events, isLoading: eventsLoading } = useGetDashboardRecentEvents({
    query: { refetchInterval: 5000 }
  });

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Painel do Sistema</h1>
        {overview && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground uppercase tracking-wider">Status IoT</span>
            <Badge variant={overview.iotStatus === 'online' ? 'success' : overview.iotStatus === 'simulated' ? 'warning' : 'destructive'} className="uppercase">
              {IOT_STATUS_LABELS[overview.iotStatus] ?? overview.iotStatus}
            </Badge>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="bg-gradient-to-br from-card to-sidebar shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 px-4 pt-4">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Produção Ativa</CardTitle>
            <Settings2 className="h-4 w-4 text-primary shrink-0" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-xl sm:text-2xl font-bold text-foreground truncate">
              {overview?.activeProduction ? overview.activeProduction.recipeName : "Nenhuma"}
            </div>
            {overview?.activeProduction && (
              <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wide truncate">
                Etapa: <span className="text-primary font-bold">{overview.activeProduction.currentStage}</span>
              </p>
            )}
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-card to-sidebar shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 px-4 pt-4">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Alarmes Ativos</CardTitle>
            <BellRing className={`h-4 w-4 shrink-0 ${overview?.activeAlarms && overview.activeAlarms > 0 ? 'text-destructive animate-pulse' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-xl sm:text-2xl font-bold text-foreground">
              {overview?.activeAlarms ?? 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wide">Não Reconhecidos</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-sidebar shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 px-4 pt-4">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Equipamentos</CardTitle>
            <Container className="h-4 w-4 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-xl sm:text-2xl font-bold text-foreground">
              {overview?.connectedEquipment ?? 0} <span className="text-muted-foreground text-sm font-normal">/ {overview?.totalEquipment ?? 0}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wide">Conectados</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-sidebar shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 px-4 pt-4">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Total de Receitas</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-xl sm:text-2xl font-bold text-foreground">
              {overview?.totalRecipes ?? 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wide">Disponíveis</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="col-span-1 lg:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold tracking-tight">Sensores ao Vivo</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
            {sensorsLoading ? (
              <div className="col-span-full h-32 flex items-center justify-center text-muted-foreground">Carregando sensores...</div>
            ) : sensors?.map(sensor => (
              <Card key={sensor.sensorId} className="border-border/50 bg-sidebar/50 backdrop-blur">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-widest truncate max-w-[90px]" title={sensor.sensorName}>
                      {sensor.sensorName}
                    </div>
                    <div className={`h-2 w-2 rounded-full shrink-0 ${
                      sensor.status === 'normal' ? 'bg-emerald-500' : 
                      sensor.status === 'warning' ? 'bg-amber-500 animate-pulse' : 
                      sensor.status === 'critical' ? 'bg-destructive animate-pulse' : 'bg-gray-500'
                    }`} />
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl sm:text-3xl font-mono tracking-tighter font-bold">{sensor.value.toFixed(1)}</span>
                    <span className="text-sm font-semibold text-muted-foreground">{sensor.unit}</span>
                  </div>
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
                  <div className="p-4 text-center text-muted-foreground text-sm">Carregando eventos...</div>
                ) : events?.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground text-sm">Nenhum evento recente</div>
                ) : events?.map(event => (
                  <div key={event.id} className="p-4 flex gap-3 hover:bg-card/50 transition-colors">
                    <div className="mt-0.5 shrink-0">
                      {event.type.includes('alarm') ? <ShieldAlert className="w-4 h-4 text-destructive" /> :
                       event.type.includes('started') ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> :
                       event.type.includes('sensor') ? <Activity className="w-4 h-4 text-amber-500" /> :
                       <Clock className="w-4 h-4 text-muted-foreground" />}
                    </div>
                    <div className="space-y-1 min-w-0">
                      <p className="text-sm leading-tight">{event.message}</p>
                      <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">
                        {format(new Date(event.createdAt), 'HH:mm:ss')}
                      </p>
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
