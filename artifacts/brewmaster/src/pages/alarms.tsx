import {
  useListAlarms,
  useAcknowledgeAlarm,
  getListAlarmsQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BellRing, Check, ShieldAlert, AlertTriangle, AlertCircle, Info } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

const PRIORITY_LABELS: Record<string, string> = {
  critical: "Crítico",
  high: "Alto",
  medium: "Médio",
  low: "Baixo",
};

export default function Alarms() {
  const { data: alarms, isLoading } = useListAlarms({ query: { refetchInterval: 5000, queryKey: getListAlarmsQueryKey() } });
  const ackAlarm = useAcknowledgeAlarm();
  const queryClient = useQueryClient();

  const handleAck = async (id: number) => {
    try {
      await ackAlarm.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: ["/api/alarms"] });
      queryClient.invalidateQueries({ queryKey: ["/api/alarms/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/overview"] });
    } catch(e) {
      console.error(e);
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch(priority) {
      case 'critical': return <ShieldAlert className="w-5 h-5 text-destructive" />;
      case 'high': return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case 'medium': return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      default: return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-3">
            <BellRing className="w-7 h-7 sm:w-8 sm:h-8 text-primary" /> Console de Alarmes
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Eventos do sistema que requerem atenção do operador.</p>
        </div>
      </div>

      <Card className="bg-sidebar border-border/50 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-background border-b-2 border-border">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-12 sm:w-16"></TableHead>
                <TableHead className="font-bold tracking-widest uppercase text-xs whitespace-nowrap">Data/Hora</TableHead>
                <TableHead className="font-bold tracking-widest uppercase text-xs">Mensagem</TableHead>
                <TableHead className="font-bold tracking-widest uppercase text-xs hidden sm:table-cell">Prioridade</TableHead>
                <TableHead className="font-bold tracking-widest uppercase text-xs hidden md:table-cell">Equipamento</TableHead>
                <TableHead className="font-bold tracking-widest uppercase text-xs text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8">Carregando alarmes...</TableCell></TableRow>
              ) : alarms?.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum alarme registrado</TableCell></TableRow>
              ) : alarms?.map(alarm => (
                <TableRow key={alarm.id} className={`border-border/50 ${!alarm.acknowledged ? 'bg-destructive/5' : 'opacity-60'}`}>
                  <TableCell className="text-center">
                    <div className={!alarm.acknowledged && alarm.priority === 'critical' ? 'animate-pulse' : ''}>
                      {getPriorityIcon(alarm.priority)}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs whitespace-nowrap">
                    {format(new Date(alarm.triggeredAt), 'yyyy-MM-dd HH:mm:ss')}
                  </TableCell>
                  <TableCell className={`font-medium ${!alarm.acknowledged ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {alarm.message}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant={alarm.priority === 'critical' ? 'destructive' : alarm.priority === 'high' ? 'warning' : 'outline'} className="uppercase text-[10px] whitespace-nowrap">
                      {PRIORITY_LABELS[alarm.priority] ?? alarm.priority}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm hidden md:table-cell">
                    {alarm.equipmentName || '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    {!alarm.acknowledged ? (
                      <Button size="sm" variant="outline" className="border-primary/50 text-primary hover:bg-primary/20 hover:text-primary whitespace-nowrap" onClick={() => handleAck(alarm.id)}>
                        <Check className="w-4 h-4 sm:mr-1" /> <span className="hidden sm:inline">Reconhecer</span>
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground flex items-center justify-end gap-1 whitespace-nowrap">
                        <Check className="w-3 h-3" /> Reconhecido
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
