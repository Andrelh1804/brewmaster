import { useState } from "react";
import {
  useGetActiveProduction,
  useAdvanceProductionStage,
  usePauseProduction,
  useResumeProduction,
  useCancelProduction,
  useCreateProduction,
  useAddProductionNote,
  useListRecipes,
  getGetActiveProductionQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Play, Pause, SquareSquare, ArrowRight, AlertTriangle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

const STAGES = ["mashing", "boiling", "whirlpool", "cooling", "fermentation", "maturation", "cip", "done"];

const STAGE_LABELS: Record<string, string> = {
  mashing: "Mostura",
  boiling: "Fervura",
  whirlpool: "Whirlpool",
  cooling: "Resfriamento",
  fermentation: "Fermentação",
  maturation: "Maturação",
  cip: "CIP",
  done: "Concluído",
};

const STATUS_LABELS: Record<string, string> = {
  running: "Em Execução",
  paused: "Pausado",
  cancelled: "Cancelado",
  completed: "Concluído",
};

export default function Production() {
  const queryClient = useQueryClient();
  const { data: production, isLoading } = useGetActiveProduction({ query: { refetchInterval: 5000, queryKey: getGetActiveProductionQueryKey() } });
  
  const advanceStage = useAdvanceProductionStage();
  const pauseProd = usePauseProduction();
  const resumeProd = useResumeProduction();
  const cancelProd = useCancelProduction();
  const addNote = useAddProductionNote();

  const [noteText, setNoteText] = useState("");
  const [isStartModalOpen, setIsStartModalOpen] = useState(false);

  const handleAction = async (action: any, params: any = {}) => {
    try {
      await action.mutateAsync(params);
      queryClient.invalidateQueries({ queryKey: ["/api/productions/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/productions"] });
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddNote = async () => {
    if (!production || !noteText.trim()) return;
    await handleAction(addNote, { id: production.id, data: { message: noteText } });
    setNoteText("");
  };

  if (isLoading) {
    return <div className="p-6">Carregando dados de produção...</div>;
  }

  if (!production) {
    return (
      <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Controle de Produção</h1>
        <Card className="border-dashed border-2 bg-sidebar border-sidebar-border">
          <CardContent className="flex flex-col items-center justify-center p-8 sm:p-12 text-center h-56 sm:h-64">
            <div className="rounded-full bg-sidebar-accent p-4 mb-4">
              <SquareSquare className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">Nenhuma Produção Ativa</h2>
            <p className="text-muted-foreground mb-6">Não há nenhuma batelada em andamento no momento.</p>
            <Button onClick={() => setIsStartModalOpen(true)} className="gap-2 font-bold tracking-widest uppercase">
              <Play className="h-4 w-4" /> Iniciar Nova Batelada
            </Button>
          </CardContent>
        </Card>
        
        <StartProductionModal open={isStartModalOpen} onOpenChange={setIsStartModalOpen} />
      </div>
    );
  }

  const isRunning = production.status === 'running';
  const isPaused = production.status === 'paused';
  const currentStageIndex = STAGES.indexOf(production.currentStage);

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-wrap items-start sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-primary truncate">
            {production.recipeName}
          </h1>
          <p className="text-muted-foreground font-mono text-xs sm:text-sm mt-1 uppercase tracking-widest">
            Batelada: PRD-{production.id.toString().padStart(4, '0')} · Início {format(new Date(production.startedAt), 'dd/MM HH:mm')}
          </p>
        </div>
        <Badge variant={isRunning ? 'success' : isPaused ? 'warning' : 'default'} className="px-4 py-1 text-sm uppercase tracking-widest shadow-md shrink-0">
          {STATUS_LABELS[production.status] ?? production.status}
        </Badge>
      </div>

      <Card className="bg-gradient-to-br from-card to-sidebar shadow-xl border-border/50">
        <CardHeader className="border-b border-border/50 pb-4">
          <CardTitle className="text-lg font-bold tracking-widest uppercase text-muted-foreground">Painel de Controle</CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 space-y-8">
          {/* Linha do tempo de etapas */}
          <div className="relative pt-8 pb-4 overflow-x-auto">
            <div className="min-w-[480px]">
              <div className="absolute top-10 left-0 right-0 h-1 bg-muted/50 rounded-full" />
              <div 
                className="absolute top-10 left-0 h-1 bg-primary rounded-full transition-all duration-500" 
                style={{ width: `${Math.max(5, (currentStageIndex / (STAGES.length - 1)) * 100)}%` }} 
              />
              
              <div className="flex justify-between relative">
                {STAGES.map((stage, i) => {
                  const isActive = i === currentStageIndex;
                  const isPast = i < currentStageIndex;
                  
                  return (
                    <div key={stage} className="flex flex-col items-center">
                      <div className={`w-4 h-4 rounded-full border-2 bg-background z-10 ${
                        isActive ? 'border-primary ring-4 ring-primary/20 scale-125' : 
                        isPast ? 'border-primary bg-primary' : 'border-muted'
                      }`} />
                      <span className={`text-[9px] sm:text-[10px] uppercase font-bold tracking-widest mt-3 absolute top-6 -translate-x-1/2 whitespace-nowrap ${
                        isActive ? 'text-primary' : isPast ? 'text-foreground' : 'text-muted-foreground'
                      }`}>
                        {STAGE_LABELS[stage] ?? stage}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 pt-8">
            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Métricas da Etapa Atual</h3>
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div className="bg-sidebar p-3 sm:p-4 rounded-lg border border-border/50">
                  <div className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Decorrido</div>
                  <div className="text-xl sm:text-2xl font-mono font-bold">{production.stageElapsedMins ?? 0} <span className="text-sm text-muted-foreground">min</span></div>
                </div>
                <div className="bg-sidebar p-3 sm:p-4 rounded-lg border border-border/50">
                  <div className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Restante</div>
                  <div className="text-xl sm:text-2xl font-mono font-bold text-accent">{production.stageRemainingMins ?? '-'} <span className="text-sm text-muted-foreground">min</span></div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Ações</h3>
              <div className="flex flex-wrap gap-2 sm:gap-3">
                {isRunning && (
                  <Button variant="outline" className="border-amber-500/50 text-amber-500 hover:bg-amber-500/10" onClick={() => handleAction(pauseProd, { id: production.id })}>
                    <Pause className="w-4 h-4 mr-2" /> Pausar
                  </Button>
                )}
                {isPaused && (
                  <Button variant="outline" className="border-emerald-500/50 text-emerald-500 hover:bg-emerald-500/10" onClick={() => handleAction(resumeProd, { id: production.id })}>
                    <Play className="w-4 h-4 mr-2" /> Retomar
                  </Button>
                )}
                <Button onClick={() => handleAction(advanceStage, { id: production.id })} className="font-bold">
                  Avançar Etapa <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <Button variant="destructive" onClick={() => handleAction(cancelProd, { id: production.id })}>
                  <AlertTriangle className="w-4 h-4 mr-2" /> Cancelar
                </Button>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-border/50">
            <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4">Notas do Operador</h3>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <Textarea 
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                placeholder="Registre leituras de densidade, pH ou observações..."
                className="font-mono text-sm min-h-[80px]"
              />
              <Button onClick={handleAddNote} className="sm:h-auto" disabled={!noteText.trim()}>Registrar Nota</Button>
            </div>
            {production.notes && (
              <div className="mt-4 p-4 bg-sidebar rounded-md font-mono text-sm whitespace-pre-wrap text-muted-foreground border border-border/50 max-h-48 overflow-y-auto">
                {production.notes}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StartProductionModal({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const { data: recipes, isLoading } = useListRecipes();
  const createProd = useCreateProduction();
  const queryClient = useQueryClient();
  const [selectedRecipe, setSelectedRecipe] = useState<number | null>(null);

  const handleStart = async () => {
    if (!selectedRecipe) return;
    try {
      await createProd.mutateAsync({ data: { recipeId: selectedRecipe } });
      queryClient.invalidateQueries({ queryKey: ["/api/productions/active"] });
      onOpenChange(false);
    } catch(e) {
      console.error(e);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:w-auto max-w-md">
        <DialogHeader>
          <DialogTitle>Iniciar Nova Batelada</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <Label className="text-muted-foreground uppercase tracking-widest text-xs font-bold">Selecionar Receita</Label>
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Carregando receitas...</div>
          ) : (
            <div className="grid grid-cols-1 gap-2 max-h-[280px] overflow-y-auto">
              {recipes?.map(r => (
                <div 
                  key={r.id} 
                  onClick={() => setSelectedRecipe(r.id)}
                  className={`p-3 border rounded-md cursor-pointer transition-colors ${selectedRecipe === r.id ? 'border-primary bg-primary/10' : 'border-border/50 hover:border-primary/50 bg-sidebar'}`}
                >
                  <div className="font-bold">{r.name}</div>
                  <div className="text-xs text-muted-foreground">{r.style}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleStart} disabled={!selectedRecipe} className="font-bold tracking-widest uppercase">
            Iniciar Produção
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
