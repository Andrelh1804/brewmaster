import { useState } from "react";
import {
  useListRecipes,
  useCreateRecipe,
  useUpdateRecipe,
  useDeleteRecipe,
  useDuplicateRecipe,
  Recipe
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FlaskConical, Plus, Search, Trash2, Edit, Copy } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

function SrmColor(srm: number | null | undefined): string {
  if (!srm) return "#F5C842";
  if (srm <= 2) return "#F5E57A";
  if (srm <= 4) return "#F5C842";
  if (srm <= 6) return "#E8A020";
  if (srm <= 9) return "#C87020";
  if (srm <= 14) return "#A04010";
  if (srm <= 20) return "#703010";
  if (srm <= 30) return "#4A1A08";
  return "#1A0800";
}

export default function Recipes() {
  const { data: recipes, isLoading } = useListRecipes();
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);

  const queryClient = useQueryClient();
  const deleteRecipe = useDeleteRecipe();
  const duplicateRecipe = useDuplicateRecipe();
  const { toast } = useToast();

  const filteredRecipes = recipes?.filter(r =>
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.style.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = async (id: number, name: string) => {
    if (confirm(`Excluir a receita "${name}"?`)) {
      await deleteRecipe.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: ["/api/recipes"] });
      toast({ title: "Receita excluída" });
    }
  };

  const handleDuplicate = async (id: number, name: string) => {
    try {
      await duplicateRecipe.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: ["/api/recipes"] });
      toast({ title: "Receita duplicada", description: `"${name}" foi copiada.` });
    } catch {
      toast({ title: "Erro ao duplicar", variant: "destructive" });
    }
  };

  const openNew = () => { setEditingRecipe(null); setIsModalOpen(true); };
  const openEdit = (recipe: Recipe) => { setEditingRecipe(recipe); setIsModalOpen(true); };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-wrap items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <FlaskConical className="w-7 h-7 text-primary" />
            Biblioteca de Receitas
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Editor visual de formulações cervejeiras.</p>
        </div>
        <Button onClick={openNew} className="gap-2 font-bold">
          <Plus className="w-4 h-4" /> Nova Receita
        </Button>
      </div>

      <div className="flex items-center gap-3 bg-sidebar p-2 rounded-md border border-border/50 w-full sm:max-w-md">
        <Search className="w-5 h-5 text-muted-foreground ml-2 shrink-0" />
        <Input
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="Buscar receitas..."
          className="border-0 focus-visible:ring-0 shadow-none bg-transparent"
        />
      </div>

      {isLoading ? (
        <div className="text-muted-foreground animate-pulse">Carregando receitas...</div>
      ) : filteredRecipes?.length === 0 ? (
        <Card className="border-dashed border-border/50 bg-sidebar/50">
          <CardContent className="p-12 text-center">
            <FlaskConical className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-bold mb-2">Nenhuma receita encontrada</h3>
            <Button onClick={openNew} className="gap-2 mt-2">
              <Plus className="w-4 h-4" /> Criar primeira receita
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRecipes?.map(recipe => (
            <Card key={recipe.id} className="bg-sidebar hover:bg-sidebar/80 transition-colors border-border/50 group overflow-hidden">
              {/* SRM color bar */}
              <div className="h-1.5 w-full" style={{ backgroundColor: SrmColor(recipe.srm) }} />
              <CardContent className="p-5 flex flex-col h-full relative">
                <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleDuplicate(recipe.id, recipe.name)} title="Duplicar" className="p-1.5 bg-background rounded border text-muted-foreground hover:text-primary transition-colors">
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => openEdit(recipe)} title="Editar" className="p-1.5 bg-background rounded border text-muted-foreground hover:text-primary transition-colors">
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(recipe.id, recipe.name)} title="Excluir" className="p-1.5 bg-background rounded border text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="mb-3 pr-20">
                  <Badge variant="outline" className="mb-2 text-[10px] uppercase tracking-wider">{recipe.style}</Badge>
                  <h3 className="text-lg font-bold text-primary truncate" title={recipe.name}>{recipe.name}</h3>
                </div>

                <p className="text-xs text-muted-foreground line-clamp-2 mb-3 min-h-[32px]">
                  {recipe.description || "Sem descrição."}
                </p>

                {/* Brewing parameters */}
                {(recipe.ibu || recipe.og || recipe.fg || recipe.abv || recipe.srm) && (
                  <div className="grid grid-cols-5 gap-1 mb-3 pb-3 border-b border-border/30">
                    {[
                      { label: "IBU", value: recipe.ibu?.toFixed(0) },
                      { label: "OG",  value: recipe.og?.toFixed(3) },
                      { label: "FG",  value: recipe.fg?.toFixed(3) },
                      { label: "ABV", value: recipe.abv ? `${recipe.abv.toFixed(1)}%` : null },
                      { label: "SRM", value: recipe.srm?.toFixed(0) },
                    ].map(({ label, value }) => value ? (
                      <div key={label} className="text-center">
                        <div className="text-[9px] text-muted-foreground uppercase tracking-wider">{label}</div>
                        <div className="text-xs font-mono font-bold">{value}</div>
                      </div>
                    ) : null)}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 text-xs">
                  {recipe.batchSizeL && (
                    <div>
                      <div className="text-[10px] text-muted-foreground">Lote</div>
                      <div className="font-mono">{recipe.batchSizeL} L</div>
                    </div>
                  )}
                  {recipe.boilTimeMins && (
                    <div>
                      <div className="text-[10px] text-muted-foreground">Fervura</div>
                      <div className="font-mono">{recipe.boilTimeMins} min</div>
                    </div>
                  )}
                  {recipe.estimatedCost && (
                    <div>
                      <div className="text-[10px] text-muted-foreground">Custo est.</div>
                      <div className="font-mono text-amber-400">R$ {recipe.estimatedCost.toFixed(2)}</div>
                    </div>
                  )}
                  {recipe.suggestedPrice && (
                    <div>
                      <div className="text-[10px] text-muted-foreground">Preço sug.</div>
                      <div className="font-mono text-emerald-400">R$ {recipe.suggestedPrice.toFixed(2)}</div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {isModalOpen && (
        <RecipeModal
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
          recipe={editingRecipe}
        />
      )}
    </div>
  );
}

function RecipeModal({ open, onOpenChange, recipe }: { open: boolean; onOpenChange: (open: boolean) => void; recipe: Recipe | null }) {
  const createRecipe = useCreateRecipe();
  const updateRecipe = useUpdateRecipe();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const num = (v: number | null | undefined) => v?.toString() ?? "";

  const [form, setForm] = useState({
    name:                recipe?.name ?? "",
    style:               recipe?.style ?? "",
    description:         recipe?.description ?? "",
    imageUrl:            recipe?.imageUrl ?? "",
    ibu:                 num(recipe?.ibu),
    og:                  num(recipe?.og),
    fg:                  num(recipe?.fg),
    abv:                 num(recipe?.abv),
    srm:                 num(recipe?.srm),
    batchSizeL:          num(recipe?.batchSizeL),
    boilTimeMins:        num(recipe?.boilTimeMins) || "60",
    estimatedCost:       num(recipe?.estimatedCost),
    suggestedPrice:      num(recipe?.suggestedPrice),
    profitMargin:        num(recipe?.profitMargin),
    malts:               recipe?.malts ?? "",
    hops:                recipe?.hops ?? "",
    yeasts:              recipe?.yeasts ?? "",
    adjuncts:            recipe?.adjuncts ?? "",
    salts:               recipe?.salts ?? "",
    waterProfile:        recipe?.waterProfile ?? "",
    mashProfile:         recipe?.mashProfile ?? "",
    hopAdditions:        recipe?.hopAdditions ?? "",
    fermentationProfile: recipe?.fermentationProfile ?? "",
    maturationProfile:   recipe?.maturationProfile ?? "",
    carbonation:         recipe?.carbonation ?? "",
    notes:               recipe?.notes ?? "",
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const pf = (v: string) => { const n = parseFloat(v); return isNaN(n) ? undefined : n; };
  const pi = (v: string) => { const n = parseInt(v, 10); return isNaN(n) ? undefined : n; };

  const handleSubmit = async () => {
    try {
      const data = {
        name: form.name, style: form.style, description: form.description || undefined,
        imageUrl: form.imageUrl || undefined,
        ibu: pf(form.ibu), og: pf(form.og), fg: pf(form.fg),
        abv: pf(form.abv), srm: pf(form.srm), batchSizeL: pf(form.batchSizeL),
        boilTimeMins: pi(form.boilTimeMins),
        estimatedCost: pf(form.estimatedCost), suggestedPrice: pf(form.suggestedPrice),
        profitMargin: pf(form.profitMargin),
        malts: form.malts || undefined, hops: form.hops || undefined,
        yeasts: form.yeasts || undefined, adjuncts: form.adjuncts || undefined,
        salts: form.salts || undefined, waterProfile: form.waterProfile || undefined,
        mashProfile: form.mashProfile || undefined, hopAdditions: form.hopAdditions || undefined,
        fermentationProfile: form.fermentationProfile || undefined,
        maturationProfile: form.maturationProfile || undefined,
        carbonation: form.carbonation || undefined, notes: form.notes || undefined,
      };
      if (recipe) {
        await updateRecipe.mutateAsync({ id: recipe.id, data });
        toast({ title: "Receita atualizada" });
      } else {
        await createRecipe.mutateAsync({ data });
        toast({ title: "Receita criada" });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/recipes"] });
      onOpenChange(false);
    } catch {
      toast({ title: "Erro ao salvar receita", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{recipe ? "Editar Receita" : "Nova Receita"}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="basic">
          <TabsList className="bg-sidebar w-full">
            <TabsTrigger value="basic" className="flex-1">Básico</TabsTrigger>
            <TabsTrigger value="params" className="flex-1">Parâmetros</TabsTrigger>
            <TabsTrigger value="ingredients" className="flex-1">Ingredientes</TabsTrigger>
            <TabsTrigger value="profiles" className="flex-1">Processos</TabsTrigger>
            <TabsTrigger value="financial" className="flex-1">Financeiro</TabsTrigger>
          </TabsList>

          {/* Basic */}
          <TabsContent value="basic" className="space-y-3 mt-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2">
                <Label>Nome *</Label>
                <Input value={form.name} onChange={e => set("name", e.target.value)} placeholder="IPA Cósmica" />
              </div>
              <div className="space-y-1.5">
                <Label>Estilo *</Label>
                <Input value={form.style} onChange={e => set("style", e.target.value)} placeholder="American IPA" />
              </div>
              <div className="space-y-1.5">
                <Label>Tamanho do Lote (L)</Label>
                <Input type="number" value={form.batchSizeL} onChange={e => set("batchSizeL", e.target.value)} placeholder="20" />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Descrição</Label>
                <Textarea value={form.description} onChange={e => set("description", e.target.value)} rows={3} placeholder="Descreva a receita..." />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>URL da Imagem</Label>
                <Input value={form.imageUrl} onChange={e => set("imageUrl", e.target.value)} placeholder="https://..." />
              </div>
            </div>
          </TabsContent>

          {/* Brewing parameters */}
          <TabsContent value="params" className="space-y-3 mt-3">
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "IBU (amargura)", key: "ibu", placeholder: "35" },
                { label: "OG (den. original)", key: "og", placeholder: "1.065" },
                { label: "FG (den. final)", key: "fg", placeholder: "1.012" },
                { label: "ABV (%)", key: "abv", placeholder: "6.8" },
                { label: "SRM (cor)", key: "srm", placeholder: "8" },
                { label: "Fervura (min)", key: "boilTimeMins", placeholder: "60" },
              ].map(({ label, key, placeholder }) => (
                <div key={key} className="space-y-1.5">
                  <Label>{label}</Label>
                  <Input type="number" value={(form as any)[key]} onChange={e => set(key, e.target.value)} placeholder={placeholder} step="any" />
                </div>
              ))}
            </div>
            {form.srm && (
              <div className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-sidebar">
                <div className="w-8 h-8 rounded-full border border-border/50" style={{ backgroundColor: SrmColor(parseFloat(form.srm)) }} />
                <span className="text-sm text-muted-foreground">Cor SRM: <strong className="text-foreground">{form.srm}</strong></span>
              </div>
            )}
          </TabsContent>

          {/* Ingredients */}
          <TabsContent value="ingredients" className="space-y-3 mt-3">
            <div className="space-y-3">
              {[
                { label: "Maltes", key: "malts", ph: "Pilsen 4.5kg, Munich 0.5kg..." },
                { label: "Lúpulos", key: "hops", ph: "Citra 30g FWH, Mosaic 20g 10min..." },
                { label: "Leveduras", key: "yeasts", ph: "US-05 - American Ale..." },
                { label: "Adjuntos", key: "adjuncts", ph: "Mel 200g no flameout..." },
                { label: "Sais da Água", key: "salts", ph: "CaSO4 3g, CaCl2 2g..." },
                { label: "Perfil da Água", key: "waterProfile", ph: "Hoppy profile: Ca 100, Mg 10, Na 20, Cl 50, SO4 150..." },
              ].map(({ label, key, ph }) => (
                <div key={key} className="space-y-1.5">
                  <Label>{label}</Label>
                  <Textarea className="font-mono text-xs" rows={2} value={(form as any)[key]} onChange={e => set(key, e.target.value)} placeholder={ph} />
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Profiles */}
          <TabsContent value="profiles" className="space-y-3 mt-3">
            {[
              { label: "Perfil de Mosturação", key: "mashProfile", ph: "Proteolítica 50°C/15min, Sacarificação 67°C/60min, MashOut 78°C/10min" },
              { label: "Adições de Lúpulo", key: "hopAdditions", ph: "60min: Magnum 15g, 15min: Citra 20g, FO: Mosaic 30g" },
              { label: "Perfil de Fermentação", key: "fermentationProfile", ph: "18°C por 7 dias, subir para 20°C no 5° dia, diacetyl rest 22°C 48h" },
              { label: "Perfil de Maturação", key: "maturationProfile", ph: "Lagering 2°C por 14 dias" },
              { label: "Carbonatação", key: "carbonation", ph: "Priming: 7g dextrose/L, ou 2.4 volumes CO2 por pressão" },
              { label: "Notas do Processo", key: "notes", ph: "Observações gerais da produção..." },
            ].map(({ label, key, ph }) => (
              <div key={key} className="space-y-1.5">
                <Label>{label}</Label>
                <Textarea rows={2} value={(form as any)[key]} onChange={e => set(key, e.target.value)} placeholder={ph} />
              </div>
            ))}
          </TabsContent>

          {/* Financial */}
          <TabsContent value="financial" className="space-y-3 mt-3">
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Custo Estimado (R$)", key: "estimatedCost", placeholder: "45.00" },
                { label: "Preço Sugerido (R$)", key: "suggestedPrice", placeholder: "120.00" },
                { label: "Margem de Lucro (%)", key: "profitMargin", placeholder: "62.5" },
              ].map(({ label, key, placeholder }) => (
                <div key={key} className="space-y-1.5">
                  <Label>{label}</Label>
                  <Input type="number" value={(form as any)[key]} onChange={e => set(key, e.target.value)} placeholder={placeholder} step="any" />
                </div>
              ))}
            </div>
            {form.estimatedCost && form.suggestedPrice && (
              <div className="p-3 rounded-lg border border-border/50 bg-sidebar text-sm space-y-1">
                <div className="text-muted-foreground">Análise financeira (lote de {form.batchSizeL || "?"}L)</div>
                <div className="flex justify-between">
                  <span>Custo:</span>
                  <span className="font-mono text-destructive">R$ {parseFloat(form.estimatedCost).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Receita:</span>
                  <span className="font-mono text-emerald-400">R$ {parseFloat(form.suggestedPrice).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold border-t border-border/50 pt-1 mt-1">
                  <span>Lucro:</span>
                  <span className={cn("font-mono", parseFloat(form.suggestedPrice) > parseFloat(form.estimatedCost) ? "text-emerald-400" : "text-destructive")}>
                    R$ {(parseFloat(form.suggestedPrice) - parseFloat(form.estimatedCost)).toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex-col sm:flex-row gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!form.name || !form.style}>
            {recipe ? "Salvar Alterações" : "Criar Receita"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
