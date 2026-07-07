import {
  useListAlarms,
  useAcknowledgeAlarm,
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BellRing, Check, ShieldAlert, AlertTriangle, AlertCircle, Info } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

export default function Alarms() {
  const { data: alarms, isLoading } = useListAlarms({ query: { refetchInterval: 5000 } });
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
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <BellRing className="w-8 h-8 text-primary" /> Alarms Console
          </h1>
          <p className="text-muted-foreground text-sm mt-1">System events requiring operator attention.</p>
        </div>
      </div>

      <Card className="bg-sidebar border-border/50 overflow-hidden shadow-xl">
        <Table>
          <TableHeader className="bg-background border-b-2 border-border">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-16"></TableHead>
              <TableHead className="font-bold tracking-widest uppercase text-xs">Timestamp</TableHead>
              <TableHead className="font-bold tracking-widest uppercase text-xs">Message</TableHead>
              <TableHead className="font-bold tracking-widest uppercase text-xs">Priority</TableHead>
              <TableHead className="font-bold tracking-widest uppercase text-xs">Equipment</TableHead>
              <TableHead className="font-bold tracking-widest uppercase text-xs text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8">Loading alarms...</TableCell></TableRow>
            ) : alarms?.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No alarms registered</TableCell></TableRow>
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
                <TableCell>
                  <Badge variant={alarm.priority === 'critical' ? 'destructive' : alarm.priority === 'high' ? 'warning' : 'outline'} className="uppercase text-[10px]">
                    {alarm.priority}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {alarm.equipmentName || '-'}
                </TableCell>
                <TableCell className="text-right">
                  {!alarm.acknowledged ? (
                    <Button size="sm" variant="outline" className="border-primary/50 text-primary hover:bg-primary/20 hover:text-primary" onClick={() => handleAck(alarm.id)}>
                      <Check className="w-4 h-4 mr-1" /> Acknowledge
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground flex items-center justify-end gap-1">
                      <Check className="w-3 h-3" /> Ack'd
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
