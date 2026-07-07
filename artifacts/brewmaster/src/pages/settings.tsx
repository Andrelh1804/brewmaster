import { useSimulatorTick } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ServerCog, Activity } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export default function Settings() {
  const simTick = useSimulatorTick();
  const queryClient = useQueryClient();

  const handleTick = async () => {
    try {
      await simTick.mutateAsync({});
      queryClient.invalidateQueries();
    } catch(e) {
      console.error(e);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <ServerCog className="w-8 h-8 text-primary" />
        <h1 className="text-3xl font-bold tracking-tight">System Settings</h1>
      </div>

      <div className="grid gap-6">
        <Card className="bg-sidebar border-border/50 shadow-xl">
          <CardHeader>
            <CardTitle>Simulator Control</CardTitle>
            <CardDescription>Force advance the hardware simulator to generate new sensor readings and progress production stages.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={handleTick} 
              disabled={simTick.isPending}
              className="font-bold tracking-widest uppercase gap-2"
            >
              <Activity className="w-4 h-4" /> 
              {simTick.isPending ? "Ticking..." : "Trigger Simulator Tick"}
            </Button>
            <p className="text-xs text-muted-foreground mt-4 font-mono">
              In a real environment, sensors push data automatically. This overrides the internal clock for testing.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-sidebar border-border/50 shadow-xl opacity-50">
          <CardHeader>
            <CardTitle>IoT Gateway Configuration</CardTitle>
            <CardDescription>MQTT broker settings and device provisioning (Disabled in Demo)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="h-10 bg-background rounded border border-border/50 w-full" />
              <div className="h-10 bg-background rounded border border-border/50 w-2/3" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
