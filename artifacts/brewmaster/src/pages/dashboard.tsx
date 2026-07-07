import {
  useGetDashboardOverview,
  useGetDashboardSensorSummary,
  useGetDashboardRecentEvents,
  getGetDashboardOverviewQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, BellRing, Container, Settings2, ShieldAlert, Cpu, CheckCircle2, AlertTriangle, Clock } from "lucide-react";
import { format } from "date-fns";

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
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">System Dashboard</h1>
        {overview && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground uppercase tracking-wider">IoT Status</span>
            <Badge variant={overview.iotStatus === 'online' ? 'success' : overview.iotStatus === 'simulated' ? 'warning' : 'destructive'} className="uppercase">
              {overview.iotStatus}
            </Badge>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-card to-sidebar shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Production</CardTitle>
            <Settings2 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {overview?.activeProduction ? overview.activeProduction.recipeName : "None"}
            </div>
            {overview?.activeProduction && (
              <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wide">
                Stage: <span className="text-primary font-bold">{overview.activeProduction.currentStage}</span>
              </p>
            )}
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-card to-sidebar shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Alarms</CardTitle>
            <BellRing className={`h-4 w-4 ${overview?.activeAlarms && overview.activeAlarms > 0 ? 'text-destructive animate-pulse' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {overview?.activeAlarms ?? 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wide">Unacknowledged</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-sidebar shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Equipment</CardTitle>
            <Container className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {overview?.connectedEquipment ?? 0} <span className="text-muted-foreground text-sm font-normal">/ {overview?.totalEquipment ?? 0}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wide">Connected</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-sidebar shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Recipes</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {overview?.totalRecipes ?? 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wide">Available</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="col-span-1 lg:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold tracking-tight">Live Sensors</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {sensorsLoading ? (
              <div className="col-span-full h-32 flex items-center justify-center text-muted-foreground">Loading sensors...</div>
            ) : sensors?.map(sensor => (
              <Card key={sensor.sensorId} className="border-border/50 bg-sidebar/50 backdrop-blur">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-widest truncate max-w-[100px]" title={sensor.sensorName}>
                      {sensor.sensorName}
                    </div>
                    <div className={`h-2 w-2 rounded-full ${
                      sensor.status === 'normal' ? 'bg-emerald-500' : 
                      sensor.status === 'warning' ? 'bg-amber-500 animate-pulse' : 
                      sensor.status === 'critical' ? 'bg-destructive animate-pulse' : 'bg-gray-500'
                    }`} />
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-mono tracking-tighter font-bold">{sensor.value.toFixed(1)}</span>
                    <span className="text-sm font-semibold text-muted-foreground">{sensor.unit}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight">Recent Events</h2>
          <Card className="bg-sidebar border-border/50 shadow-inner">
            <CardContent className="p-0">
              <div className="divide-y divide-border/50 max-h-[400px] overflow-y-auto">
                {eventsLoading ? (
                  <div className="p-4 text-center text-muted-foreground text-sm">Loading events...</div>
                ) : events?.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground text-sm">No recent events</div>
                ) : events?.map(event => (
                  <div key={event.id} className="p-4 flex gap-3 hover:bg-card/50 transition-colors">
                    <div className="mt-0.5">
                      {event.type.includes('alarm') ? <ShieldAlert className="w-4 h-4 text-destructive" /> :
                       event.type.includes('started') ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> :
                       event.type.includes('sensor') ? <Activity className="w-4 h-4 text-amber-500" /> :
                       <Clock className="w-4 h-4 text-muted-foreground" />}
                    </div>
                    <div className="space-y-1">
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
