import {
  useListActuators,
  useToggleActuator,
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Power, Settings, Fan, Flame, Waves, Lightbulb } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export default function Actuators() {
  const { data: actuators, isLoading } = useListActuators({ query: { refetchInterval: 2000 } });
  const toggleActuator = useToggleActuator();
  const queryClient = useQueryClient();

  const handleToggle = async (id: number) => {
    try {
      await toggleActuator.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: ["/api/actuators"] });
    } catch(e) {
      console.error(e);
    }
  };

  const getIcon = (type: string, isOn: boolean) => {
    const props = { className: `w-8 h-8 ${isOn ? 'text-primary' : 'text-muted-foreground'}` };
    switch(type) {
      case 'heater': return <Flame {...props} />;
      case 'pump': return <Waves {...props} />;
      case 'fan': return <Fan {...props} />;
      case 'light': return <Lightbulb {...props} />;
      default: return <Settings {...props} />;
    }
  };

  if (isLoading) return <div className="p-6">Carregando atuadores...</div>;

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Controle de Atuadores</h1>
          <p className="text-muted-foreground text-sm mt-1">Controles manuais e monitoramento de status.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
        {actuators?.map(act => (
          <Card key={act.id} className={`border-2 transition-colors ${act.isOn ? 'border-primary bg-primary/5 shadow-[0_0_15px_rgba(234,179,8,0.1)]' : 'border-border/50 bg-sidebar'}`}>
            <CardContent className="p-4 sm:p-6 flex flex-col items-center text-center">
              <div className={`p-3 sm:p-4 rounded-full mb-3 sm:mb-4 ${act.isOn ? 'bg-primary/20' : 'bg-background'}`}>
                {getIcon(act.type, act.isOn)}
              </div>
              <h3 className="font-bold tracking-widest uppercase text-xs sm:text-sm mb-1 truncate w-full" title={act.name}>{act.name}</h3>
              <p className="text-xs text-muted-foreground mb-4 sm:mb-6 h-4 truncate w-full">{act.equipmentName || ''}</p>
              
              <Button 
                variant={act.isOn ? "default" : "secondary"}
                className={`w-full font-bold tracking-widest uppercase gap-2 text-xs sm:text-sm ${act.isOn ? 'shadow-[0_0_10px_rgba(234,179,8,0.5)]' : ''}`}
                onClick={() => handleToggle(act.id)}
              >
                <Power className="w-4 h-4" /> {act.isOn ? 'LIGADO' : 'DESLIGADO'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
