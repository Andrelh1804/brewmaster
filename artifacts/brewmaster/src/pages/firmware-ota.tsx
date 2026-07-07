import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  useListFirmwareVersions,
  useCreateFirmwareVersion,
  useDeleteFirmwareVersion,
  useListOtaJobs,
  useTriggerOtaUpdate,
  useCancelOtaJob,
  useListDevices,
  getListFirmwareVersionsQueryKey,
  getListOtaJobsQueryKey,
  getListDevicesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Upload, Trash2, Plus, Zap, XCircle, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const OTA_STATUS_STYLES: Record<string, { color: string; icon: React.ReactNode }> = {
  pending:     { color: "text-yellow-400", icon: <Clock className="w-3.5 h-3.5" /> },
  downloading: { color: "text-blue-400",   icon: <Upload className="w-3.5 h-3.5" /> },
  installing:  { color: "text-purple-400", icon: <Zap className="w-3.5 h-3.5" /> },
  completed:   { color: "text-emerald-400",icon: <CheckCircle className="w-3.5 h-3.5" /> },
  failed:      { color: "text-red-400",    icon: <XCircle className="w-3.5 h-3.5" /> },
  cancelled:   { color: "text-slate-400",  icon: <AlertCircle className="w-3.5 h-3.5" /> },
};

export default function FirmwareOta() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showNewFw, setShowNewFw] = useState(false);
  const [showNewOta, setShowNewOta] = useState(false);
  const [fwForm, setFwForm] = useState({ version: "", description: "", url: "", stable: false });
  const [otaForm, setOtaForm] = useState({ deviceId: "", firmwareVersionId: "" });

  const { data: firmware } = useListFirmwareVersions({ query: { queryKey: getListFirmwareVersionsQueryKey() } });
  const { data: otaJobs } = useListOtaJobs({ query: { refetchInterval: 5000, queryKey: getListOtaJobsQueryKey() } });
  const { data: devices } = useListDevices({ query: { queryKey: getListDevicesQueryKey() } });

  const createFw = useCreateFirmwareVersion();
  const deleteFw = useDeleteFirmwareVersion();
  const triggerOta = useTriggerOtaUpdate();
  const cancelOta = useCancelOtaJob();

  const handleCreateFw = async () => {
    if (!fwForm.version) return;
    try {
      await createFw.mutateAsync({ data: { version: fwForm.version, description: fwForm.description || undefined, url: fwForm.url || undefined, stable: fwForm.stable } });
      queryClient.invalidateQueries({ queryKey: getListFirmwareVersionsQueryKey() });
      toast({ title: "Firmware registrado" });
      setShowNewFw(false);
      setFwForm({ version: "", description: "", url: "", stable: false });
    } catch { toast({ title: "Erro", variant: "destructive" }); }
  };

  const handleDeleteFw = async (id: number) => {
    if (!confirm("Remover esta versão de firmware?")) return;
    await deleteFw.mutateAsync({ id });
    queryClient.invalidateQueries({ queryKey: getListFirmwareVersionsQueryKey() });
  };

  const handleTriggerOta = async () => {
    if (!otaForm.deviceId) return;
    const fw = firmware?.find((f) => String(f.id) === otaForm.firmwareVersionId);
    if (!fw) { toast({ title: "Selecione um firmware", variant: "destructive" }); return; }
    try {
      await triggerOta.mutateAsync({
        id: Number(otaForm.deviceId),
        data: { targetVersion: fw.version, firmwareVersionId: fw.id },
      });
      queryClient.invalidateQueries({ queryKey: getListOtaJobsQueryKey() });
      toast({ title: "OTA iniciado" });
      setShowNewOta(false);
    } catch { toast({ title: "Erro ao iniciar OTA", variant: "destructive" }); }
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
          <Upload className="w-7 h-7 text-primary" /> Firmware & OTA
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Gerenciar versões de firmware e atualizações over-the-air</p>
      </div>

      {/* Firmware versions */}
      <Card className="bg-sidebar border-border/50">
        <CardHeader className="pb-2 px-4 pt-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Versões de Firmware</CardTitle>
            <Button size="sm" onClick={() => setShowNewFw(true)} className="gap-1.5 text-xs h-7">
              <Plus className="w-3 h-3" /> Nova Versão
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {!firmware?.length ? (
            <p className="text-sm text-muted-foreground">Nenhuma versão registrada.</p>
          ) : (
            <div className="space-y-2">
              {firmware.map((fw) => (
                <div key={fw.id} className="flex items-center gap-3 border border-border/40 rounded-lg p-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <code className="font-mono font-bold text-sm text-primary">{fw.version}</code>
                      {fw.stable && <Badge className="text-[10px] bg-emerald-900 text-emerald-300 px-1.5">Estável</Badge>}
                    </div>
                    {fw.description && <p className="text-xs text-muted-foreground mt-0.5">{fw.description}</p>}
                    <p className="text-[10px] text-muted-foreground">{format(new Date(fw.releaseDate), "dd/MM/yyyy")}</p>
                  </div>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => handleDeleteFw(fw.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* OTA Jobs */}
      <Card className="bg-sidebar border-border/50">
        <CardHeader className="pb-2 px-4 pt-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Jobs OTA</CardTitle>
            <Button size="sm" onClick={() => setShowNewOta(true)} className="gap-1.5 text-xs h-7">
              <Zap className="w-3 h-3" /> Iniciar OTA
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {!otaJobs?.length ? (
            <p className="text-sm text-muted-foreground">Nenhum job OTA criado.</p>
          ) : (
            <div className="space-y-2">
              {otaJobs.map((job) => {
                const s = OTA_STATUS_STYLES[job.status] ?? OTA_STATUS_STYLES["pending"]!;
                return (
                  <div key={job.id} className="flex items-center gap-3 border border-border/40 rounded-lg p-3">
                    <div className={cn(s.color)}>{s.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">Dispositivo #{job.deviceId}</span>
                        <code className="text-xs text-primary font-mono">{job.targetVersion}</code>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(job.startedAt), "dd/MM HH:mm")}
                        {job.completedAt && <> · concluído {format(new Date(job.completedAt), "HH:mm")}</>}
                      </div>
                      {job.status === "downloading" || job.status === "installing" ? (
                        <div className="mt-1 h-1.5 bg-muted rounded-full overflow-hidden w-32">
                          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${job.progress}%` }} />
                        </div>
                      ) : null}
                      {job.error && <p className="text-[11px] text-red-400">{job.error}</p>}
                    </div>
                    {(job.status === "pending" || job.status === "downloading") && (
                      <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={async () => {
                        await cancelOta.mutateAsync({ id: job.id });
                        queryClient.invalidateQueries({ queryKey: getListOtaJobsQueryKey() });
                      }}>Cancelar</Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* New firmware dialog */}
      <Dialog open={showNewFw} onOpenChange={setShowNewFw}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Nova Versão de Firmware</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Versão *</Label><Input placeholder="v2.1.0" value={fwForm.version} onChange={(e) => setFwForm({ ...fwForm, version: e.target.value })} className="mt-1" /></div>
            <div><Label>Descrição</Label><Input placeholder="Melhorias MQTT..." value={fwForm.description} onChange={(e) => setFwForm({ ...fwForm, description: e.target.value })} className="mt-1" /></div>
            <div><Label>URL do arquivo</Label><Input placeholder="https://..." value={fwForm.url} onChange={(e) => setFwForm({ ...fwForm, url: e.target.value })} className="mt-1" /></div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="stable" checked={fwForm.stable} onChange={(e) => setFwForm({ ...fwForm, stable: e.target.checked })} />
              <label htmlFor="stable" className="text-sm">Versão estável</label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowNewFw(false)}>Cancelar</Button>
            <Button onClick={handleCreateFw} disabled={!fwForm.version}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New OTA dialog */}
      <Dialog open={showNewOta} onOpenChange={setShowNewOta}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Iniciar Atualização OTA</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Dispositivo *</Label>
              <Select value={otaForm.deviceId} onValueChange={(v) => setOtaForm({ ...otaForm, deviceId: v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                <SelectContent>{(devices ?? []).map((d) => <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Firmware *</Label>
              <Select value={otaForm.firmwareVersionId} onValueChange={(v) => setOtaForm({ ...otaForm, firmwareVersionId: v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Selecionar versão..." /></SelectTrigger>
                <SelectContent>{(firmware ?? []).map((f) => <SelectItem key={f.id} value={String(f.id)}>{f.version}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowNewOta(false)}>Cancelar</Button>
            <Button onClick={handleTriggerOta} disabled={!otaForm.deviceId || !otaForm.firmwareVersionId}>Iniciar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
