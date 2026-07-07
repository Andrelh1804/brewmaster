import { useState } from "react";
import {
  useListEquipment,
  useCreateEquipment,
  useUpdateEquipment,
  useDeleteEquipment,
  Equipment
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Edit, Trash2, Container } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export default function EquipmentPage() {
  const { data: equipmentList, isLoading } = useListEquipment();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEq, setEditingEq] = useState<Equipment | null>(null);

  const deleteEq = useDeleteEquipment();
  const queryClient = useQueryClient();

  const handleDelete = async (id: number) => {
    if(confirm("Remover este equipamento?")) {
      await deleteEq.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: ["/api/equipment"] });
    }
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'operational': return <Badge variant="success" className="uppercase text-[10px]">Operacional</Badge>;
      case 'maintenance': return <Badge variant="warning" className="uppercase text-[10px]">Manutenção</Badge>;
      case 'error': return <Badge variant="destructive" className="uppercase text-[10px]">Erro</Badge>;
      default: return <Badge variant="outline" className="uppercase text-[10px]">Offline</Badge>;
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-wrap items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Frota de Equipamentos</h1>
          <p className="text-muted-foreground text-sm mt-1">Gerencie tanques, bombas e nós de hardware.</p>
        </div>
        <Button onClick={() => { setEditingEq(null); setIsModalOpen(true); }} className="gap-2 font-bold">
          <Plus className="w-4 h-4" /> Adicionar Hardware
        </Button>
      </div>

      {isLoading ? (
        <div>Carregando equipamentos...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
          {equipmentList?.map(eq => (
            <Card key={eq.id} className="bg-sidebar border-border/50 group hover:border-primary/50 transition-colors">
              <CardContent className="p-4 sm:p-5">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex gap-3 items-center min-w-0">
                    <div className="p-2 bg-background border border-border/50 rounded-md shrink-0">
                      <Container className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-foreground leading-tight truncate">{eq.name}</h3>
                      <div className="text-[10px] text-muted-foreground uppercase font-mono tracking-widest">{eq.type.replace('_', ' ')}</div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0 ml-2">
                    <div className={`w-2 h-2 rounded-full ${eq.connected ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-gray-600'}`} />
                    {getStatusBadge(eq.status)}
                  </div>
                </div>

                <div className="bg-background/50 rounded p-3 mb-4 space-y-2 border border-border/30">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-muted-foreground">Firmware</span>
                    <span>{eq.firmwareVersion || 'N/D'}</span>
                  </div>
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-muted-foreground">Localização</span>
                    <span>{eq.location || 'N/D'}</span>
                  </div>
                </div>

                <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="outline" size="sm" onClick={() => { setEditingEq(eq); setIsModalOpen(true); }}>
                    <Edit className="w-3 h-3 mr-1" /> Editar
                  </Button>
                  <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive hover:text-destructive-foreground border-destructive/20" onClick={() => handleDelete(eq.id)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {isModalOpen && (
        <EqModal open={isModalOpen} onOpenChange={setIsModalOpen} equipment={editingEq} />
      )}
    </div>
  );
}

function EqModal({ open, onOpenChange, equipment }: { open: boolean, onOpenChange: (open: boolean) => void, equipment: Equipment | null }) {
  const createEq = useCreateEquipment();
  const updateEq = useUpdateEquipment();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    name: equipment?.name || "",
    type: equipment?.type || "fermenter",
    firmwareVersion: equipment?.firmwareVersion || "v1.0",
    location: equipment?.location || "",
  });

  const handleSubmit = async () => {
    try {
      if (equipment) {
        await updateEq.mutateAsync({ id: equipment.id, data: formData as any });
      } else {
        await createEq.mutateAsync({ data: formData as any });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/equipment"] });
      onOpenChange(false);
    } catch(e) {
      console.error(e);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:w-auto">
        <DialogHeader>
          <DialogTitle>{equipment ? 'Editar Equipamento' : 'Registrar Hardware'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Identificador</Label>
            <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="ex: Fv-04" />
          </div>
          <div className="space-y-2">
            <Label>Tipo de Hardware</Label>
            <select 
              value={formData.type}
              onChange={e => setFormData({...formData, type: e.target.value as import("@workspace/api-client-react").EquipmentType})}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            >
              <option value="fermenter">Fermentador</option>
              <option value="kettle">Panela de Fervura</option>
              <option value="mash_tun">Tina de Mostura</option>
              <option value="pump">Bomba</option>
              <option value="valve">Válvula</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Versão do Firmware</Label>
              <Input value={formData.firmwareVersion} onChange={e => setFormData({...formData, firmwareVersion: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Localização / Zona</Label>
              <Input value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} />
            </div>
          </div>
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!formData.name}>Salvar Configuração</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
