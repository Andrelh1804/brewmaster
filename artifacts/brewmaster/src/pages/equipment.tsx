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
import { Plus, Edit, Trash2, Container, Server, Cpu } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export default function EquipmentPage() {
  const { data: equipmentList, isLoading } = useListEquipment();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEq, setEditingEq] = useState<Equipment | null>(null);

  const deleteEq = useDeleteEquipment();
  const queryClient = useQueryClient();

  const handleDelete = async (id: number) => {
    if(confirm("Remove this equipment?")) {
      await deleteEq.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: ["/api/equipment"] });
    }
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'operational': return <Badge variant="success" className="uppercase text-[10px]">Operational</Badge>;
      case 'maintenance': return <Badge variant="warning" className="uppercase text-[10px]">Maintenance</Badge>;
      case 'error': return <Badge variant="destructive" className="uppercase text-[10px]">Error</Badge>;
      default: return <Badge variant="outline" className="uppercase text-[10px]">Offline</Badge>;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Equipment Fleet</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage physical tanks, pumps, and hardware nodes.</p>
        </div>
        <Button onClick={() => { setEditingEq(null); setIsModalOpen(true); }} className="gap-2 font-bold">
          <Plus className="w-4 h-4" /> Add Hardware
        </Button>
      </div>

      {isLoading ? (
        <div>Loading equipment...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {equipmentList?.map(eq => (
            <Card key={eq.id} className="bg-sidebar border-border/50 group hover:border-primary/50 transition-colors">
              <CardContent className="p-5">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex gap-3 items-center">
                    <div className="p-2 bg-background border border-border/50 rounded-md">
                      <Container className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground leading-tight">{eq.name}</h3>
                      <div className="text-[10px] text-muted-foreground uppercase font-mono tracking-widest">{eq.type.replace('_', ' ')}</div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className={`w-2 h-2 rounded-full ${eq.connected ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-gray-600'}`} />
                    {getStatusBadge(eq.status)}
                  </div>
                </div>

                <div className="bg-background/50 rounded p-3 mb-4 space-y-2 border border-border/30">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-muted-foreground">Firmware</span>
                    <span>{eq.firmwareVersion || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-muted-foreground">Location</span>
                    <span>{eq.location || 'N/A'}</span>
                  </div>
                </div>

                <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="outline" size="sm" onClick={() => { setEditingEq(eq); setIsModalOpen(true); }}>
                    <Edit className="w-3 h-3 mr-1" /> Edit
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{equipment ? 'Edit Equipment Node' : 'Register Hardware Node'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Name Identifier</Label>
            <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Fv-04" />
          </div>
          <div className="space-y-2">
            <Label>Hardware Type</Label>
            <select 
              value={formData.type}
              onChange={e => setFormData({...formData, type: e.target.value})}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            >
              <option value="fermenter">Fermenter</option>
              <option value="kettle">Kettle</option>
              <option value="mash_tun">Mash Tun</option>
              <option value="pump">Pump</option>
              <option value="valve">Valve</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Firmware Version</Label>
              <Input value={formData.firmwareVersion} onChange={e => setFormData({...formData, firmwareVersion: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Location / Zone</Label>
              <Input value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!formData.name}>Save Config</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
