import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  useListCommLogs,
  useGetDeviceCommLogs,
  useListDevices,
  getListCommLogsQueryKey,
  getListDevicesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { FileText, RefreshCw, Wifi, WifiOff, AlertTriangle, Link } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const EVENT_STYLES: Record<string, { color: string; icon: React.ReactNode }> = {
  connected:      { color: "text-emerald-400", icon: <Wifi className="w-3 h-3" /> },
  disconnected:   { color: "text-slate-400",   icon: <WifiOff className="w-3 h-3" /> },
  reconnected:    { color: "text-blue-400",    icon: <Wifi className="w-3 h-3" /> },
  error:          { color: "text-red-400",     icon: <AlertTriangle className="w-3 h-3" /> },
  timeout:        { color: "text-orange-400",  icon: <AlertTriangle className="w-3 h-3" /> },
  command_sent:   { color: "text-purple-400",  icon: <Link className="w-3 h-3" /> },
  command_ack:    { color: "text-emerald-400", icon: <Link className="w-3 h-3" /> },
  ota_start:      { color: "text-yellow-400",  icon: <Link className="w-3 h-3" /> },
};

export default function CommLogs() {
  const queryClient = useQueryClient();
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("all");

  const { data: devices } = useListDevices({ query: { queryKey: getListDevicesQueryKey() } });

  const deviceId = selectedDeviceId !== "all" ? Number(selectedDeviceId) : undefined;

  const allLogsQuery = useListCommLogs({ limit: 300 }, {
    query: { enabled: !deviceId, refetchInterval: 5000, queryKey: getListCommLogsQueryKey({ limit: 300 }) },
  });

  const deviceLogsQuery = useGetDeviceCommLogs(
    deviceId ?? 0,
    { limit: 300 },
    { query: { enabled: !!deviceId, refetchInterval: 5000, queryKey: ["/api/devices", deviceId, "comm-logs"] } },
  );

  const logs = deviceId ? deviceLogsQuery.data : allLogsQuery.data;
  const isLoading = deviceId ? deviceLogsQuery.isLoading : allLogsQuery.isLoading;

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/comm-logs"] });
    queryClient.invalidateQueries({ queryKey: ["/api/devices", deviceId, "comm-logs"] });
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="w-7 h-7 text-primary" /> Logs de Comunicação
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Histórico de conexões, desconexões e eventos de rede</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedDeviceId} onValueChange={setSelectedDeviceId}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os dispositivos</SelectItem>
              {(devices ?? []).map((d) => (
                <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={refresh} className="gap-2">
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <Card className="bg-sidebar border-border/50">
        <CardHeader className="pb-2 px-4 pt-4">
          <CardTitle className="text-sm">
            {logs?.length ?? 0} eventos registrados
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {isLoading ? (
            <div className="text-muted-foreground text-sm">Carregando...</div>
          ) : !logs?.length ? (
            <div className="text-muted-foreground text-sm">
              Nenhum log ainda. Os eventos aparecem aqui quando dispositivos conectam via MQTT.
            </div>
          ) : (
            <div className="space-y-1 max-h-[600px] overflow-y-auto font-mono">
              {logs.map((log) => {
                const style = EVENT_STYLES[log.event] ?? { color: "text-muted-foreground", icon: null };
                return (
                  <div key={log.id} className="flex items-start gap-3 border-b border-border/20 py-2 text-xs">
                    <span className="text-muted-foreground shrink-0 w-32">
                      {format(new Date(log.timestamp), "dd/MM HH:mm:ss")}
                    </span>
                    <span className={cn("shrink-0", style.color)}>{style.icon}</span>
                    <span className={cn("font-semibold shrink-0 w-20", style.color)}>{log.event}</span>
                    {log.deviceIdentifier && (
                      <Badge variant="outline" className="text-[10px] px-1.5 font-mono shrink-0">
                        {log.deviceIdentifier}
                      </Badge>
                    )}
                    {log.details && (
                      <span className="text-muted-foreground truncate">{log.details}</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
