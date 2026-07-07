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
    if (confirm("Revoke access for this operator?")) {
      await deleteUser.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    }
  };

  const getRoleBadge = (role: string) => {
    switch(role) {
      case 'admin': return <Badge className="bg-purple-500 hover:bg-purple-600 uppercase text-[10px]">Admin</Badge>;
      case 'brewmaster': return <Badge className="bg-primary text-primary-foreground hover:bg-primary/90 uppercase text-[10px]">Brewmaster</Badge>;
      case 'operator': return <Badge className="bg-blue-500 hover:bg-blue-600 uppercase text-[10px]">Operator</Badge>;
      default: return <Badge variant="outline" className="uppercase text-[10px]">Visitor</Badge>;
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <UsersIcon className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Access Control</h1>
            <p className="text-muted-foreground text-sm mt-1">Manage platform operators and permissions.</p>
          </div>
        </div>
        <Button onClick={() => { setEditingUser(null); setIsModalOpen(true); }} className="gap-2 font-bold tracking-widest uppercase text-xs">
          <Plus className="w-4 h-4" /> Provision User
        </Button>
      </div>

      <Card className="bg-sidebar border-border/50 overflow-hidden shadow-xl">
        <Table>
          <TableHeader className="bg-background border-b-2 border-border">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-16"></TableHead>
              <TableHead className="font-bold tracking-widest uppercase text-xs">Operator</TableHead>
              <TableHead className="font-bold tracking-widest uppercase text-xs">Role</TableHead>
              <TableHead className="font-bold tracking-widest uppercase text-xs">Status</TableHead>
              <TableHead className="font-bold tracking-widest uppercase text-xs">Last Login</TableHead>
              <TableHead className="text-right"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8">Loading users...</TableCell></TableRow>
            ) : users?.map(user => (
              <TableRow key={user.id} className="border-border/50">
                <TableCell>
                  <div className="w-8 h-8 rounded bg-background border border-border/50 flex items-center justify-center">
                    <UserCircle className="w-5 h-5 text-muted-foreground" />
                  </div>
                </TableCell>
                <TableCell>
                  <div className="font-bold text-foreground">{user.name}</div>
                  <div className="text-xs font-mono text-muted-foreground">{user.email}</div>
                </TableCell>
                <TableCell>
                  {getRoleBadge(user.role)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${user.active ? 'bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]' : 'bg-gray-600'}`} />
                    <span className="text-xs uppercase font-mono tracking-widest text-muted-foreground">
                      {user.active ? 'Active' : 'Suspended'}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-xs font-mono text-muted-foreground">
                  {user.lastLogin ? format(new Date(user.lastLogin), 'yyyy-MM-dd HH:mm') : 'Never'}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{user ? 'Modify Operator Access' : 'Provision New Operator'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="uppercase tracking-widest text-[10px] text-muted-foreground">Full Name</Label>
            <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Jane Doe" className="bg-sidebar" />
          </div>
          <div className="space-y-2">
            <Label className="uppercase tracking-widest text-[10px] text-muted-foreground">Email / Login ID</Label>
            <Input value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} disabled={!!user} placeholder="jane@brewery.com" className="bg-sidebar font-mono text-sm disabled:opacity-50" />
          </div>
          <div className="space-y-2">
            <Label className="uppercase tracking-widest text-[10px] text-muted-foreground">Clearance Level</Label>
            <select 
              value={formData.role}
              onChange={e => setFormData({...formData, role: e.target.value as UserInputRole})}
              className="flex h-9 w-full rounded-md border border-input bg-sidebar px-3 py-1 text-sm shadow-sm"
            >
              <option value="admin">System Administrator</option>
              <option value="brewmaster">Brewmaster</option>
              <option value="operator">Floor Operator</option>
              <option value="visitor">Read-only Visitor</option>
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
              <Label htmlFor="active-toggle" className="cursor-pointer">Account Active</Label>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!formData.name || (!user && !formData.email)} className="font-bold uppercase tracking-widest text-xs">
            {user ? 'Save Changes' : 'Provision Access'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
