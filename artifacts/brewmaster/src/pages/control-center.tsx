import { useState } from "react";
import {
  useListActuators,
  useToggleActuator,
  useListSensors,
  useListEquipment,
  useSimulatorTick,
  getListActuatorsQueryKey,
  getListSensorsQueryKey,
  getListEquipmentQueryKey,
  Actuator,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Gauge,
  Power,
  Settings2,
  AlertTriangle,
  RefreshCw,
  Thermometer,
  Droplets,
  Wind,
  Activity,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const ACTUATOR_TYPE_ICONS: Record<string, React.ReactNode> = {
  heater:   <Thermometer className="w-4 h-4" />,
  pump:     <Droplets className="w-4 h-4" />,
  valve:    <Activity className="w-4 h-4" />,
  agitator: <RefreshCw className="w-4 h-4" />,
  cooler:   <Wind className="w-4 h-4" />,
  fan:      <Wind className="w-4 h-4" />,
  light:    <Zap className="w-4 h-4" />,
};

const ACTUATOR_TYPE_LABELS: Record<string, string> = {
  heater:   "Resistência",
  pump:     "Bomba",
  valve:    "Válvula",
  agitator: "Agitador",
  cooler:   "Resfriador",
  fan:      "Ventilador",
  light:    "Iluminação",
};

type ControlMode = "auto" | "manual";

export default function ControlCenter() {
  const { data: actuators, isLoading: loadingActuators } = useListActuators({ query: { refetchInterval: 3000, queryKey: getListActuatorsQueryKey() } });
  const { data: sensors } = useListSensors({ query: { refetchInterval: 3000, queryKey: getListSensorsQueryKey() } });
  const { data: equipment } = useListEquipment({ query: { refetchInterval: 5000, queryKey: getListEquipmentQueryKey() } });
  const toggleActuator = useToggleActuator();
  const simulatorTick = useSimulatorTick();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [modes, setModes] = useState<Record<number, ControlMode>>({});
  const [simRunning, setSimRunning] = useState(false);

  const getMode = (id: number): ControlMode => modes[id] ?? "manual";
  const setMode = (id: number, mode: ControlMode) => setModes((m) => ({ ...m, [id]: mode }));

  const handleToggle = async (actuator: Actuator) => {
    try {
      await toggleActuator.mutateAsync({ id: actuator.id });
      queryClient.invalidateQueries({ queryKey: ["/api/actuators"] });
      toast({
        title: `${actuator.name} ${actuator.isOn ? "desligado" : "ligado"}`,
        description: `Atuador ${actuator.isOn ? "OFF" : "ON"}`,
      });
    } catch {
      toast({ title: "Erro ao acionar", variant: "destructive" });
    }
  };

  const handleSimTick = async () => {
    setSimRunning(true);
    try {
      await simulatorTick.mutateAsync();
      queryClient.invalidateQueries({ queryKey: ["/api/sensors"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: "Simulação avançada", description: "Valores dos sensores atualizados." });
    } catch {
      toast({ title: "Erro na simulação", variant: "destructive" });
    } finally {
      setSimRunning(false);
    }
  };

  const onActuators = actuators?.filter((a) => a.isOn) ?? [];
  const offActuators = actuators?.filter((a) => !a.isOn) ?? [];

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Settings2 className="w-7 h-7 text-primary" />
            Centro de Controle
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Painel de comando industrial</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-emerald-800 text-emerald-100">{onActuators.length} ativos</Badge>
          <Badge variant="secondary">{offActuators.length} inativos</Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSimTick}
            disabled={simRunning}
            className="gap-2"
          >
            <RefreshCw className={cn("w-4 h-4", simRunning && "animate-spin")} />
            Simular Tick
          </Button>
        </div>
      </div>

      {/* System Status Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="bg-sidebar border-border/50">
          <CardContent className="p-3 flex items-center gap-3">
            <Power className="w-5 h-5 text-primary" />
            <div>
              <div className="text-xs text-muted-foreground">Atuadores ON</div>
              <div className="text-xl font-bold text-emerald-400">{onActuators.length}</div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-sidebar border-border/50">
          <CardContent className="p-3 flex items-center gap-3">
            <Gauge className="w-5 h-5 text-amber-400" />
            <div>
              <div className="text-xs text-muted-foreground">Sensores</div>
              <div className="text-xl font-bold">{sensors?.length ?? 0}</div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-sidebar border-border/50">
          <CardContent className="p-3 flex items-center gap-3">
            <Activity className="w-5 h-5 text-blue-400" />
            <div>
              <div className="text-xs text-muted-foreground">Equipamentos</div>
              <div className="text-xl font-bold">{equipment?.filter(e => e.connected).length ?? 0}</div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-sidebar border-border/50">
          <CardContent className="p-3 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            <div>
              <div className="text-xs text-muted-foreground">Alertas</div>
              <div className="text-xl font-bold text-destructive">
                {sensors?.filter(s => s.status !== "normal").length ?? 0}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="actuators">
        <TabsList className="bg-sidebar border border-border/50">
          <TabsTrigger value="actuators">Atuadores</TabsTrigger>
          <TabsTrigger value="sensors">Sensores</TabsTrigger>
          <TabsTrigger value="equipment">Equipamentos</TabsTrigger>
        </TabsList>

        {/* Actuators Tab */}
        <TabsContent value="actuators" className="mt-4">
          {loadingActuators ? (
            <div className="text-muted-foreground text-sm">Carregando...</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {actuators?.map((actuator) => {
                const mode = getMode(actuator.id);
                return (
                  <Card
                    key={actuator.id}
                    className={cn(
                      "border-2 transition-all duration-300",
                      actuator.isOn
                        ? "border-emerald-600 bg-emerald-950/30"
                        : "border-border/50 bg-sidebar"
                    )}
                  >
                    <CardHeader className="pb-2 px-4 pt-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={cn("p-1.5 rounded-md", actuator.isOn ? "bg-emerald-800 text-emerald-200" : "bg-sidebar-accent text-muted-foreground")}>
                            {ACTUATOR_TYPE_ICONS[actuator.type]}
                          </span>
                          <div>
                            <CardTitle className="text-sm font-bold">{actuator.name}</CardTitle>
                            <div className="text-[10px] text-muted-foreground uppercase">
                              {ACTUATOR_TYPE_LABELS[actuator.type] ?? actuator.type}
                            </div>
                          </div>
                        </div>
                        <Switch
                          checked={actuator.isOn}
                          onCheckedChange={() => handleToggle(actuator)}
                          className={actuator.isOn ? "data-[state=checked]:bg-emerald-500" : ""}
                        />
                      </div>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "text-xs px-2 py-0.5 rounded-full font-bold uppercase",
                            actuator.isOn
                              ? "bg-emerald-900 text-emerald-300"
                              : "bg-sidebar-accent text-muted-foreground"
                          )}>
                            {actuator.isOn ? "● LIGADO" : "○ DESLIGADO"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-muted-foreground">Modo:</span>
                          <button
                            onClick={() => setMode(actuator.id, mode === "auto" ? "manual" : "auto")}
                            className={cn(
                              "text-[10px] px-2 py-0.5 rounded border font-bold uppercase transition-colors",
                              mode === "auto"
                                ? "border-primary text-primary bg-primary/10"
                                : "border-border text-muted-foreground"
                            )}
                          >
                            {mode === "auto" ? "AUTO" : "MANUAL"}
                          </button>
                        </div>
                      </div>
                      {actuator.equipmentName && (
                        <div className="mt-2 text-[10px] text-muted-foreground">
                          Equipamento: <span className="text-foreground">{actuator.equipmentName}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Sensors Tab */}
        <TabsContent value="sensors" className="mt-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {sensors?.map((sensor) => (
              <Card
                key={sensor.id}
                className={cn(
                  "border transition-all",
                  sensor.status === "critical" ? "border-destructive bg-red-950/20" :
                  sensor.status === "warning"  ? "border-amber-600 bg-amber-950/20" :
                  "border-border/50 bg-sidebar"
                )}
              >
                <CardContent className="p-3">
                  <div className="flex justify-between items-start mb-1">
                    <div className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider truncate">
                      {sensor.name}
                    </div>
                    <div className={cn(
                      "h-2 w-2 rounded-full shrink-0",
                      sensor.status === "critical" ? "bg-destructive animate-pulse" :
                      sensor.status === "warning"  ? "bg-amber-400 animate-pulse" :
                      sensor.status === "offline"  ? "bg-slate-500" : "bg-emerald-500"
                    )} />
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className={cn(
                      "text-2xl font-mono font-bold",
                      sensor.status === "critical" ? "text-destructive" :
                      sensor.status === "warning"  ? "text-amber-400" : "text-foreground"
                    )}>
                      {sensor.currentValue.toFixed(2)}
                    </span>
                    <span className="text-xs text-muted-foreground">{sensor.unit}</span>
                  </div>
                  <div className="mt-1 text-[10px] text-muted-foreground uppercase">{sensor.type}</div>
                  {(sensor.minThreshold !== null || sensor.maxThreshold !== null) && (
                    <div className="mt-1.5 text-[10px] text-muted-foreground flex gap-2">
                      {sensor.minThreshold !== null && <span>Min: {sensor.minThreshold}</span>}
                      {sensor.maxThreshold !== null && <span>Max: {sensor.maxThreshold}</span>}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Equipment Tab */}
        <TabsContent value="equipment" className="mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {equipment?.map((equip) => (
              <Card
                key={equip.id}
                className={cn(
                  "border-2 transition-all",
                  equip.status === "error"       ? "border-destructive bg-red-950/20" :
                  equip.status === "maintenance" ? "border-amber-600 bg-amber-950/20" :
                  equip.connected               ? "border-emerald-600 bg-emerald-950/20" :
                  "border-border/50 bg-sidebar"
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-bold text-sm">{equip.name}</div>
                    <Badge
                      variant={equip.connected ? "success" : "secondary"}
                      className="text-[10px]"
                    >
                      {equip.connected ? "● Conectado" : "○ Offline"}
                    </Badge>
                  </div>
                  <div className="text-[10px] text-muted-foreground uppercase">{equip.type.replace("_", " ")}</div>
                  {equip.location && (
                    <div className="mt-1 text-[10px] text-muted-foreground">📍 {equip.location}</div>
                  )}
                  {equip.firmwareVersion && (
                    <div className="mt-1 text-[10px] text-muted-foreground">FW: {equip.firmwareVersion}</div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
