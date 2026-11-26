import { AppLayout } from "@/components/layout/AppLayout";
import { cn } from "@/lib/utils";
import { FileDown, Plus, Search, Loader2, Pencil, Trash2, Cog, Building2, MapPin, Phone, X, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useCallback, useMemo } from "react";
import { machinesAPI, sparePartsAPI, clientsAPI, bomAPI, type BomTemplate } from "@/services/api";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QualityPanel, type QualityCheck } from "@/components/dashboard/QualityPanel";
import { StagesPanel } from "@/components/dashboard/StagesPanel";
import type { MachineRow, StageRow } from "@/components/dashboard/stageUtils";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { generateMachineReportPDF } from "@/lib/generateMachineReportPDF";

const STATUSES = ["Planned", "Under Construction", "Testing", "Ready", "Delivered", "In Service"] as const;

const statusDot: Record<string, string> = {
  Planned: "bg-muted-foreground/50",
  "Under Construction": "bg-warning",
  Testing: "bg-primary",
  Ready: "bg-success",
  Delivered: "bg-foreground dark:bg-muted",
  "In Service": "bg-success",
};

function StatusLabel({ status }: { status: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap">
      <span className={cn("h-2 w-2 rounded-full", statusDot[status])} />
      {status}
    </span>
  );
}

// Six segments, filled up to the current status
function StatusTrack({ status }: { status: string }) {
  const at = STATUSES.indexOf(status as (typeof STATUSES)[number]);
  return (
    <div className="flex gap-1" role="img" aria-label={`Stage ${at + 1} of ${STATUSES.length}: ${status}`}>
      {STATUSES.map((st, i) => (
        <div key={st} className={cn("h-1 flex-1 rounded-full", i <= at ? "bg-foreground" : "bg-foreground/10")} />
      ))}
    </div>
  );
}

interface Machine {
  _id: string;
  machineNo: string;
  name: string;
  type: string;
  status: string;
  client?: string | null;
  clientName: string;
  orderDate: string | null;
  targetDate: string | null;
  deliveredDate: string | null;
  notes: string;
  createdAt?: string;
  registeredBy?: string;
  partsCount?: number;
  partsCost?: number;
  stagesDone?: number;
  stagesTotal?: number;
  progress?: number;
  daysLeft?: number | null;
  overdue?: boolean;
}

interface PlanRow {
  part: string;
  partName: string;
  barcode: string;
  location: string;
  unit: string;
  planned: number;
  issued: number;
  inStock: number;
}

interface MachineDetail extends Machine {
  stages: StageRow[];
  qualityChecks: QualityCheck[];
  plannedParts: { part: string; quantity: number }[];
  plan: PlanRow[];
  partsCost: number;
  parts: { part: string; partName: string; barcode: string; quantity: number; unitPrice: number; cost: number }[];
  history: {
    _id: string;
    type: string;
    partName: string;
    quantity: number;
    takenBy: string;
    reason: string;
    movementDate: string;
  }[];
}

const emptyForm = {
  machineNo: "",
  name: "",
  type: "",
  status: "Planned",
  orderDate: "",
  targetDate: "",
  deliveredDate: "",
  notes: "",
  sellingPrice: "",
};

const toInput = (d: string | null) => (d ? d.slice(0, 10) : "");
const fmt = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const inr = (n: number) => `₹${(n || 0).toLocaleString("en-IN")}`;
const nameCode = (m: { machineNo: string }) => m.machineNo;

export default function MachinesPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const canSeePrice = ["super_admin", "admin", "accountant", "service_manager"].includes(user?.role || "");
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [groupBy, setGroupBy] = useState<"client" | "none">("client");

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [detail, setDetail] = useState<MachineDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [allParts, setAllParts] = useState<{ _id: string; partName: string; barcode?: string }[]>([]);
  const [clientList, setClientList] = useState<{ _id: string; name: string; contactPerson: string; phone: string; city: string }[]>([]);
  const [planPart, setPlanPart] = useState("");
  const [planQty, setPlanQty] = useState("1");
  const [templates, setTemplates] = useState<BomTemplate[]>([]);
  const [templateId, setTemplateId] = useState("");
  const [formTemplate, setFormTemplate] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await machinesAPI.getAll();
      setMachines(res.data);
    } catch (e) {
      toast({ title: "Failed to load machines", description: (e as Error).message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    load();
    sparePartsAPI.getAll().then((r) => setAllParts(r.data)).catch(() => {});
    clientsAPI.getAll().then((r) => setClientList(r.data)).catch(() => {});
    bomAPI.getAll().then((r) => setTemplates(r.data)).catch(() => {});
  }, [load]);

  const patchDetail = async (patch: Record<string, unknown>) => {
    if (!detail) return;
    try {
      await machinesAPI.update(detail._id, patch);
      await openDetail(detail._id, true);
      load();
    } catch (e) {
      toast({ title: "Could not save", description: (e as Error).message, variant: "destructive" });
    }
  };

  const addPlanned = () => {
    if (!detail || !planPart) return;
    const qty = Math.max(1, Math.floor(Number(planQty) || 1));
    const rest = detail.plannedParts.filter((p) => String(p.part) !== planPart);
    const existing = detail.plannedParts.find((p) => String(p.part) === planPart);
    patchDetail({
      plannedParts: [...rest, { part: planPart, quantity: (existing?.quantity || 0) + qty }].map((p) => ({
        part: String(p.part),
        quantity: p.quantity,
      })),
    });
    setPlanPart("");
    setPlanQty("1");
  };

  const applyTemplate = () => {
    const t = templates.find((x) => x._id === templateId);
    if (!detail || !t) return;
    const merged = new Map(detail.plannedParts.map((p) => [String(p.part), p.quantity]));
    for (const p of t.parts) merged.set(String(p.part), Math.max(merged.get(String(p.part)) || 0, p.quantity));
    patchDetail({ plannedParts: [...merged].map(([part, quantity]) => ({ part, quantity })) });
    setTemplateId("");
  };

  const saveTemplate = async () => {
    if (!detail) return;
    const name = window.prompt("Template name", detail.type || detail.name);
    if (!name?.trim()) return;
    try {
      await bomAPI.saveFromMachine(name.trim(), detail._id, detail.type);
      setTemplates((await bomAPI.getAll()).data);
      toast({ title: "Template saved", description: name.trim() });
    } catch (e) {
      toast({ title: "Could not save template", description: (e as Error).message, variant: "destructive" });
    }
  };

  const removePlanned = (partId: string) =>
    detail &&
    patchDetail({
      plannedParts: detail.plannedParts.filter((p) => String(p.part) !== partId).map((p) => ({ part: String(p.part), quantity: p.quantity })),
    });

  const openDetail = async (id: string, quiet = false) => {
    if (!quiet) {
      setDetailLoading(true);
      setDetail({ _id: id } as MachineDetail);
    }
    try {
      const res = await machinesAPI.getById(id);
      setDetail(res.data);
    } catch (e) {
      setDetail(null);
      toast({ title: "Error", description: (e as Error).message, variant: "destructive" });
    } finally {
      setDetailLoading(false);
    }
  };

  // Deep link from the pipeline board: /machines?open=<id>
  useEffect(() => {
    const id = searchParams.get("open");
    if (id) {
      openDetail(id);
      setSearchParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const openForm = (m?: Machine) => {
    setEditingId(m?._id ?? null);
    setForm(
      m
        ? {
            machineNo: m.machineNo,
            name: m.name,
            type: m.type,
            status: m.status,
            orderDate: toInput(m.orderDate),
            targetDate: toInput(m.targetDate),
            deliveredDate: toInput(m.deliveredDate),
            notes: m.notes,
            sellingPrice: (m as { sellingPrice?: number }).sellingPrice ? String((m as { sellingPrice?: number }).sellingPrice) : "",
          }
        : emptyForm,
    );
    setFormTemplate("");
    setFormOpen(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const { sellingPrice, ...rest } = form;
      const payload = {
        ...rest,
        ...(canSeePrice ? { sellingPrice: Number(sellingPrice) || 0 } : {}),
        orderDate: form.orderDate || null,
        targetDate: form.targetDate || null,
        deliveredDate: form.deliveredDate || null,
      };
      const tpl = templates.find((t) => t._id === formTemplate);
      if (editingId) await machinesAPI.update(editingId, payload);
      else await machinesAPI.create({ ...payload, ...(tpl ? { plannedParts: tpl.parts } : {}) });
      toast({ title: editingId ? "Machine updated" : "Machine added" });
      setFormOpen(false);
      load();
      if (editingId && detail?._id === editingId) openDetail(editingId);
    } catch (e) {
      toast({ title: "Could not save", description: (e as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (m: Machine) => {
    if (!confirm(`Delete machine ${m.machineNo}?`)) return;
    try {
      await machinesAPI.delete(m._id);
      toast({ title: "Machine deleted" });
      setDetail(null);
      load();
    } catch (e) {
      toast({ title: "Cannot delete", description: (e as Error).message, variant: "destructive" });
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return machines.filter(
      (m) =>
        (!statusFilter || m.status === statusFilter) &&
        (!q || [m.machineNo, m.name, m.clientName, m.type].some((v) => v?.toLowerCase().includes(q))),
    );
  }, [machines, search, statusFilter]);

  const groups = useMemo(() => {
    if (groupBy === "none") return [{ title: "", items: filtered }];
    const map = new Map<string, Machine[]>();
    filtered.forEach((m) => {
      const k = m.clientName || "No client yet";
      map.set(k, [...(map.get(k) || []), m]);
    });
    return [...map.entries()].map(([title, items]) => ({ title, items }));
  }, [filtered, groupBy]);

  const active = machines.filter((m) => !["Delivered", "In Service"].includes(m.status)).length;
  const overdue = machines.filter((m) => m.overdue).length;
  const dueSoon = machines.filter((m) => !m.overdue && m.daysLeft != null && m.daysLeft <= 7 && !["Delivered", "In Service"].includes(m.status)).length;

  return (
    <AppLayout title="Machines">
      <div className="grid grid-cols-3 gap-3 mb-5" aria-label="Job summary">
        {[
          ["Being built", active],
          ["Due in 7 days", dueSoon],
          ["Overdue", overdue],
        ].map(([l, v]) => (
          <div key={l as string} className="rounded-lg border border-border bg-card p-4">
            <div className="text-xs text-muted-foreground">{l}</div>
            <div className={cn("text-2xl font-medium mt-1 tabular-nums", l === "Overdue" && Number(v) > 0 && "text-destructive")}>{v}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 items-center justify-between mb-5">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex items-center gap-2 bg-card rounded-lg border border-border px-3 py-2 w-64">
            <Search className="w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Machine, client, type..."
              className="bg-transparent outline-none text-sm w-full"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as "client" | "none")}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="client">Group by client</option>
            <option value="none">No grouping</option>
          </select>
        </div>
        <Button onClick={() => openForm()}>
          <Plus className="w-4 h-4 mr-2" /> Add Machine
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-12 text-center text-muted-foreground">
          <Cog className="w-8 h-8 mx-auto mb-2 opacity-50" />
          No machines yet
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((g) => (
            <div key={g.title || "all"}>
              {g.title && (
                <h3 className="flex items-center gap-2 text-sm font-medium mb-2">
                  <Building2 className="w-4 h-4 text-muted-foreground" /> {g.title}
                  <span className="text-muted-foreground font-normal">({g.items.length})</span>
                </h3>
              )}
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {g.items.map((m) => (
                  <button
                    key={m._id}
                    onClick={() => openDetail(m._id)}
                    className="text-left rounded-lg border border-border bg-card p-4 hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <span className="inline-block rounded bg-muted px-1.5 py-0.5 text-xs font-mono text-muted-foreground">
                          {m.machineNo}
                        </span>
                        <div className="font-medium mt-1.5 truncate">{m.name}</div>
                        {m.type && <div className="text-xs text-muted-foreground truncate">{m.type}</div>}
                      </div>
                      <StatusLabel status={m.status} />
                    </div>
                    <div className="mt-4">
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-muted-foreground tabular-nums">
                          {m.stagesTotal ? `${m.stagesDone}/${m.stagesTotal} stages` : "No stages"}
                        </span>
                        <span className="font-medium tabular-nums">{m.progress ?? 0}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-foreground/10 overflow-hidden">
                        <div className="h-full rounded-full bg-foreground" style={{ width: `${m.progress ?? 0}%` }} />
                      </div>
                    </div>
                    <div className="mt-3 flex justify-between text-xs">
                      <span className={cn("tabular-nums", m.overdue ? "text-destructive" : "text-muted-foreground")}>
                        {m.targetDate
                          ? m.overdue
                            ? `Overdue by ${Math.abs(m.daysLeft ?? 0)} d`
                            : ["Delivered", "In Service"].includes(m.status)
                              ? `Delivered ${fmt(m.deliveredDate)}`
                              : `Due ${fmt(m.targetDate)}${m.daysLeft != null ? ` · ${m.daysLeft} d left` : ""}`
                          : "No due date"}
                      </span>
                      <span className="text-muted-foreground tabular-nums">
                        {m.partsCount ?? 0} parts · {inr(m.partsCost ?? 0)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Machine detail */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {detailLoading || !detail?.machineNo ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="font-medium">
                  {detail.name}{" "}
                  <span className="ml-1 rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">{detail.machineNo}</span>
                </DialogTitle>
                <DialogDescription>{detail.type || "Machine"}</DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <StatusLabel status={detail.status} />
                  <span className="text-sm font-medium tabular-nums">{detail.progress ?? 0}% complete</span>
                </div>
                <div className="h-1.5 rounded-full bg-foreground/10 overflow-hidden">
                  <div className="h-full rounded-full bg-foreground" style={{ width: `${detail.progress ?? 0}%` }} />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3 text-sm">
                <div className="rounded-md bg-muted p-3 space-y-1">
                  <div className="text-xs text-muted-foreground">Client</div>
                  {(() => {
                    const cl = clientList.find((c) => c._id === String(detail.client));
                    return (
                      <>
                        <div className="font-medium flex items-center gap-1.5">
                          <Building2 className="w-3 h-3" /> {detail.clientName || "No client"}
                        </div>
                        {cl?.contactPerson && <div className="text-muted-foreground">{cl.contactPerson}</div>}
                        {cl?.city && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <MapPin className="w-3 h-3" /> {cl.city}
                          </div>
                        )}
                        {cl?.phone && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Phone className="w-3 h-3" /> {cl.phone}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
                <div className="rounded-md bg-muted p-3 space-y-1">
                  <div className="text-xs text-muted-foreground">Timeline</div>
                  <div>
                    Registered {fmt(detail.createdAt ?? null)}
                    {detail.registeredBy && <> by {detail.registeredBy}</>}
                  </div>
                  <div>Ordered {fmt(detail.orderDate)}</div>
                  <div className={cn(detail.overdue && "text-destructive")}>
                    Due {fmt(detail.targetDate)}
                    {detail.overdue && ` · ${Math.abs(detail.daysLeft ?? 0)} d overdue`}
                  </div>
                  <div>Delivered {fmt(detail.deliveredDate)}</div>
                </div>
              </div>
              {detail.notes && <p className="text-sm text-muted-foreground">{detail.notes}</p>}

              <StagesPanel machine={detail as unknown as MachineRow} onChanged={() => { openDetail(detail._id, true); load(); }} />

              <QualityPanel machineId={detail._id} checks={detail.qualityChecks ?? []} onChanged={() => { openDetail(detail._id, true); load(); }} />

              <div>
                <h3 className="text-sm font-medium mb-2">Parts plan</h3>
                {detail.plan.length > 0 && (
                  <table className="w-full text-sm border border-border rounded-md overflow-hidden mb-3">
                    <thead className="bg-muted text-left text-xs text-muted-foreground font-normal">
                      <tr>
                        <th className="p-2 font-normal">Part</th>
                        <th className="p-2 text-right font-normal">Planned</th>
                        <th className="p-2 text-right font-normal">Issued</th>
                        <th className="p-2 text-right font-normal">To issue</th>
                        <th className="p-2 text-right font-normal">In stock</th>
                        <th className="p-2 w-8" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {detail.plan.map((r) => {
                        const left = Math.max(r.planned - r.issued, 0);
                        const short = r.inStock < left;
                        return (
                          <tr key={r.part}>
                            <td className="p-2">
                              {r.partName}
                              <div className="text-xs text-muted-foreground">Rack {r.location || "not set"}</div>
                            </td>
                            <td className="p-2 text-right tabular-nums">{r.planned}</td>
                            <td className="p-2 text-right tabular-nums">{r.issued}</td>
                            <td className="p-2 text-right tabular-nums">{left}</td>
                            <td className={cn("p-2 text-right tabular-nums", short && "text-destructive")}>
                              <span className="inline-flex items-center gap-1">
                                {short && <TriangleAlert className="w-3.5 h-3.5" aria-label="Not enough in stock" />}
                                {r.inStock}
                              </span>
                            </td>
                            <td className="p-2">
                              <button onClick={() => removePlanned(r.part)} className="text-muted-foreground hover:text-foreground" aria-label="Remove from plan">
                                <X className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
                <div className="flex gap-2">
                  <select
                    value={planPart}
                    onChange={(e) => setPlanPart(e.target.value)}
                    className="h-10 flex-1 min-w-0 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="">Add a part to the plan</option>
                    {allParts.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.partName} {p.barcode ? `(${p.barcode})` : ""}
                      </option>
                    ))}
                  </select>
                  <Input type="number" min={1} placeholder="Qty" value={planQty} onChange={(e) => setPlanQty(e.target.value)} className="w-20" aria-label="Quantity" />
                  <Button variant="outline" onClick={addPlanned} disabled={!planPart}>
                    Add
                  </Button>
                </div>
                <div className="flex gap-2">
                  <select
                    value={templateId}
                    onChange={(e) => setTemplateId(e.target.value)}
                    className="h-10 flex-1 min-w-0 rounded-md border border-input bg-background px-3 text-sm"
                    aria-label="BOM template"
                  >
                    <option value="">Load from a template</option>
                    {templates.map((t) => (
                      <option key={t._id} value={t._id}>
                        {t.name} ({t.parts.length} parts)
                      </option>
                    ))}
                  </select>
                  <Button variant="outline" onClick={applyTemplate} disabled={!templateId}>
                    Apply
                  </Button>
                  <Button variant="ghost" onClick={saveTemplate} disabled={!detail.plannedParts.length}>
                    Save as template
                  </Button>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-baseline mb-2">
                  <h3 className="text-sm font-medium">Spare parts used</h3>
                  <span className="text-sm text-muted-foreground">
                    Total <span className="font-medium text-foreground tabular-nums">{inr(detail.partsCost ?? 0)}</span>
                  </span>
                </div>
                {detail.parts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nothing issued yet. Choose this machine when taking a part on Rack Scan</p>
                ) : (
                  <table className="w-full text-sm border border-border rounded-md overflow-hidden">
                    <thead className="bg-muted text-left text-xs text-muted-foreground">
                      <tr>
                        <th className="p-2 font-normal">Part</th>
                        <th className="p-2 text-right font-normal">Qty</th>
                        <th className="p-2 text-right font-normal">Unit</th>
                        <th className="p-2 text-right font-normal">Cost</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {detail.parts.map((p) => (
                        <tr key={p.part}>
                          <td className="p-2">
                            {p.partName} <span className="ml-1 text-xs font-mono text-muted-foreground">{p.barcode}</span>
                          </td>
                          <td className="p-2 text-right tabular-nums">{p.quantity}</td>
                          <td className="p-2 text-right tabular-nums">{inr(p.unitPrice)}</td>
                          <td className="p-2 text-right tabular-nums">{inr(p.cost)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {detail.history.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-2">Who took what</h3>
                  <ul className="divide-y divide-border text-sm border border-border rounded-md">
                    {detail.history.map((h) => (
                      <li key={h._id} className="p-2">
                        <span className={cn("tabular-nums", h.type === "ISSUE" ? "text-destructive" : "text-success")}>
                          {h.type === "ISSUE" ? "−" : "+"}
                          {h.quantity}
                        </span>{" "}
                        {h.partName} · {h.takenBy}
                        {h.reason && <> · {h.reason}</>}
                        <div className="text-xs text-muted-foreground">{fmt(h.movementDate)}</div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => generateMachineReportPDF(detail, { showPrice: canSeePrice })}>
                  <FileDown className="w-4 h-4 mr-2" /> Report card
                </Button>
                <Button variant="outline" onClick={() => remove(detail)}>
                  <Trash2 className="w-4 h-4 mr-2" /> Delete
                </Button>
                <Button onClick={() => openForm(detail)}>
                  <Pencil className="w-4 h-4 mr-2" /> Edit
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Add / edit */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit machine" : "Add machine"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-x-4 gap-y-4">
            <div>
              <Label>Job no.</Label>
              <Input value={form.machineNo} onChange={(e) => setForm({ ...form, machineNo: e.target.value })} placeholder="Auto (M-001)" />
            </div>
            <div>
              <Label>Status</Label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {STATUSES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <Label>Machine name *</Label>
              <Input placeholder="Enter name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="col-span-2">
              <Label>Type / model</Label>
              <Input placeholder="e.g. PM-450" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} />
            </div>
            {!editingId && templates.length > 0 && (
              <div className="col-span-2">
                <Label>Parts list (BOM)</Label>
                <select
                  value={formTemplate}
                  onChange={(e) => setFormTemplate(e.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Start empty</option>
                  {templates.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.name} ({t.parts.length} parts)
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <Label>Order date</Label>
              <Input type="date" value={form.orderDate} onChange={(e) => setForm({ ...form, orderDate: e.target.value })} />
            </div>
            <div>
              <Label>Due date</Label>
              <Input type="date" value={form.targetDate} onChange={(e) => setForm({ ...form, targetDate: e.target.value })} />
            </div>
            <div className="col-span-2">
              <Label>Delivered on</Label>
              <Input type="date" value={form.deliveredDate} onChange={(e) => setForm({ ...form, deliveredDate: e.target.value })} />
              <p className="text-xs text-muted-foreground mt-1">Filled in automatically when the status is set to Delivered</p>
            </div>
            {canSeePrice && (
              <div className="col-span-2">
                <Label>Selling price (₹, before GST)</Label>
                <Input type="number" min={0} placeholder="What the client pays for this machine" value={form.sellingPrice} onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })} />
              </div>
            )}
            <div className="col-span-2">
              <Label>Notes</Label>
              <Input placeholder="Any extra notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving || !form.name.trim()}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
