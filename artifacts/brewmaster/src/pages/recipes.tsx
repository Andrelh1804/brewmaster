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
    if (confirm("Delete this recipe?")) {
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
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Recipes Library</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage formulations and brewing parameters.</p>
        </div>
        <Button onClick={openNew} className="gap-2 font-bold">
          <Plus className="w-4 h-4" /> New Recipe
        </Button>
      </div>

      <div className="flex items-center gap-4 bg-sidebar p-2 rounded-md border border-border/50 w-full max-w-md">
        <Search className="w-5 h-5 text-muted-foreground ml-2" />
        <Input 
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="Search recipes..." 
          className="border-0 focus-visible:ring-0 shadow-none bg-transparent"
        />
      </div>

      {isLoading ? (
        <div>Loading recipes...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRecipes?.map(recipe => (
            <Card key={recipe.id} className="bg-sidebar hover:bg-sidebar/80 transition-colors border-border/50 group">
              <CardContent className="p-6 flex flex-col h-full relative">
                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(recipe)} className="p-2 bg-background rounded-md text-muted-foreground hover:text-primary transition-colors border">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(recipe.id)} className="p-2 bg-background rounded-md text-muted-foreground hover:text-destructive transition-colors border">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="mb-4">
                  <Badge variant="outline" className="mb-2 bg-background">{recipe.style}</Badge>
                  <h3 className="text-xl font-bold text-primary truncate" title={recipe.name}>{recipe.name}</h3>
                </div>
                
                <div className="space-y-2 flex-1">
                  <p className="text-sm text-muted-foreground line-clamp-2 min-h-[40px]">
                    {recipe.description || "No description provided."}
                  </p>
                  
                  <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-border/50">
                    <div>
                      <div className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mb-1">Boil Time</div>
                      <div className="font-mono text-sm">{recipe.boilTimeMins ?? '-'} min</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mb-1">Created</div>
                      <div className="font-mono text-sm">{new Date(recipe.createdAt).toLocaleDateString()}</div>
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
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{recipe ? 'Edit Recipe' : 'Create New Recipe'}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-4">
          <div className="col-span-2 space-y-2">
            <Label>Name</Label>
            <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Cosmic IPA" />
          </div>
          <div className="space-y-2">
            <Label>Style</Label>
            <Input value={formData.style} onChange={e => setFormData({...formData, style: e.target.value})} placeholder="e.g. American IPA" />
          </div>
          <div className="space-y-2">
            <Label>Boil Time (mins)</Label>
            <Input type="number" value={formData.boilTimeMins} onChange={e => setFormData({...formData, boilTimeMins: e.target.value})} />
          </div>
          <div className="col-span-2 space-y-2">
            <Label>Description</Label>
            <Textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
          </div>
          <div className="col-span-2 space-y-2">
            <Label>Malts (JSON or text)</Label>
            <Textarea className="font-mono text-xs" value={formData.malts} onChange={e => setFormData({...formData, malts: e.target.value})} />
          </div>
          <div className="col-span-2 space-y-2">
            <Label>Hops (JSON or text)</Label>
            <Textarea className="font-mono text-xs" value={formData.hops} onChange={e => setFormData({...formData, hops: e.target.value})} />
          </div>
          <div className="col-span-2 space-y-2">
            <Label>Process Notes</Label>
            <Textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!formData.name || !formData.style}>{recipe ? 'Save Changes' : 'Create Recipe'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
