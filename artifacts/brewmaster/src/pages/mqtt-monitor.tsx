import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useListMqttMessages,
  useGetMqttStatus,
  getListMqttMessagesQueryKey,
  getGetMqttStatusQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Radio, RefreshCw, ArrowDown, ArrowUp, Filter } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function MqttMonitor() {
  const queryClient = useQueryClient();
  const [deviceFilter, setDeviceFilter] = useState("");

  const { data: status } = useGetMqttStatus({ query: { refetchInterval: 3000, queryKey: getGetMqttStatusQueryKey() } });
  const { data: messages, isLoading } = useListMqttMessages({
    deviceId: deviceFilter || undefined,
    limit: 200,
  }, {
    query: { refetchInterval: 3000, queryKey: getListMqttMessagesQueryKey({ deviceId: deviceFilter || undefined, limit: 200 }) },
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/mqtt"] });
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Radio className="w-7 h-7 text-primary" /> Monitor MQTT
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Mensagens publicadas e recebidas pelo broker</p>
        </div>
        <Button variant="outline" size="sm" onClick={refresh} className="gap-2">
          <RefreshCw className="w-3.5 h-3.5" /> Atualizar
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Clientes conectados",  value: status?.clientCount ?? 0,       color: "text-emerald-400" },
          { label: "Total mensagens",       value: status?.totalMessages ?? 0,     color: "text-blue-400" },
          { label: "Uplink (↑)",            value: status?.uplinkMessages ?? 0,    color: "text-yellow-400" },
          { label: "Downlink (↓)",          value: status?.downlinkMessages ?? 0,  color: "text-purple-400" },
        ].map(({ label, value, color }) => (
          <Card key={label} className="bg-sidebar border-border/50">
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground mb-1">{label}</div>
              <div className={cn("text-2xl font-bold tabular-nums", color)}>{value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Connected devices */}
      {(status?.connectedDevices?.length ?? 0) > 0 && (
        <Card className="bg-sidebar border-border/50">
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="text-sm">Dispositivos Conectados ao Broker</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 flex flex-wrap gap-2">
            {status!.connectedDevices!.map((id) => (
              <Badge key={id} variant="outline" className="font-mono text-xs border-emerald-500/30 text-emerald-400 gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {id}
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Topic structure */}
      <Card className="bg-sidebar border-border/50">
        <CardHeader className="pb-2 px-4 pt-4">
          <CardTitle className="text-sm">Estrutura de Tópicos MQTT</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              ["brewmaster/{deviceId}/status",    "Status do dispositivo (online/offline)"],
              ["brewmaster/{deviceId}/telemetry", "Leituras de sensores e atuadores"],
              ["brewmaster/{deviceId}/commands",  "Comandos enviados ao dispositivo"],
              ["brewmaster/{deviceId}/alarms",    "Alarmes gerados pelo dispositivo"],
              ["brewmaster/{deviceId}/events",    "Eventos de produção"],
              ["brewmaster/{deviceId}/firmware",  "Notificações de atualização OTA"],
              ["brewmaster/{deviceId}/logs",      "Logs do dispositivo"],
            ].map(([topic, desc]) => (
              <div key={topic} className="flex flex-col gap-0.5">
                <code className="text-[11px] font-mono text-primary">{topic}</code>
                <span className="text-[11px] text-muted-foreground">{desc}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Message log */}
      <Card className="bg-sidebar border-border/50">
        <CardHeader className="pb-2 px-4 pt-4">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-sm">Log de Mensagens</CardTitle>
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Filtrar por Device ID..."
                value={deviceFilter}
                onChange={(e) => setDeviceFilter(e.target.value)}
                className="h-7 text-xs w-48"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {isLoading ? (
            <div className="text-muted-foreground text-sm">Carregando...</div>
          ) : !messages?.length ? (
            <div className="text-muted-foreground text-sm">Nenhuma mensagem registrada ainda.</div>
          ) : (
            <div className="space-y-1 max-h-[500px] overflow-y-auto font-mono">
              {messages.map((m) => (
                <div key={m.id} className="flex items-start gap-2 text-[11px] border-b border-border/30 py-1.5">
                  <span className="text-muted-foreground shrink-0 w-28">
                    {format(new Date(m.timestamp), "HH:mm:ss.SSS")}
                  </span>
                  {m.direction === "inbound" ? (
                    <ArrowDown className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <ArrowUp className="w-3 h-3 text-blue-400 shrink-0 mt-0.5" />
                  )}
                  <code className="text-primary truncate flex-1">{m.topic}</code>
                  {m.deviceIdentifier && (
                    <span className="text-yellow-400 shrink-0">{m.deviceIdentifier}</span>
                  )}
                  <span className="text-muted-foreground truncate max-w-[200px]">{m.payload ?? ""}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
