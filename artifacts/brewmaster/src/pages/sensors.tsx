import { useState } from "react";
import {
  useListSensors,
  useUpdateSensor,
  Sensor
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Activity, Settings, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export default function Sensors() {
  const { data: sensors, isLoading } = useListSensors({ query: { refetchInterval: 5000 } });
  const [editingSensor, setEditingSensor] = useState<Sensor | null>(null);

  if (isLoading) {
    return <div className="p-6">Loading sensors...</div>;
  }

  const getStatusBadge = (status: string | undefined) => {
    switch(status) {
      case 'normal': return <Badge variant="success" className="uppercase text-[10px]">Normal</Badge>;
      case 'warning': return <Badge variant="warning" className="uppercase text-[10px] animate-pulse">Warning</Badge>;
      case 'critical': return <Badge variant="destructive" className="uppercase text-[10px] animate-pulse">Critical</Badge>;
      default: return <Badge variant="outline" className="uppercase text-[10px]">Offline</Badge>;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sensor Telemetry</h1>
          <p className="text-muted-foreground text-sm mt-1">Live readings and threshold configurations.</p>
        </div>
      </div>

      <Card className="bg-sidebar border-border/50 overflow-hidden shadow-xl">
        <Table>
          <TableHeader className="bg-background">
            <TableRow className="border-border/50 hover:bg-transparent">
              <TableHead className="w-12"></TableHead>
              <TableHead className="font-bold tracking-widest uppercase text-xs">Sensor</TableHead>
              <TableHead className="font-bold tracking-widest uppercase text-xs">Equipment</TableHead>
              <TableHead className="font-bold tracking-widest uppercase text-xs">Reading</TableHead>
              <TableHead className="font-bold tracking-widest uppercase text-xs">Status</TableHead>
              <TableHead className="font-bold tracking-widest uppercase text-xs text-right">Thresholds</TableHead>
              <TableHead className="w-12"></TableHead>
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
                <TableCell className="text-muted-foreground">
                  {sensor.equipmentName || '-'}
                </TableCell>
                <TableCell>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl font-mono font-bold tracking-tighter">{sensor.currentValue.toFixed(2)}</span>
                    <span className="text-xs font-semibold text-muted-foreground">{sensor.unit}</span>
                  </div>
                </TableCell>
                <TableCell>
                  {getStatusBadge(sensor.status)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="text-xs font-mono text-muted-foreground">
                    [{sensor.minThreshold ?? '-'} - {sensor.maxThreshold ?? '-'}] {sensor.unit}
                  </div>
                  <div className="w-full h-1 bg-background rounded-full mt-1 overflow-hidden flex">
                    {sensor.minThreshold !== undefined && sensor.maxThreshold !== undefined && (
                      <div className="h-full bg-primary relative" style={{ 
                        marginLeft: `${Math.max(0, Math.min(100, ((sensor.currentValue - sensor.minThreshold) / (sensor.maxThreshold - sensor.minThreshold)) * 100))}%`,
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Configure Thresholds</DialogTitle>
          <p className="text-sm text-muted-foreground">Sensor: <span className="font-mono text-primary">{sensor.name}</span></p>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-4">
          <div className="space-y-2">
            <Label className="uppercase tracking-widest text-[10px]">Min Threshold ({sensor.unit})</Label>
            <Input type="number" step="0.1" value={minT} onChange={e => setMinT(e.target.value)} className="font-mono" />
          </div>
          <div className="space-y-2">
            <Label className="uppercase tracking-widest text-[10px]">Max Threshold ({sensor.unit})</Label>
            <Input type="number" step="0.1" value={maxT} onChange={e => setMaxT(e.target.value)} className="font-mono" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit}>Save Configuration</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
