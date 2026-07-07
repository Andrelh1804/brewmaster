import { useState } from "react";
import {
  useListSensors,
  useUpdateSensor,
  getListSensorsQueryKey,
  Sensor
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Activity, Settings } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export default function Sensors() {
  const { data: sensors, isLoading } = useListSensors({ query: { refetchInterval: 5000, queryKey: getListSensorsQueryKey() } });
  const [editingSensor, setEditingSensor] = useState<Sensor | null>(null);

  if (isLoading) {
    return <div className="p-6">Carregando sensores...</div>;
  }

  const getStatusBadge = (status: string | undefined) => {
    switch(status) {
      case 'normal': return <Badge variant="success" className="uppercase text-[10px]">Normal</Badge>;
      case 'warning': return <Badge variant="warning" className="uppercase text-[10px] animate-pulse">Alerta</Badge>;
      case 'critical': return <Badge variant="destructive" className="uppercase text-[10px] animate-pulse">Crítico</Badge>;
      default: return <Badge variant="outline" className="uppercase text-[10px]">Offline</Badge>;
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Telemetria de Sensores</h1>
          <p className="text-muted-foreground text-sm mt-1">Leituras ao vivo e configurações de limites.</p>
        </div>
      </div>

      <Card className="bg-sidebar border-border/50 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-background">
              <TableRow className="border-border/50 hover:bg-transparent">
                <TableHead className="w-10 sm:w-12"></TableHead>
                <TableHead className="font-bold tracking-widest uppercase text-xs">Sensor</TableHead>
                <TableHead className="font-bold tracking-widest uppercase text-xs hidden sm:table-cell">Equipamento</TableHead>
                <TableHead className="font-bold tracking-widest uppercase text-xs">Leitura</TableHead>
                <TableHead className="font-bold tracking-widest uppercase text-xs">Status</TableHead>
                <TableHead className="font-bold tracking-widest uppercase text-xs text-right hidden md:table-cell">Limites</TableHead>
                <TableHead className="w-10 sm:w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sensors?.map(sensor => (
                <TableRow key={sensor.id} className="border-border/50">
                  <TableCell>
                    <Activity className={`w-4 h-4 ${sensor.status === 'critical' ? 'text-destructive' : sensor.status === 'warning' ? 'text-amber-500' : 'text-emerald-500'}`} />
                  </TableCell>
                  <TableCell>
                    <div className="font-bold">{sensor.name}</div>
                    <div className="text-[10px] text-muted-foreground uppercase font-mono">{sensor.type}</div>
                  </TableCell>
                  <TableCell className="text-muted-foreground hidden sm:table-cell">
                    {sensor.equipmentName || '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg sm:text-xl font-mono font-bold tracking-tighter">{sensor.currentValue.toFixed(2)}</span>
                      <span className="text-xs font-semibold text-muted-foreground">{sensor.unit}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(sensor.status)}
                  </TableCell>
                  <TableCell className="text-right hidden md:table-cell">
                    <div className="text-xs font-mono text-muted-foreground">
                      [{sensor.minThreshold ?? '-'} - {sensor.maxThreshold ?? '-'}] {sensor.unit}
                    </div>
                    <div className="w-full h-1 bg-background rounded-full mt-1 overflow-hidden flex">
                      {sensor.minThreshold != null && sensor.maxThreshold != null && (
                        <div className="h-full bg-primary relative" style={{ 
                          marginLeft: `${Math.max(0, Math.min(100, ((sensor.currentValue - sensor.minThreshold!) / (sensor.maxThreshold! - sensor.minThreshold!)) * 100))}%`,
                          width: '4px'
                        }} />
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => setEditingSensor(sensor)}>
                      <Settings className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {editingSensor && (
        <ThresholdModal 
          open={!!editingSensor} 
          onOpenChange={(open) => !open && setEditingSensor(null)} 
          sensor={editingSensor} 
        />
      )}
    </div>
  );
}

function ThresholdModal({ open, onOpenChange, sensor }: { open: boolean, onOpenChange: (open: boolean) => void, sensor: Sensor }) {
  const updateSensor = useUpdateSensor();
  const queryClient = useQueryClient();
  
  const [minT, setMinT] = useState(sensor.minThreshold?.toString() || "");
  const [maxT, setMaxT] = useState(sensor.maxThreshold?.toString() || "");

  const handleSubmit = async () => {
    try {
      await updateSensor.mutateAsync({
        id: sensor.id,
        data: {
          minThreshold: minT ? parseFloat(minT) : undefined,
          maxThreshold: maxT ? parseFloat(maxT) : undefined,
        }
      });
      queryClient.invalidateQueries({ queryKey: ["/api/sensors"] });
      onOpenChange(false);
    } catch(e) {
      console.error(e);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:w-auto">
        <DialogHeader>
          <DialogTitle>Configurar Limites</DialogTitle>
          <p className="text-sm text-muted-foreground">Sensor: <span className="font-mono text-primary">{sensor.name}</span></p>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-4">
          <div className="space-y-2">
            <Label className="uppercase tracking-widest text-[10px]">Limite Mínimo ({sensor.unit})</Label>
            <Input type="number" step="0.1" value={minT} onChange={e => setMinT(e.target.value)} className="font-mono" />
          </div>
          <div className="space-y-2">
            <Label className="uppercase tracking-widest text-[10px]">Limite Máximo ({sensor.unit})</Label>
            <Input type="number" step="0.1" value={maxT} onChange={e => setMaxT(e.target.value)} className="font-mono" />
          </div>
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit}>Salvar Configuração</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
