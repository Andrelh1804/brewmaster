import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  useListDevices,
  useGetDeviceTelemetry,
  getListDevicesQueryKey,
} from "@workspace/api-client-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import { Activity } from "lucide-react";
import { format } from "date-fns";

const METRICS = [
  { key: "temperature",  label: "Temperatura (°C)",  color: "#f97316", unit: "°C" },
  { key: "pressure",     label: "Pressão (bar)",      color: "#3b82f6", unit: "bar" },
  { key: "ph",           label: "pH",                 color: "#a855f7", unit: "" },
  { key: "flow",         label: "Vazão (L/h)",        color: "#06b6d4", unit: "L/h" },
  { key: "density",      label: "Densidade",          color: "#eab308", unit: "" },
] as const;

export default function TelemetryViewer() {
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");

  const { data: devices } = useListDevices({ query: { queryKey: getListDevicesQueryKey() } });

  const deviceId = selectedDeviceId ? Number(selectedDeviceId) : undefined;

  const { data: telemetry, isLoading } = useGetDeviceTelemetry(
    deviceId ?? 0,
    { limit: 100 },
    {
      query: {
        enabled: !!deviceId,
        refetchInterval: 5000,
        queryKey: ["/api/devices", deviceId, "telemetry"],
      },
    },
  );

  // Transform for Recharts (oldest first)
  const chartData = [...(telemetry ?? [])].reverse().map((t) => ({
    time: format(new Date(t.timestamp), "HH:mm:ss"),
    temperature: t.temperature ?? null,
    pressure: t.pressure ?? null,
    ph: t.ph ?? null,
    flow: t.flow ?? null,
    density: t.density ?? null,
  }));

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Activity className="w-7 h-7 text-primary" /> Telemetria
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Gráficos de sensores em tempo real por dispositivo</p>
        </div>
        <Select value={selectedDeviceId} onValueChange={setSelectedDeviceId}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Selecionar dispositivo..." />
          </SelectTrigger>
          <SelectContent>
            {(devices ?? []).map((d) => (
              <SelectItem key={d.id} value={String(d.id)}>
                {d.name} — {d.deviceId}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!selectedDeviceId ? (
        <Card className="border-dashed border-border/50 bg-sidebar/50">
          <CardContent className="p-12 text-center text-muted-foreground">
            Selecione um dispositivo para visualizar a telemetria.
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="text-muted-foreground">Carregando telemetria...</div>
      ) : !chartData.length ? (
        <Card className="border-dashed border-border/50 bg-sidebar/50">
          <CardContent className="p-12 text-center text-muted-foreground">
            Nenhum dado de telemetria ainda. Inicie o simulador ESP32 para gerar dados.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {METRICS.map(({ key, label, color }) => (
            <Card key={key} className="bg-sidebar border-border/50">
              <CardHeader className="pb-2 px-4 pt-4">
                <CardTitle className="text-sm">{label}</CardTitle>
              </CardHeader>
              <CardContent className="px-2 pb-4">
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="time" tick={{ fontSize: 9, fill: "#6b7280" }} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 9, fill: "#6b7280" }} />
                    <Tooltip
                      contentStyle={{ background: "#1e2025", border: "1px solid #374151", fontSize: 11 }}
                      labelStyle={{ color: "#9ca3af" }}
                    />
                    <Line
                      type="monotone"
                      dataKey={key}
                      stroke={color}
                      strokeWidth={2}
                      dot={false}
                      connectNulls
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          ))}

          {/* Latest reading table */}
          {telemetry && telemetry.length > 0 && (
            <Card className="bg-sidebar border-border/50">
              <CardHeader className="pb-2 px-4 pt-4">
                <CardTitle className="text-sm">Leitura Mais Recente</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    ["Temperatura",   `${telemetry[0]!.temperature?.toFixed(2) ?? "—"} °C`],
                    ["Pressão",       `${telemetry[0]!.pressure?.toFixed(3) ?? "—"} bar`],
                    ["pH",            `${telemetry[0]!.ph?.toFixed(2) ?? "—"}`],
                    ["Vazão",         `${telemetry[0]!.flow?.toFixed(1) ?? "—"} L/h`],
                    ["Volume",        `${telemetry[0]!.volume?.toFixed(1) ?? "—"} L`],
                    ["Densidade",     `${telemetry[0]!.density?.toFixed(4) ?? "—"}`],
                    ["Bomba",         telemetry[0]!.pumpState ? "Ligada" : "Desligada"],
                    ["Válvula",       telemetry[0]!.valveState ? "Aberta" : "Fechada"],
                    ["Resistência",   telemetry[0]!.resistanceState ? "Ligada" : "Desligada"],
                    ["RSSI",          `${telemetry[0]!.rssi ?? "—"} dBm`],
                    ["Heap",          `${telemetry[0]!.heap ? Math.round(telemetry[0]!.heap / 1024) : "—"} KB`],
                    ["Uptime",        `${telemetry[0]!.uptime ?? "—"} s`],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between border-b border-border/20 pb-1">
                      <span className="text-muted-foreground">{k}</span>
                      <span className="font-mono font-medium">{v}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
