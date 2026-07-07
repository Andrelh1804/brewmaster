import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  useListDevices,
  useGetMqttStatus,
  useGetEsp32SimulatorStatus,
  useStartEsp32Simulator,
  useStopEsp32Simulator,
  getListDevicesQueryKey,
  getGetMqttStatusQueryKey,
  getGetEsp32SimulatorStatusQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Wifi, WifiOff, Play, Square, Activity, Radio,
  Cpu, Thermometer, Droplets, Gauge, Zap, RefreshCw,
  TrendingUp, Server,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const STATUS_STYLES: Record<string, { dot: string; badge: string; label: string }> = {
  online:  { dot: "bg-emerald-400 animate-pulse", badge: "border-emerald-500/40 text-emerald-400", label: "Online" },
  offline: { dot: "bg-slate-500",                 badge: "border-slate-500/40 text-slate-400",     label: "Offline" },
  error:   { dot: "bg-red-400 animate-pulse",     badge: "border-red-500/40 text-red-400",         label: "Erro" },
  unknown: { dot: "bg-yellow-400",                badge: "border-yellow-500/40 text-yellow-400",   label: "Desconhecido" },
};

interface WsMessage {
  type: string;
  deviceId?: string;
  topic?: string;
  payload?: string;
  data?: Record<string, unknown>;
  ts?: number;
}

export default function IotDashboard() {
  const queryClient = useQueryClient();
  const [wsMessages, setWsMessages] = useState<WsMessage[]>([]);
  const [wsConnected, setWsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  const { data: devices } = useListDevices({ query: { refetchInterval: 5000, queryKey: getListDevicesQueryKey() } });
  const { data: mqttStatus } = useGetMqttStatus({ query: { refetchInterval: 3000, queryKey: getGetMqttStatusQueryKey() } });
  const { data: simStatus } = useGetEsp32SimulatorStatus({ query: { refetchInterval: 3000, queryKey: getGetEsp32SimulatorStatusQueryKey() } });
  const startSim = useStartEsp32Simulator();
  const stopSim = useStopEsp32Simulator();

  // WebSocket for real-time events
  useEffect(() => {
    const base = window.location.origin.replace(/^http/, "ws");
    const ws = new WebSocket(`${base}/ws`);
    wsRef.current = ws;

    ws.onopen = () => setWsConnected(true);
    ws.onclose = () => setWsConnected(false);
    ws.onerror = () => setWsConnected(false);
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data) as WsMessage;
        setWsMessages((prev) => [msg, ...prev].slice(0, 50));
        if (msg.type === "device_connected" || msg.type === "device_disconnected") {
          queryClient.invalidateQueries({ queryKey: ["/api/devices"] });
        }
        if (msg.type === "mqtt_message" || msg.type === "telemetry") {
          queryClient.invalidateQueries({ queryKey: ["/api/mqtt/status"] });
        }
      } catch { /* ok */ }
    };

    return () => { ws.close(); };
  }, [queryClient]);

  const handleStartSim = async () => {
    await startSim.mutateAsync({ data: { tickIntervalMs: 5000 } });
    queryClient.invalidateQueries({ queryKey: ["/api/simulator/esp32/status"] });
  };

  const handleStopSim = async () => {
    await stopSim.mutateAsync();
    queryClient.invalidateQueries({ queryKey: ["/api/simulator/esp32/status"] });
  };

  const online  = devices?.filter((d) => d.status === "online").length  ?? 0;
  const offline = devices?.filter((d) => d.status !== "online").length  ?? 0;

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Radio className="w-7 h-7 text-primary" />
            Painel IoT
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Infraestrutura MQTT · Dispositivos ESP32 · Telemetria em tempo real
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={cn("gap-1.5", wsConnected ? "border-emerald-500/40 text-emerald-400" : "border-slate-500/40 text-slate-400")}>
            <span className={cn("h-1.5 w-1.5 rounded-full", wsConnected ? "bg-emerald-400 animate-pulse" : "bg-slate-500")} />
            {wsConnected ? "WS Conectado" : "WS Desconectado"}
          </Badge>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Dispositivos Online",  value: online,                                icon: Wifi,     color: "text-emerald-400" },
          { label: "Dispositivos Offline", value: offline,                               icon: WifiOff,  color: "text-slate-400" },
          { label: "Clientes MQTT",        value: mqttStatus?.clientCount ?? 0,          icon: Radio,    color: "text-blue-400" },
          { label: "Mensagens MQTT",       value: mqttStatus?.totalMessages ?? 0,        icon: Activity, color: "text-yellow-400" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="bg-sidebar border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">{label}</span>
                <Icon className={cn("w-4 h-4", color)} />
              </div>
              <div className="text-2xl font-bold tabular-nums">{value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Device list */}
        <div className="lg:col-span-2 space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
            Dispositivos Registrados
          </h2>
          {!devices?.length ? (
            <Card className="border-dashed border-border/50 bg-sidebar/50">
              <CardContent className="p-8 text-center text-muted-foreground text-sm">
                Nenhum dispositivo registrado. Vá para Dispositivos IoT para cadastrar.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {devices.map((d) => {
                const s = STATUS_STYLES[d.status] ?? STATUS_STYLES["unknown"]!;
                return (
                  <Card key={d.id} className="bg-sidebar border-border/50">
                    <CardContent className="p-3 flex items-center gap-3">
                      <span className={cn("h-2.5 w-2.5 rounded-full shrink-0", s.dot)} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm truncate">{d.name}</span>
                          <code className="text-[10px] text-muted-foreground font-mono">{d.deviceId}</code>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                          {d.ipAddress && <span>IP: {d.ipAddress}</span>}
                          {d.rssi != null && <span>RSSI: {d.rssi} dBm</span>}
                          {d.firmwareVersion && <span>FW: {d.firmwareVersion}</span>}
                          {d.lastHeartbeat && <span>↑ {format(new Date(d.lastHeartbeat), "HH:mm:ss")}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs shrink-0">
                        <span className="text-muted-foreground">↑{d.uplinkCount}</span>
                        <span className="text-muted-foreground">↓{d.downlinkCount}</span>
                        <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0.5", s.badge)}>
                          {s.label}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* MQTT Broker */}
          <Card className="bg-sidebar border-border/50">
            <CardHeader className="pb-2 px-4 pt-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <Server className="w-4 h-4 text-primary" /> Broker MQTT
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-2 text-xs">
              {[
                { label: "Status",       value: mqttStatus?.running ? "Rodando" : "Parado" },
                { label: "Clientes",     value: mqttStatus?.clientCount ?? 0 },
                { label: "↑ Uplink",    value: mqttStatus?.uplinkMessages ?? 0 },
                { label: "↓ Downlink",  value: mqttStatus?.downlinkMessages ?? 0 },
                { label: "Uptime",      value: `${mqttStatus?.uptime ?? 0}s` },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-mono font-medium">{value}</span>
                </div>
              ))}
              {(mqttStatus?.connectedDevices?.length ?? 0) > 0 && (
                <div>
                  <span className="text-muted-foreground">Conectados:</span>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {mqttStatus!.connectedDevices!.map((id) => (
                      <code key={id} className="text-[10px] bg-muted/30 px-1.5 py-0.5 rounded">{id}</code>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ESP32 Simulator */}
          <Card className="bg-sidebar border-border/50">
            <CardHeader className="pb-2 px-4 pt-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <Cpu className="w-4 h-4 text-primary" /> Simulador ESP32
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  { label: "Status",      value: simStatus?.running ? "Rodando" : "Parado" },
                  { label: "Dispositivos", value: simStatus?.deviceCount ?? 0 },
                  { label: "Intervalo",   value: `${(simStatus?.tickIntervalMs ?? 5000) / 1000}s` },
                  { label: "Ticks",       value: simStatus?.totalTicks ?? 0 },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <div className="text-muted-foreground">{label}</div>
                    <div className="font-mono font-semibold">{value}</div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1 gap-1.5 text-xs"
                  onClick={handleStartSim}
                  disabled={simStatus?.running || startSim.isPending}
                >
                  <Play className="w-3 h-3" /> Iniciar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 gap-1.5 text-xs"
                  onClick={handleStopSim}
                  disabled={!simStatus?.running || stopSim.isPending}
                >
                  <Square className="w-3 h-3" /> Parar
                </Button>
              </div>
              {simStatus?.devices && simStatus.devices.length > 0 && (
                <div className="space-y-1">
                  {simStatus.devices.map((d) => (
                    <div key={d.deviceId} className="flex items-center justify-between text-xs">
                      <code className="text-muted-foreground font-mono">{d.deviceId}</code>
                      <span className={d.status === "connected" ? "text-emerald-400" : "text-slate-400"}>
                        {d.status === "connected" ? "●" : "○"} {d.name}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Live event feed */}
          <Card className="bg-sidebar border-border/50">
            <CardHeader className="pb-2 px-4 pt-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" /> Feed ao Vivo
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {wsMessages.length === 0 ? (
                <p className="text-xs text-muted-foreground">Aguardando eventos MQTT...</p>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {wsMessages.slice(0, 20).map((m, i) => (
                    <div key={i} className="text-[10px] font-mono text-muted-foreground truncate">
                      <span className="text-primary">{m.type}</span>
                      {m.deviceId && <span className="text-yellow-400"> {m.deviceId}</span>}
                      {m.topic && <span> {m.topic}</span>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
