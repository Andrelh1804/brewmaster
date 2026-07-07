import { useListHistory } from "@workspace/api-client-react";
import { format } from "date-fns";
import { Activity, Bell, Settings2, CheckCircle2, Clock } from "lucide-react";

export default function History() {
  const { data: history, isLoading } = useListHistory({ query: { refetchInterval: 10000 } });

  if (isLoading) return <div className="p-6">Carregando logs...</div>;

  const getEventIcon = (type: string) => {
    if (type.includes('alarm')) return <Bell className="w-4 h-4 text-destructive" />;
    if (type.includes('started') || type.includes('completed')) return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    if (type.includes('sensor')) return <Activity className="w-4 h-4 text-amber-500" />;
    if (type.includes('production')) return <Settings2 className="w-4 h-4 text-primary" />;
    return <Clock className="w-4 h-4 text-muted-foreground" />;
  };

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Logs do Sistema</h1>
          <p className="text-muted-foreground text-sm mt-1">Histórico cronológico imutável de eventos.</p>
        </div>
      </div>

      <div className="bg-sidebar border border-border/50 rounded-lg shadow-xl overflow-hidden">
        <div className="divide-y divide-border/50">
          {history?.map(event => (
            <div key={event.id} className="p-4 flex items-start gap-3 sm:gap-4 hover:bg-card/30 transition-colors">
              <div className="p-2 rounded-full bg-background border border-border/50 shrink-0 mt-1">
                {getEventIcon(event.type)}
              </div>
              <div className="flex-1 space-y-1 min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                  <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground font-mono">
                    {event.type.replace('_', ' ')}
                  </span>
                  <span className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                    {format(new Date(event.createdAt), 'yyyy-MM-dd HH:mm:ss')}
                  </span>
                </div>
                <p className="text-sm font-medium leading-relaxed">
                  {event.message}
                </p>
                {(event.productionId || event.equipmentId) && (
                  <div className="flex flex-wrap gap-3 mt-2 text-[10px] uppercase font-mono tracking-widest text-muted-foreground">
                    {event.productionId && <span>PRD-{event.productionId.toString().padStart(4,'0')}</span>}
                    {event.equipmentId && <span>EQP-{event.equipmentId.toString().padStart(3,'0')}</span>}
                  </div>
                )}
              </div>
            </div>
          ))}
          {history?.length === 0 && (
            <div className="p-12 text-center text-muted-foreground font-mono">
              Nenhum log encontrado.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
