import { useState } from "react";
import {
  useListUsers,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  User,
  UserInputRole
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users as UsersIcon, Plus, UserCircle, Edit, Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

export default function Users() {
  const { data: users, isLoading } = useListUsers();
  const deleteUser = useDeleteUser();
  const queryClient = useQueryClient();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const handleDelete = async (id: number) => {
    if (confirm("Revogar o acesso deste operador?")) {
      await deleteUser.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    }
  };

  const getRoleBadge = (role: string) => {
    switch(role) {
      case 'admin': return <Badge className="bg-purple-500 hover:bg-purple-600 uppercase text-[10px]">Admin</Badge>;
      case 'brewmaster': return <Badge className="bg-primary text-primary-foreground hover:bg-primary/90 uppercase text-[10px]">Mestre Cervejeiro</Badge>;
      case 'operator': return <Badge className="bg-blue-500 hover:bg-blue-600 uppercase text-[10px]">Operador</Badge>;
      default: return <Badge variant="outline" className="uppercase text-[10px]">Visitante</Badge>;
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-wrap items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <UsersIcon className="w-7 h-7 sm:w-8 sm:h-8 text-primary shrink-0" />
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Controle de Acesso</h1>
            <p className="text-muted-foreground text-sm mt-1">Gerencie operadores e permissões da plataforma.</p>
          </div>
        </div>
        <Button onClick={() => { setEditingUser(null); setIsModalOpen(true); }} className="gap-2 font-bold tracking-widest uppercase text-xs">
          <Plus className="w-4 h-4" /> Cadastrar Operador
        </Button>
      </div>

      <Card className="bg-sidebar border-border/50 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-background border-b-2 border-border">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-12 sm:w-16"></TableHead>
                <TableHead className="font-bold tracking-widest uppercase text-xs">Operador</TableHead>
                <TableHead className="font-bold tracking-widest uppercase text-xs">Função</TableHead>
                <TableHead className="font-bold tracking-widest uppercase text-xs">Status</TableHead>
                <TableHead className="font-bold tracking-widest uppercase text-xs hidden sm:table-cell">Último Acesso</TableHead>
                <TableHead className="text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8">Carregando usuários...</TableCell></TableRow>
              ) : users?.map(user => (
                <TableRow key={user.id} className="border-border/50">
                  <TableCell>
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded bg-background border border-border/50 flex items-center justify-center">
                      <UserCircle className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-bold text-foreground">{user.name}</div>
                    <div className="text-xs font-mono text-muted-foreground truncate max-w-[120px] sm:max-w-none">{user.email}</div>
                  </TableCell>
                  <TableCell>
                    {getRoleBadge(user.role)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${user.active ? 'bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]' : 'bg-gray-600'}`} />
                      <span className="text-xs uppercase font-mono tracking-widest text-muted-foreground">
                        {user.active ? 'Ativo' : 'Suspenso'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs font-mono text-muted-foreground hidden sm:table-cell">
                    {user.lastLogin ? format(new Date(user.lastLogin), 'yyyy-MM-dd HH:mm') : 'Nunca'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1 sm:gap-2">
                      <Button variant="ghost" size="icon" onClick={() => { setEditingUser(user); setIsModalOpen(true); }}>
                        <Edit className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(user.id)}>
                        <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {isModalOpen && (
        <UserModal open={isModalOpen} onOpenChange={setIsModalOpen} user={editingUser} />
      )}
    </div>
  );
}

function UserModal({ open, onOpenChange, user }: { open: boolean, onOpenChange: (open: boolean) => void, user: User | null }) {
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    role: (user?.role || "operator") as UserInputRole,
    active: user ? user.active : true
  });

  const handleSubmit = async () => {
    try {
      if (user) {
        await updateUser.mutateAsync({ id: user.id, data: { name: formData.name, role: formData.role as any, active: formData.active } });
      } else {
        await createUser.mutateAsync({ data: { name: formData.name, email: formData.email, role: formData.role } });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      onOpenChange(false);
    } catch(e) {
      console.error(e);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:w-auto max-w-md">
        <DialogHeader>
          <DialogTitle>{user ? 'Modificar Acesso do Operador' : 'Cadastrar Novo Operador'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="uppercase tracking-widest text-[10px] text-muted-foreground">Nome Completo</Label>
            <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Ana Silva" className="bg-sidebar" />
          </div>
          <div className="space-y-2">
            <Label className="uppercase tracking-widest text-[10px] text-muted-foreground">E-mail / Login</Label>
            <Input value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} disabled={!!user} placeholder="ana@cervejaria.com.br" className="bg-sidebar font-mono text-sm disabled:opacity-50" />
          </div>
          <div className="space-y-2">
            <Label className="uppercase tracking-widest text-[10px] text-muted-foreground">Nível de Acesso</Label>
            <select 
              value={formData.role}
              onChange={e => setFormData({...formData, role: e.target.value as UserInputRole})}
              className="flex h-9 w-full rounded-md border border-input bg-sidebar px-3 py-1 text-sm shadow-sm"
            >
              <option value="admin">Administrador do Sistema</option>
              <option value="brewmaster">Mestre Cervejeiro</option>
              <option value="operator">Operador de Produção</option>
              <option value="visitor">Visitante (somente leitura)</option>
            </select>
          </div>
          {user && (
            <div className="flex items-center gap-2 pt-2">
              <input 
                type="checkbox" 
                id="active-toggle"
                checked={formData.active} 
                onChange={e => setFormData({...formData, active: e.target.checked})}
                className="rounded border-input bg-sidebar"
              />
              <Label htmlFor="active-toggle" className="cursor-pointer">Conta Ativa</Label>
            </div>
          )}
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!formData.name || (!user && !formData.email)} className="font-bold uppercase tracking-widest text-xs">
            {user ? 'Salvar Alterações' : 'Cadastrar Acesso'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
