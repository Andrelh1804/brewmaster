import { useState } from "react";
import {
  useListRecipes,
  useCreateRecipe,
  useUpdateRecipe,
  useDeleteRecipe,
  Recipe
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FlaskConical, Plus, Search, Trash2, Edit } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export default function Recipes() {
  const { data: recipes, isLoading } = useListRecipes();
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);

  const queryClient = useQueryClient();
  const deleteRecipe = useDeleteRecipe();

  const filteredRecipes = recipes?.filter(r => 
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    r.style.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = async (id: number) => {
    if (confirm("Excluir esta receita?")) {
      await deleteRecipe.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: ["/api/recipes"] });
    }
  };

  const openNew = () => {
    setEditingRecipe(null);
    setIsModalOpen(true);
  };

  const openEdit = (recipe: Recipe) => {
    setEditingRecipe(recipe);
    setIsModalOpen(true);
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-wrap items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Biblioteca de Receitas</h1>
          <p className="text-muted-foreground text-sm mt-1">Gerencie formulações e parâmetros de produção.</p>
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
        <div>Carregando receitas...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRecipes?.map(recipe => (
            <Card key={recipe.id} className="bg-sidebar hover:bg-sidebar/80 transition-colors border-border/50 group">
              <CardContent className="p-5 sm:p-6 flex flex-col h-full relative">
                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(recipe)} className="p-2 bg-background rounded-md text-muted-foreground hover:text-primary transition-colors border">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(recipe.id)} className="p-2 bg-background rounded-md text-muted-foreground hover:text-destructive transition-colors border">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="mb-4 pr-16">
                  <Badge variant="outline" className="mb-2 bg-background">{recipe.style}</Badge>
                  <h3 className="text-xl font-bold text-primary truncate" title={recipe.name}>{recipe.name}</h3>
                </div>
                
                <div className="space-y-2 flex-1">
                  <p className="text-sm text-muted-foreground line-clamp-2 min-h-[40px]">
                    {recipe.description || "Sem descrição."}
                  </p>
                  
                  <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-border/50">
                    <div>
                      <div className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mb-1">Fervura</div>
                      <div className="font-mono text-sm">{recipe.boilTimeMins ?? '-'} min</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mb-1">Criado em</div>
                      <div className="font-mono text-sm">{new Date(recipe.createdAt).toLocaleDateString('pt-BR')}</div>
                    </div>
                  </div>
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

function RecipeModal({ open, onOpenChange, recipe }: { open: boolean, onOpenChange: (open: boolean) => void, recipe: Recipe | null }) {
  const createRecipe = useCreateRecipe();
  const updateRecipe = useUpdateRecipe();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    name: recipe?.name || "",
    style: recipe?.style || "",
    description: recipe?.description || "",
    boilTimeMins: recipe?.boilTimeMins?.toString() || "60",
    malts: recipe?.malts || "",
    hops: recipe?.hops || "",
    notes: recipe?.notes || ""
  });

  const handleSubmit = async () => {
    try {
      const data = {
        ...formData,
        boilTimeMins: parseInt(formData.boilTimeMins, 10) || 60
      };
      
      if (recipe) {
        await updateRecipe.mutateAsync({ id: recipe.id, data });
      } else {
        await createRecipe.mutateAsync({ data });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/recipes"] });
      onOpenChange(false);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{recipe ? 'Editar Receita' : 'Nova Receita'}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
          <div className="col-span-1 sm:col-span-2 space-y-2">
            <Label>Nome</Label>
            <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="ex: IPA Cósmica" />
          </div>
          <div className="space-y-2">
            <Label>Estilo</Label>
            <Input value={formData.style} onChange={e => setFormData({...formData, style: e.target.value})} placeholder="ex: American IPA" />
          </div>
          <div className="space-y-2">
            <Label>Tempo de Fervura (min)</Label>
            <Input type="number" value={formData.boilTimeMins} onChange={e => setFormData({...formData, boilTimeMins: e.target.value})} />
          </div>
          <div className="col-span-1 sm:col-span-2 space-y-2">
            <Label>Descrição</Label>
            <Textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
          </div>
          <div className="col-span-1 sm:col-span-2 space-y-2">
            <Label>Maltes (JSON ou texto)</Label>
            <Textarea className="font-mono text-xs" value={formData.malts} onChange={e => setFormData({...formData, malts: e.target.value})} />
          </div>
          <div className="col-span-1 sm:col-span-2 space-y-2">
            <Label>Lúpulos (JSON ou texto)</Label>
            <Textarea className="font-mono text-xs" value={formData.hops} onChange={e => setFormData({...formData, hops: e.target.value})} />
          </div>
          <div className="col-span-1 sm:col-span-2 space-y-2">
            <Label>Notas do Processo</Label>
            <Textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
          </div>
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!formData.name || !formData.style}>{recipe ? 'Salvar Alterações' : 'Criar Receita'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
