import {
  useGetProductionReport,
  useGetSensorHistoryReport,
  useGetAlarmReport
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";

export default function Reports() {
  const { data: prodReport } = useGetProductionReport();
  const { data: sensorReport } = useGetSensorHistoryReport();
  const { data: alarmReport } = useGetAlarmReport();

  const ALARM_COLORS = {
    info: "hsl(210 100% 50%)",
    warning: "hsl(38 95% 58%)",
    error: "hsl(0 85% 58%)",
    emergency: "hsl(0 100% 40%)"
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Análises e Relatórios</h1>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="bg-sidebar border-border/50">
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Estatísticas de Produção</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-3xl font-mono font-bold text-primary">{prodReport?.totalRuns ?? 0}</div>
                <div className="text-xs text-muted-foreground uppercase tracking-widest">Total de Bateladas</div>
              </div>
              <div>
                <div className="text-3xl font-mono font-bold text-emerald-500">{prodReport?.completedRuns ?? 0}</div>
                <div className="text-xs text-muted-foreground uppercase tracking-widest">Concluídas</div>
              </div>
            </div>
            <div className="h-48 mt-6">
              {prodReport?.byStage && (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={prodReport.byStage}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                    <XAxis dataKey="stage" stroke="#666" tick={{fontSize: 10, fill: '#888'}} />
                    <RechartsTooltip contentStyle={{backgroundColor: '#111', borderColor: '#333', fontSize: '12px'}} />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[2,2,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-sidebar border-border/50">
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Distribuição de Alarmes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex flex-col items-center justify-center">
              {alarmReport?.bySeverity && alarmReport.bySeverity.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={alarmReport.bySeverity}
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="count"
                      nameKey="severity"
                    >
                      {alarmReport.bySeverity.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={ALARM_COLORS[entry.severity as keyof typeof ALARM_COLORS] || '#888'} />
                      ))}
                    </Pie>
                    <RechartsTooltip contentStyle={{backgroundColor: '#111', borderColor: '#333', fontSize: '12px', textTransform: 'uppercase'}} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-muted-foreground text-sm font-mono">Sem dados de alarme</div>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-sidebar border-border/50 sm:col-span-2 lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Tendências de Telemetria</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 sm:h-80 w-full">
              {sensorReport && sensorReport.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                    <XAxis dataKey="timestamp" stroke="#666" tickFormatter={(t) => new Date(t).toLocaleTimeString('pt-BR')} tick={{fontSize: 10}} />
                    <YAxis stroke="#666" tick={{fontSize: 10}} />
                    <RechartsTooltip 
                      labelFormatter={(t) => new Date(t).toLocaleString('pt-BR')}
                      contentStyle={{backgroundColor: '#111', borderColor: '#333', fontSize: '12px'}} 
                    />
                    {sensorReport.map((series, i) => (
                      <Line 
                        key={series.sensorId}
                        data={series.readings}
                        type="monotone" 
                        dataKey="value" 
                        name={series.sensorName}
                        stroke={`hsl(${i * 60 + 30} 80% 50%)`} 
                        dot={false}
                        strokeWidth={2}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground font-mono">Sem dados de telemetria disponíveis</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
