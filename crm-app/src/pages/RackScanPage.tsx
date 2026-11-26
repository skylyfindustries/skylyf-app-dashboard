import { AppLayout } from "@/components/layout/AppLayout";
import { cn } from "@/lib/utils";
import {
  ScanBarcode,
  Search,
  Printer,
  Loader2,
  ArrowUpFromLine,
  ArrowDownToLine,
  MapPin,
  Tags,
  Camera,
} from "lucide-react";
import { PartLabel } from "@/components/PartLabel";
import { CameraScanner } from "@/components/CameraScanner";
import { printLabels } from "@/lib/printLabels";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { sparePartsAPI, machinesAPI, type ServiceRequestToIssue } from "@/services/api";
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

interface Part {
  _id: string;
  partName: string;
  partNumber: string;
  barcode?: string;
  category: string;
  quantity: number;
  unit: string;
  location: string;
  status: string;
}

interface Movement {
  _id: string;
  partName: string;
  barcode: string;
  location: string;
  type: "ISSUE" | "RETURN" | "RECEIVE";
  quantity: number;
  takenBy: string;
  reason: string;
  machine: string;
  notes: string;
  movementDate: string;
  balanceAfter: number | null;
}

type Tab = "scan" | "labels" | "log";

const nowLocalInput = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};

const fmtDate = (s: string) =>
  new Date(s).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export default function RackScanPage() {
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("scan");
  const [parts, setParts] = useState<Part[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);

  // scan tab
  const scanRef = useRef<HTMLInputElement>(null);
  const [scanValue, setScanValue] = useState("");
  const [found, setFound] = useState<Part | null>(null);
  const [partHistory, setPartHistory] = useState<Movement[]>([]);

  // labels tab
  const [labelSearch, setLabelSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // log tab
  const [logSearch, setLogSearch] = useState("");
  const [logType, setLogType] = useState("");
  const [logFrom, setLogFrom] = useState("");
  const [logTo, setLogTo] = useState("");

  // issue/return dialog
  const [dialog, setDialog] = useState<{ mode: "ISSUE" | "RETURN"; part: Part } | null>(null);
  const [form, setForm] = useState({
    quantity: "1",
    takenBy: "",
    reason: "",
    machine: "",
    notes: "",
    movementDate: nowLocalInput(),
    machineId: "",
    serviceRequestId: "",
  });
  const [serviceRequests, setServiceRequests] = useState<ServiceRequestToIssue[]>([]);
  const [saving, setSaving] = useState(false);
  const [machines, setMachines] = useState<{ _id: string; machineNo: string; name: string; clientName: string; status: string }[]>([]);
  const [searchParams, setSearchParams] = useSearchParams();

  const loadParts = useCallback(async () => {
    const res = await sparePartsAPI.getAll();
    let list: Part[] = res.data;
    if (list.some((p) => !p.barcode)) {
      await sparePartsAPI.backfillBarcodes();
      list = (await sparePartsAPI.getAll()).data;
    }
    setParts(list);
  }, []);

  const loadMovements = useCallback(async () => {
    const params: Record<string, string> = {};
    if (logSearch) params.search = logSearch;
    if (logType) params.type = logType;
    if (logFrom) params.from = logFrom;
    if (logTo) params.to = logTo;
    const res = await sparePartsAPI.getMovements(params);
    setMovements(res.data);
  }, [logSearch, logType, logFrom, logTo]);

  useEffect(() => {
    loadParts()
      .catch((e) => toast({ title: "Failed to load parts", description: e.message, variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [loadParts, toast]);

  useEffect(() => {
    if (tab !== "log") return;
    const t = setTimeout(
      () => loadMovements().catch((e) => toast({ title: "Failed to load log", description: e.message, variant: "destructive" })),
      250,
    );
    return () => clearTimeout(t);
  }, [tab, loadMovements, toast]);

  useEffect(() => {
    machinesAPI.getAll().then((r) => setMachines(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (tab === "scan") scanRef.current?.focus();
  }, [tab, found]);

  const openPart = useCallback(
    async (part: Part) => {
      setFound(part);
      try {
        const res = await sparePartsAPI.getMovements({ partId: part._id, limit: "10" });
        setPartHistory(res.data);
      } catch {
        setPartHistory([]);
      }
    },
    [],
  );

  // A USB/Bluetooth barcode scanner types the code and presses Enter
  const lookupCode = useCallback(async (raw: string) => {
    const code = raw.trim();
    if (!code) return;
    try {
      const res = await sparePartsAPI.lookup(code);
      await openPart(res.data);
    } catch (err) {
      setFound(null);
      toast({ title: "Not found", description: (err as Error).message, variant: "destructive" });
    }
  }, [openPart, toast]);

  // Opened from the Spare Parts page: /rack-scan?code=SP-000001&issue=1
  useEffect(() => {
    const code = searchParams.get("code");
    if (!code || loading) return;
    const wantIssue = searchParams.get("issue");
    setSearchParams({}, { replace: true });
    sparePartsAPI
      .lookup(code)
      .then(async (res) => {
        await openPart(res.data);
        if (wantIssue) openDialog("ISSUE", res.data);
      })
      .catch((err) => toast({ title: "Not found", description: (err as Error).message, variant: "destructive" }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const handleScan = (e: React.FormEvent) => {
    e.preventDefault();
    const code = scanValue;
    setScanValue("");
    lookupCode(code);
  };

  const [cameraOpen, setCameraOpen] = useState(false);
  const onCameraScan = useCallback(
    (code: string) => {
      setCameraOpen(false);
      lookupCode(code);
    },
    [lookupCode],
  );

  const openDialog = (mode: "ISSUE" | "RETURN", part: Part) => {
    setForm({ quantity: "1", takenBy: "", reason: "", machine: "", notes: "", movementDate: nowLocalInput(), machineId: "", serviceRequestId: "" });
    setDialog({ mode, part });
    if (mode === "ISSUE") sparePartsAPI.serviceRequests().then((r) => setServiceRequests(r.data)).catch(() => setServiceRequests([]));
  };

  const submitMovement = async () => {
    if (!dialog) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        machineId: form.machineId || undefined,
        serviceRequestId: form.serviceRequestId || undefined,
        quantity: Number(form.quantity),
        movementDate: form.movementDate ? new Date(form.movementDate).toISOString() : undefined,
      };
      const call = dialog.mode === "ISSUE" ? sparePartsAPI.issue : sparePartsAPI.returnPart;
      const res = await call(dialog.part._id, payload);
      toast({
        title: dialog.mode === "ISSUE" ? "Part issued" : "Part returned",
        description: `${dialog.part.partName}: ${res.data.part.quantity} ${res.data.part.unit} left`,
      });
      setDialog(null);
      setParts((prev) => prev.map((p) => (p._id === res.data.part._id ? res.data.part : p)));
      if (found?._id === res.data.part._id) await openPart(res.data.part);
      if (tab === "log") loadMovements();
    } catch (err) {
      toast({ title: "Could not save", description: (err as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const filteredParts = useMemo(() => {
    const q = labelSearch.trim().toLowerCase();
    if (!q) return parts;
    return parts.filter((p) =>
      [p.partName, p.partNumber, p.barcode, p.location, p.category].some((v) => v?.toLowerCase().includes(q)),
    );
  }, [parts, labelSearch]);

  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const doPrint = (list: Part[]) => {
    if (!list.length) return;
    if (!printLabels(list)) toast({ title: "Pop-up blocked", description: "Allow pop-ups to print labels.", variant: "destructive" });
  };

  const tabs: { id: Tab; label: string; icon: typeof ScanBarcode }[] = [
    { id: "scan", label: "Scan / Find", icon: ScanBarcode },
    { id: "labels", label: "Print Labels", icon: Tags },
    { id: "log", label: "Issue Log", icon: ArrowUpFromLine },
  ];

  return (
    <AppLayout title="Rack Scan & Log">
      <div className="flex gap-1 mb-5 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
              tab === t.id ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : tab === "scan" ? (
        <div className="max-w-2xl space-y-5">
          <form onSubmit={handleScan} className="space-y-2">
            <Label htmlFor="scan">Scan a rack label or type a code</Label>
            <div className="flex gap-2">
              <Input
                id="scan"
                ref={scanRef}
                value={scanValue}
                onChange={(e) => setScanValue(e.target.value)}
                placeholder="SP-000123"
                autoComplete="off"
                className="font-mono"
              />
              <Button type="submit">Find</Button>
              <Button type="button" variant="outline" onClick={() => setCameraOpen(true)}>
                <Camera className="w-4 h-4 mr-2" /> Camera
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              A USB or Bluetooth scanner types into this box like a keyboard
            </p>
          </form>

          {found && (
            <div className="rounded-lg border border-border bg-card p-5">
              <div className="grid gap-6 sm:grid-cols-[1fr_auto]">
                <div className="space-y-5 min-w-0">
                  <div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span
                        className={cn(
                          "h-2 w-2 rounded-full",
                          found.status === "In Stock" && "bg-success",
                          found.status === "Low Stock" && "bg-warning",
                          found.status === "Out of Stock" && "bg-destructive",
                        )}
                      />
                      {found.status}
                    </div>
                    <h2 className="text-lg font-medium mt-1">{found.partName}</h2>
                  </div>
                  <dl className="grid grid-cols-2 gap-6">
                    <div>
                      <dt className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="w-3.5 h-3.5" /> Rack
                      </dt>
                      <dd className="text-2xl font-medium mt-1 tabular-nums">{found.location || "Not set"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">In stock</dt>
                      <dd className="text-2xl font-medium mt-1 tabular-nums">
                        {found.quantity} <span className="text-sm font-normal text-muted-foreground">{found.unit}</span>
                      </dd>
                    </div>
                  </dl>
                  <div className="flex gap-2">
                    <Button onClick={() => openDialog("ISSUE", found)} disabled={found.quantity < 1}>
                      <ArrowUpFromLine className="w-4 h-4 mr-2" /> Take part
                    </Button>
                    <Button variant="outline" onClick={() => openDialog("RETURN", found)}>
                      <ArrowDownToLine className="w-4 h-4 mr-2" /> Return
                    </Button>
                  </div>
                </div>
                <PartLabel
                  partName={found.partName}
                  partNumber={found.partNumber}
                  barcode={found.barcode}
                  location={found.location}
                />
              </div>
              <div className="mt-6 border-t border-border pt-4">
                <h3 className="text-sm font-medium mb-2">Recent history</h3>
                {partHistory.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nothing taken or returned yet</p>
                ) : (
                  <ul className="divide-y divide-border text-sm">
                    {partHistory.map((m) => (
                      <li key={m._id} className="py-2 flex items-baseline gap-3">
                        <span className={cn("w-8 tabular-nums", m.type === "ISSUE" ? "text-destructive" : "text-success")}>
                          {m.type === "ISSUE" ? "−" : "+"}
                          {m.quantity}
                        </span>
                        <span className="min-w-0 flex-1 truncate">
                          {m.takenBy}
                          {m.machine && <span className="text-muted-foreground"> · {m.machine}</span>}
                          {m.reason && <span className="text-muted-foreground"> · {m.reason}</span>}
                        </span>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">{fmtDate(m.movementDate)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      ) : tab === "labels" ? (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
            <div className="flex items-center gap-2 bg-card rounded-lg border border-border px-3 py-2 w-full sm:w-80">
              <Search className="w-4 h-4 text-muted-foreground" />
              <input
                value={labelSearch}
                onChange={(e) => setLabelSearch(e.target.value)}
                placeholder="Search part, code, rack..."
                className="bg-transparent outline-none text-sm w-full"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() =>
                  setSelected(selected.size === filteredParts.length ? new Set() : new Set(filteredParts.map((p) => p._id)))
                }
              >
                {selected.size === filteredParts.length && filteredParts.length > 0 ? "Clear" : "Select all"}
              </Button>
              <Button disabled={!selected.size} onClick={() => doPrint(parts.filter((p) => selected.has(p._id)))}>
                <Printer className="w-4 h-4 mr-2" /> Print {selected.size || ""} label{selected.size === 1 ? "" : "s"}
              </Button>
            </div>
          </div>
          <div className="rounded-lg border border-border bg-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted text-left text-xs text-muted-foreground">
                <tr>
                  <th className="p-3 w-10" />
                  <th className="p-3">Part</th>
                  <th className="p-3">Code</th>
                  <th className="p-3">Rack</th>
                  <th className="p-3 text-right">Qty</th>
                  <th className="p-3 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredParts.map((p) => (
                  <tr key={p._id} className="hover:bg-muted/50">
                    <td className="p-3">
                      <input type="checkbox" checked={selected.has(p._id)} onChange={() => toggle(p._id)} />
                    </td>
                    <td className="p-3 font-medium">{p.partName}</td>
                    <td className="p-3 font-mono">{p.barcode}</td>
                    <td className="p-3">{p.location || <span className="text-muted-foreground">Not set</span>}</td>
                    <td className="p-3 text-right">
                      {p.quantity} {p.unit}
                    </td>
                    <td className="p-3">
                      <Button size="icon" variant="ghost" onClick={() => doPrint([p])} title="Print label">
                        <Printer className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {filteredParts.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      No parts found. Add parts on the Spare Parts page first
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground">
            Rack comes from each part's Location field on the Spare Parts page. Labels print as 60 × 36 mm cells
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex items-center gap-2 bg-card rounded-lg border border-border px-3 py-2 w-full sm:w-72">
              <Search className="w-4 h-4 text-muted-foreground" />
              <input
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                placeholder="Part, person, machine, reason..."
                className="bg-transparent outline-none text-sm w-full"
              />
            </div>
            <select
              value={logType}
              onChange={(e) => setLogType(e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">All types</option>
              <option value="ISSUE">Taken</option>
              <option value="RETURN">Returned</option>
            </select>
            <div>
              <Label className="text-xs">From</Label>
              <Input type="date" value={logFrom} onChange={(e) => setLogFrom(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">To</Label>
              <Input type="date" value={logTo} onChange={(e) => setLogTo(e.target.value)} />
            </div>
          </div>
          <div className="rounded-lg border border-border bg-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted text-left text-xs text-muted-foreground">
                <tr>
                  <th className="p-3">When</th>
                  <th className="p-3">Part</th>
                  <th className="p-3">Type</th>
                  <th className="p-3 text-right">Qty</th>
                  <th className="p-3">Taken by</th>
                  <th className="p-3">Machine</th>
                  <th className="p-3">Reason</th>
                  <th className="p-3 text-right">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {movements.map((m) => (
                  <tr key={m._id}>
                    <td className="p-3 whitespace-nowrap">{fmtDate(m.movementDate)}</td>
                    <td className="p-3">
                      <div className="font-medium">{m.partName}</div>
                      <div className="text-xs text-muted-foreground font-mono">{m.barcode}</div>
                    </td>
                    <td className="p-3">
                      <span className={cn("text-xs", m.type === "ISSUE" ? "text-destructive" : "text-success")}>
                        {m.type === "ISSUE" ? "Taken" : m.type === "RETURN" ? "Returned" : "Received"}
                      </span>
                    </td>
                    <td className="p-3 text-right tabular-nums">{m.quantity}</td>
                    <td className="p-3">{m.takenBy}</td>
                    <td className="p-3">{m.machine || "–"}</td>
                    <td className="p-3">{m.reason || "–"}</td>
                    <td className="p-3 text-right tabular-nums">{m.balanceAfter ?? "–"}</td>
                  </tr>
                ))}
                {movements.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-muted-foreground">
                      No entries yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <CameraScanner open={cameraOpen} onClose={() => setCameraOpen(false)} onScan={onCameraScan} />

      <Dialog open={!!dialog} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialog?.mode === "ISSUE" ? "Take spare part" : "Return to stock"}</DialogTitle>
            <DialogDescription>
              {dialog?.part.partName} · {dialog?.part.quantity} {dialog?.part.unit} in stock · rack {dialog?.part.location || "not set"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-x-4 gap-y-4">
            <div>
              <Label>Quantity *</Label>
              <Input placeholder="e.g. 10" type="number" min={1} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
            </div>
            <div>
              <Label>Date & time</Label>
              <Input type="datetime-local" value={form.movementDate} onChange={(e) => setForm({ ...form, movementDate: e.target.value })} />
            </div>
            <div className="col-span-2">
              <Label>{dialog?.mode === "ISSUE" ? "Who is taking it? *" : "Who is returning it? *"}</Label>
              <Input placeholder="e.g. Ramesh (Fitter)" value={form.takenBy} onChange={(e) => setForm({ ...form, takenBy: e.target.value })} />
            </div>
            {dialog?.mode === "ISSUE" && (() => {
              const p = dialog.part as any;
              const line = (sr: ServiceRequestToIssue) =>
                sr.parts.find(
                  (x) =>
                    x.remaining > 0 &&
                    ((x.wooId && p.wooProductId && Number(x.wooId) === Number(p.wooProductId)) ||
                      (x.sku && (x.sku.toLowerCase() === (p.wooSku || p.partNumber || "").toLowerCase())) ||
                      x.name.toLowerCase() === p.partName.toLowerCase()),
                );
              const options = serviceRequests.filter((sr) => line(sr));
              if (!options.length) return null;
              return (
                <div className="col-span-2">
                  <Label>Client service request</Label>
                  <select
                    value={form.serviceRequestId}
                    onChange={(e) => {
                      const sr = options.find((o) => o.id === e.target.value);
                      setForm({
                        ...form,
                        serviceRequestId: e.target.value,
                        takenBy: sr && !form.takenBy ? sr.technician : form.takenBy,
                        reason: sr ? `Service ${sr.number}` : form.reason,
                        quantity: sr ? String(Math.min(line(sr)!.remaining, p.quantity || 1)) : form.quantity,
                      });
                    }}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="">— Not for a service request —</option>
                    {options.map((sr) => (
                      <option key={sr.id} value={sr.id}>
                        {sr.number} · {sr.company} · {sr.technician || "no technician"} (needs {line(sr)!.remaining})
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Paid requests only. The service starts once every listed part is issued.
                  </p>
                </div>
              );
            })()}
            <div className="col-span-2">
              <Label>Machine / client</Label>
              <select
                value={form.machineId}
                onChange={(e) => setForm({ ...form, machineId: e.target.value })}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">— No machine / general use —</option>
                {machines
                  .filter((m) => m.status !== "Delivered" || m._id === form.machineId)
                  .map((m) => (
                    <option key={m._id} value={m._id}>
                      {m.machineNo} · {m.name}
                      {m.clientName ? ` (${m.clientName})` : ""}
                    </option>
                  ))}
              </select>
              <p className="text-xs text-muted-foreground mt-1">Add machines on the Machines page.</p>
            </div>
            <div className="col-span-2">
              <Label>{dialog?.mode === "ISSUE" ? "Why is it needed? *" : "Reason"}</Label>
              <Input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="e.g. Belt broke, replacement" />
            </div>
            <div className="col-span-2">
              <Label>Notes</Label>
              <Input placeholder="Any extra notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>
              Cancel
            </Button>
            <Button onClick={submitMovement} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
