import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  useListDevices,
  useListDeviceCommands,
  useSendDeviceCommand,
  getListDevicesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Terminal, Send, CheckCircle, Clock, XCircle, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const COMMANDS = [
  { value: "start_production",  label: "▶ Iniciar Produção" },
  { value: "pause",             label: "⏸ Pausar" },
  { value: "resume",            label: "▶ Continuar" },
  { value: "cancel",            label: "⏹ Cancelar" },
  { value: "pump_on",           label: "💧 Ligar Bomba" },
  { value: "pump_off",          label: "💧 Desligar Bomba" },
  { value: "valve_open",        label: "🔧 Abrir Válvula" },
  { value: "valve_close",       label: "🔧 Fechar Válvula" },
  { value: "resistance_on",     label: "🌡 Ligar Resistência" },
  { value: "resistance_off",    label: "🌡 Desligar Resistência" },
  { value: "restart",           label: "🔄 Reiniciar Dispositivo" },
  { value: "ota_update",        label: "⬆ Solicitar OTA" },
  { value: "sync",              label: "🔃 Sincronizar" },
] as const;

const STATUS_ICON: Record<string, React.ReactNode> = {
  pending:      <Clock className="w-3.5 h-3.5 text-yellow-400" />,
  sent:         <Clock className="w-3.5 h-3.5 text-blue-400" />,
  acknowledged: <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />,
  failed:       <XCircle className="w-3.5 h-3.5 text-red-400" />,
  timeout:      <AlertCircle className="w-3.5 h-3.5 text-orange-400" />,
};

const STATUS_LABEL: Record<string, string> = {
  pending:      "Pendente",
  sent:         "Enviado",
  acknowledged: "Confirmado",
  failed:       "Falhou",
  timeout:      "Timeout",
};

export default function CommandCenter() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [selectedCommand, setSelectedCommand] = useState<string>("");

  const { data: devices } = useListDevices({ query: { queryKey: getListDevicesQueryKey() } });

  const deviceId = selectedDeviceId ? Number(selectedDeviceId) : undefined;

  const { data: commands, isLoading } = useListDeviceCommands(
    deviceId ?? 0,
    { query: { enabled: !!deviceId, refetchInterval: 5000, queryKey: ["/api/devices", deviceId, "commands"] } },
  );

  const sendCmd = useSendDeviceCommand();

  const handleSend = async () => {
    if (!deviceId || !selectedCommand) return;
    try {
      await sendCmd.mutateAsync({ id: deviceId, data: { command: selectedCommand as never } });
      queryClient.invalidateQueries({ queryKey: ["/api/devices", deviceId, "commands"] });
      toast({ title: "Comando enviado", description: `${selectedCommand} → dispositivo ${deviceId}` });
    } catch {
      toast({ title: "Erro ao enviar comando", variant: "destructive" });
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
          <Terminal className="w-7 h-7 text-primary" /> Gerenciador de Comandos
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Envie comandos aos dispositivos via MQTT e acompanhe as respostas</p>
      </div>

      {/* Send command panel */}
      <Card className="bg-sidebar border-border/50">
        <CardHeader className="pb-2 px-4 pt-4">
          <CardTitle className="text-sm">Enviar Comando</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1.5 flex-1 min-w-[200px]">
              <label className="text-xs text-muted-foreground">Dispositivo</label>
              <Select value={selectedDeviceId} onValueChange={setSelectedDeviceId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar dispositivo..." />
                </SelectTrigger>
                <SelectContent>
                  {(devices ?? []).map((d) => (
                    <SelectItem key={d.id} value={String(d.id)}>
                      <span className={cn("mr-2", d.status === "online" ? "text-emerald-400" : "text-slate-400")}>●</span>
                      {d.name} ({d.deviceId})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 flex-1 min-w-[200px]">
              <label className="text-xs text-muted-foreground">Comando</label>
              <Select value={selectedCommand} onValueChange={setSelectedCommand}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar comando..." />
                </SelectTrigger>
                <SelectContent>
                  {COMMANDS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleSend}
              disabled={!selectedDeviceId || !selectedCommand || sendCmd.isPending}
              className="gap-2"
            >
              <Send className="w-4 h-4" /> Enviar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Command history */}
      {!selectedDeviceId ? (
        <Card className="border-dashed border-border/50 bg-sidebar/50">
          <CardContent className="p-8 text-center text-muted-foreground text-sm">
            Selecione um dispositivo para ver o histórico de comandos.
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="text-muted-foreground">Carregando...</div>
      ) : !commands?.length ? (
        <Card className="border-dashed border-border/50 bg-sidebar/50">
          <CardContent className="p-8 text-center text-muted-foreground text-sm">
            Nenhum comando enviado para este dispositivo ainda.
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-sidebar border-border/50">
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="text-sm">Histórico de Comandos</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {[...commands].reverse().map((cmd) => (
                <div key={cmd.id} className="flex items-start gap-3 border border-border/40 rounded-lg p-3">
                  <div className="mt-0.5">{STATUS_ICON[cmd.status] ?? <Clock className="w-3.5 h-3.5" />}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <code className="text-sm font-mono font-bold text-primary">{cmd.command}</code>
                      <Badge variant="outline" className="text-[10px] px-1.5">
                        {STATUS_LABEL[cmd.status] ?? cmd.status}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Enviado: {format(new Date(cmd.sentAt), "dd/MM HH:mm:ss")}
                      {cmd.acknowledgedAt && (
                        <> · Confirmado: {format(new Date(cmd.acknowledgedAt), "HH:mm:ss")}</>
                      )}
                    </div>
                    {cmd.params && (
                      <code className="text-[10px] text-muted-foreground mt-0.5 block">{cmd.params}</code>
                    )}
                    {cmd.error && (
                      <p className="text-[11px] text-red-400 mt-0.5">{cmd.error}</p>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0">#{cmd.id}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
