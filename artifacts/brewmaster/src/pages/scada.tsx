import {
  useGetScadaState,
  useGetDashboardSensorSummary,
  getGetScadaStateQueryKey,
  getGetDashboardSensorSummaryQueryKey,
} from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

type EquipmentState = "off" | "running" | "waiting" | "cooling" | "fault";

const STATE_STYLES: Record<EquipmentState, { bg: string; border: string; label: string; dot: string }> = {
  off:     { bg: "bg-slate-800",   border: "border-slate-600",   label: "Desligado",    dot: "bg-slate-500" },
  running: { bg: "bg-emerald-950", border: "border-emerald-500", label: "Funcionando",  dot: "bg-emerald-400 animate-pulse" },
  waiting: { bg: "bg-amber-950",   border: "border-amber-500",   label: "Aguardando",   dot: "bg-amber-400 animate-pulse" },
  cooling: { bg: "bg-blue-950",    border: "border-blue-500",    label: "Resfriando",   dot: "bg-blue-400 animate-pulse" },
  fault:   { bg: "bg-red-950",     border: "border-red-500",     label: "Falha",        dot: "bg-red-400 animate-pulse" },
};

const EQUIPMENT_ICONS: Record<string, string> = {
  hlt:       "🪣",
  mash_tun:  "🫙",
  kettle:    "🪣",
  fermenter: "🧪",
  chiller:   "❄️",
  pump:      "⚙️",
  valve:     "🔧",
  co2_tank:  "💨",
  other:     "📦",
};

const SCADA_FLOW = [
  { key: "hlt",       label: "Tanque HLT",   desc: "Aquecimento de água" },
  { key: "mash_tun",  label: "Mosturador",   desc: "Sacarificação" },
  { key: "mash_tun",  label: "Recirculação", desc: "Filtragem vorlauf" },
  { key: "mash_tun",  label: "Filtro",       desc: "Clarificação" },
  { key: "kettle",    label: "Fervura",      desc: "Isomerização" },
  { key: "kettle",    label: "Whirlpool",    desc: "Decantação" },
  { key: "chiller",   label: "Chiller",      desc: "Resfriamento" },
  { key: "fermenter", label: "Fermentador",  desc: "Fermentação" },
  { key: "fermenter", label: "Maturador",    desc: "Maturação" },
  { key: "other",     label: "Envase",       desc: "Carbonatação" },
];

const STAGE_ORDER = ["mashing", "boiling", "whirlpool", "cooling", "fermentation", "maturation", "cip", "done"];

function getActiveFlowIndex(stage: string | null): number {
  if (!stage) return -1;
  const s = stage.toLowerCase();
  if (s === "mashing") return 3;
  if (s === "boiling") return 4;
  if (s === "whirlpool") return 5;
  if (s === "cooling") return 6;
  if (s === "fermentation") return 7;
  if (s === "maturation") return 8;
  return -1;
}

export default function Scada() {
  const { data: scada, isLoading } = useGetScadaState({ query: { refetchInterval: 3000, queryKey: getGetScadaStateQueryKey() } });
  const { data: sensors } = useGetDashboardSensorSummary({ query: { refetchInterval: 5000, queryKey: getGetDashboardSensorSummaryQueryKey() } });

  const activeFlowIndex = getActiveFlowIndex(scada?.activeStage ?? null);

  // Map equipment types to their state from the API
  const getEquipStateByType = (type: string): EquipmentState => {
    if (!scada?.equipment) return "off";
    const equip = scada.equipment.find((e) => e.type === type);
    return (equip?.state as EquipmentState) ?? "off";
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Activity className="w-7 h-7 text-primary" />
            SCADA — Fluxograma Industrial
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Supervisão e controle do processo em tempo real</p>
        </div>
        <div className="flex items-center gap-2">
          {scada?.activeStage ? (
            <Badge className="bg-emerald-600 text-white uppercase tracking-wider">
              ▶ Etapa: {scada.activeStage}
            </Badge>
          ) : (
            <Badge variant="secondary" className="uppercase tracking-wider">Sem produção ativa</Badge>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        {Object.entries(STATE_STYLES).map(([state, style]) => (
          <div key={state} className="flex items-center gap-2">
            <span className={cn("h-2.5 w-2.5 rounded-full", style.dot.replace(" animate-pulse", ""))} />
            <span className="text-muted-foreground">{style.label}</span>
          </div>
        ))}
      </div>

      {/* Flowchart */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          <span className="animate-pulse">Carregando estado SCADA...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Main flow */}
          <div className="col-span-1 lg:col-span-2">
            <div className="flex flex-wrap gap-0 items-center justify-center">
              {SCADA_FLOW.map((node, i) => {
                const equip = scada?.equipment?.find((e) => e.type === node.key);
                const state: EquipmentState = (equip?.state as EquipmentState) ?? "off";
                const styles = STATE_STYLES[state];
                const isActiveFlow = i <= activeFlowIndex;
                const isCurrent = i === activeFlowIndex;

                return (
                  <div key={i} className="flex items-center">
                    {/* Node */}
                    <div className={cn(
                      "relative flex flex-col items-center justify-center rounded-xl border-2 p-4 w-28 h-32 transition-all duration-500",
                      styles.bg, styles.border,
                      isCurrent && "scale-110 shadow-lg shadow-emerald-500/20",
                      isActiveFlow && !isCurrent && "opacity-90"
                    )}>
                      {/* Status dot */}
                      <div className={cn("absolute top-2 right-2 h-2.5 w-2.5 rounded-full", styles.dot)} />
                      {/* Icon */}
                      <span className="text-2xl mb-1">{EQUIPMENT_ICONS[node.key]}</span>
                      {/* Label */}
                      <div className="text-center">
                        <div className="text-xs font-bold text-foreground leading-tight">{node.label}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">{node.desc}</div>
                      </div>
                      {/* Sensor value */}
                      {equip?.temperature !== null && equip?.temperature !== undefined && (
                        <div className="absolute bottom-2 left-0 right-0 text-center text-[10px] font-mono text-primary font-bold">
                          {equip.temperature.toFixed(1)}°C
                        </div>
                      )}
                    </div>

                    {/* Arrow */}
                    {i < SCADA_FLOW.length - 1 && (
                      <div className={cn(
                        "w-6 h-0.5 mx-1 transition-colors duration-500",
                        isActiveFlow && i < activeFlowIndex ? "bg-emerald-500" : "bg-border"
                      )}>
                        <div className={cn(
                          "w-0 h-0 ml-auto border-l-4 border-y-2 border-y-transparent -mt-[3px]",
                          isActiveFlow && i < activeFlowIndex ? "border-l-emerald-500" : "border-l-border"
                        )} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Equipment detail cards */}
      <div>
        <h2 className="text-lg font-semibold tracking-tight mb-3">Estado dos Equipamentos</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {scada?.equipment?.map((equip) => {
            const state = equip.state as EquipmentState;
            const styles = STATE_STYLES[state];
            return (
              <Card key={equip.id} className={cn("border transition-all duration-300", styles.bg, styles.border)}>
                <CardContent className="p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <span className={cn("h-2 w-2 rounded-full shrink-0", styles.dot)} />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{styles.label}</span>
                    </div>
                    <span className="text-base">{EQUIPMENT_ICONS[equip.type]}</span>
                  </div>
                  <div className="text-sm font-bold text-foreground truncate">{equip.name}</div>
                  <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] font-mono">
                    {equip.temperature !== null && equip.temperature !== undefined && (
                      <div className="text-amber-400">🌡 {equip.temperature.toFixed(1)}°C</div>
                    )}
                    {equip.pressure !== null && equip.pressure !== undefined && (
                      <div className="text-blue-400">⬆ {equip.pressure.toFixed(2)} bar</div>
                    )}
                    {equip.level !== null && equip.level !== undefined && (
                      <div className="text-cyan-400">💧 {equip.level.toFixed(1)}%</div>
                    )}
                    {equip.flow !== null && equip.flow !== undefined && (
                      <div className="text-emerald-400">↻ {equip.flow.toFixed(1)} L/h</div>
                    )}
                    {equip.ph !== null && equip.ph !== undefined && (
                      <div className="text-purple-400">⚗ pH {equip.ph.toFixed(2)}</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Live sensor strip */}
      {sensors && sensors.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold tracking-tight mb-3">Sensores ao Vivo</h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
            {sensors.map((s) => (
              <div key={s.sensorId} className="bg-sidebar rounded-lg border border-border/50 p-2 text-center">
                <div className="text-[10px] text-muted-foreground uppercase truncate mb-1">{s.sensorName}</div>
                <div className={cn(
                  "text-lg font-mono font-bold",
                  s.status === "critical" ? "text-destructive" :
                  s.status === "warning" ? "text-amber-400" : "text-foreground"
                )}>
                  {s.value.toFixed(1)}
                  <span className="text-[10px] text-muted-foreground ml-0.5">{s.unit}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
