import { useState } from "react";
import {
  useListDevices,
  useCreateDevice,
  useUpdateDevice,
  useDeleteDevice,
  useDeviceHeartbeat,
  getListDevicesQueryKey,
  Device,
  DeviceInputType,
  DeviceUpdateType,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Wifi, WifiOff, Plus, Trash2, Edit, RefreshCw, Heart } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const DEVICE_TYPE_LABELS: Record<string, string> = {
  esp32:         "ESP32",
  sensor_node:   "Nó Sensor",
  actuator_node: "Nó Atuador",
  gateway:       "Gateway",
  controller:    "Controlador",
};

const STATUS_STYLES: Record<string, { badge: string; dot: string; label: string }> = {
  online:  { badge: "bg-emerald-900 text-emerald-300", dot: "bg-emerald-400 animate-pulse", label: "Online" },
  offline: { badge: "bg-slate-800 text-slate-400",     dot: "bg-slate-500",                  label: "Offline" },
  error:   { badge: "bg-red-900 text-red-300",         dot: "bg-red-400 animate-pulse",       label: "Erro" },
  unknown: { badge: "bg-gray-800 text-gray-400",       dot: "bg-gray-500",                    label: "Desconhecido" },
};

interface DeviceForm {
  name: string;
  deviceId: string;
  type: string;
  ipAddress: string;
  firmwareVersion: string;
  location: string;
  notes: string;
}

const emptyForm: DeviceForm = {
  name: "", deviceId: "", type: "esp32",
  ipAddress: "", firmwareVersion: "", location: "", notes: "",
};

export default function Devices() {
  const { data: devices, isLoading } = useListDevices({ query: { refetchInterval: 10000, queryKey: getListDevicesQueryKey() } });
  const createDevice = useCreateDevice();
  const updateDevice = useUpdateDevice();
  const deleteDevice = useDeleteDevice();
  const heartbeat = useDeviceHeartbeat();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [form, setForm] = useState<DeviceForm>(emptyForm);

  const openNew = () => {
    setEditingDevice(null);
    setForm(emptyForm);
    setIsModalOpen(true);
  };

  const openEdit = (device: Device) => {
    setEditingDevice(device);
    setForm({
      name: device.name,
      deviceId: device.deviceId,
      type: device.type,
      ipAddress: device.ipAddress ?? "",
      firmwareVersion: device.firmwareVersion ?? "",
      location: device.location ?? "",
      notes: device.notes ?? "",
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const type = form.type as DeviceInputType;
      if (editingDevice) {
        const payload: { name?: string; type?: DeviceUpdateType; ipAddress?: string; firmwareVersion?: string; location?: string; notes?: string } = {
          name: form.name,
          type: type as DeviceUpdateType,
          ipAddress: form.ipAddress || undefined,
          firmwareVersion: form.firmwareVersion || undefined,
          location: form.location || undefined,
          notes: form.notes || undefined,
        };
        await updateDevice.mutateAsync({ id: editingDevice.id, data: payload });
        toast({ title: "Dispositivo atualizado" });
      } else {
        const payload = {
          name: form.name,
          deviceId: form.deviceId,
          type,
          ipAddress: form.ipAddress || undefined,
          firmwareVersion: form.firmwareVersion || undefined,
          location: form.location || undefined,
          notes: form.notes || undefined,
        };
        await createDevice.mutateAsync({ data: payload });
        toast({ title: "Dispositivo registrado" });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/devices"] });
      setIsModalOpen(false);
    } catch {
      toast({ title: "Erro ao salvar dispositivo", variant: "destructive" });
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Remover dispositivo "${name}"?`)) return;
    try {
      await deleteDevice.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: ["/api/devices"] });
      toast({ title: "Dispositivo removido" });
    } catch {
      toast({ title: "Erro ao remover", variant: "destructive" });
    }
  };

  const handleHeartbeat = async (id: number) => {
    try {
      await heartbeat.mutateAsync({ id, data: {} });
      queryClient.invalidateQueries({ queryKey: ["/api/devices"] });
      toast({ title: "Heartbeat enviado", description: "Dispositivo marcado como online." });
    } catch {
      toast({ title: "Erro no heartbeat", variant: "destructive" });
    }
  };

  const online = devices?.filter((d) => d.status === "online").length ?? 0;
  const offline = devices?.filter((d) => d.status !== "online").length ?? 0;

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Wifi className="w-7 h-7 text-primary" />
            Dispositivos IoT
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Gerenciamento de dispositivos ESP32 e nós de campo</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-emerald-800 text-emerald-100 gap-1"><Wifi className="w-3 h-3" />{online} online</Badge>
          <Badge variant="secondary" className="gap-1"><WifiOff className="w-3 h-3" />{offline} offline</Badge>
          <Button onClick={openNew} className="gap-2 font-bold">
            <Plus className="w-4 h-4" /> Registrar
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground">Carregando dispositivos...</div>
      ) : devices?.length === 0 ? (
        <Card className="border-dashed border-border/50 bg-sidebar/50">
          <CardContent className="p-12 text-center">
            <Wifi className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-bold mb-2">Nenhum dispositivo registrado</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Registre seus ESP32 e nós de campo para monitorar sua planta.
            </p>
            <Button onClick={openNew} className="gap-2">
              <Plus className="w-4 h-4" /> Registrar primeiro dispositivo
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {devices?.map((device) => {
            const statusStyle = STATUS_STYLES[device.status] ?? STATUS_STYLES["unknown"];
            return (
              <Card key={device.id} className="bg-sidebar border-border/50 hover:border-primary/30 transition-all group">
                <CardHeader className="pb-2 px-4 pt-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className={cn("h-2.5 w-2.5 rounded-full shrink-0 mt-1", statusStyle.dot)} />
                      <div>
                        <CardTitle className="text-sm font-bold">{device.name}</CardTitle>
                        <div className="text-[10px] text-muted-foreground font-mono mt-0.5">{device.deviceId}</div>
                      </div>
                    </div>
                    <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-bold", statusStyle.badge)}>
                      {statusStyle.label}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-2">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    <div>
                      <span className="text-muted-foreground">Tipo:</span>
                      <span className="ml-1 font-medium">{DEVICE_TYPE_LABELS[device.type] ?? device.type}</span>
                    </div>
                    {device.ipAddress && (
                      <div>
                        <span className="text-muted-foreground">IP:</span>
                        <span className="ml-1 font-mono">{device.ipAddress}</span>
                      </div>
                    )}
                    {device.firmwareVersion && (
                      <div>
                        <span className="text-muted-foreground">FW:</span>
                        <span className="ml-1 font-mono">{device.firmwareVersion}</span>
                      </div>
                    )}
                    {device.rssi !== null && device.rssi !== undefined && (
                      <div>
                        <span className="text-muted-foreground">RSSI:</span>
                        <span className="ml-1 font-mono">{device.rssi} dBm</span>
                      </div>
                    )}
                    {device.location && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">📍</span>
                        <span className="ml-1">{device.location}</span>
                      </div>
                    )}
                    {device.lastHeartbeat && (
                      <div className="col-span-2 text-muted-foreground">
                        Último heartbeat: {format(new Date(device.lastHeartbeat), "dd/MM HH:mm:ss")}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 pt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-[10px] gap-1 flex-1"
                      onClick={() => handleHeartbeat(device.id)}
                    >
                      <Heart className="w-3 h-3" /> Heartbeat
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-[10px] gap-1"
                      onClick={() => openEdit(device)}
                    >
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-[10px] gap-1 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(device.id, device.name)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingDevice ? "Editar Dispositivo" : "Registrar Dispositivo"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2">
                <Label>Nome *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="ESP32 Fermentador 1" />
              </div>
              <div className="space-y-1.5">
                <Label>Device ID *</Label>
                <Input value={form.deviceId} onChange={(e) => setForm({ ...form, deviceId: e.target.value })} placeholder="ESP32-001" className="font-mono" />
              </div>
              <div className="space-y-1.5">
                <Label>Tipo *</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(DEVICE_TYPE_LABELS).map(([v, l]) => (
                      <SelectItem key={v} value={v}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Endereço IP</Label>
                <Input value={form.ipAddress} onChange={(e) => setForm({ ...form, ipAddress: e.target.value })} placeholder="192.168.1.100" className="font-mono" />
              </div>
              <div className="space-y-1.5">
                <Label>Firmware</Label>
                <Input value={form.firmwareVersion} onChange={(e) => setForm({ ...form, firmwareVersion: e.target.value })} placeholder="v1.0.0" />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Localização</Label>
                <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Sala de fermentação, bancada 2" />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Observações</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Notas sobre o dispositivo..." />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!form.name || !form.deviceId}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
