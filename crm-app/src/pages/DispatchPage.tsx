import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Search, Loader2 } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { OrderLines, fmtDate, inr, selectClass, type StockPart } from "@/components/trade/OrderLines";
import { clientsAPI, dispatchAPI, machinesAPI, salesOrdersAPI, sparePartsAPI, type Dispatch, type OrderLine, type SalesOrder } from "@/services/api";

export default function DispatchPage() {
  const { toast } = useToast();
  const [rows, setRows] = useState<Dispatch[]>([]);
  const [clients, setClients] = useState<{ _id: string; name: string }[]>([]);
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [machines, setMachines] = useState<{ _id: string; machineNo: string; name: string; client?: string | null }[]>([]);
  const [parts, setParts] = useState<StockPart[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({ type: "Outward" as "Outward" | "Return", client: "", salesOrder: "", machine: "", vehicleNo: "", driverName: "", lrNo: "", returnReason: "", notes: "" });
  const [lines, setLines] = useState<OrderLine[]>([]);
  const [detail, setDetail] = useState<Dispatch | null>(null);

  const load = useCallback(async () => {
    try {
      const [d, c, o, m, p] = await Promise.all([dispatchAPI.getAll(), clientsAPI.getAll(), salesOrdersAPI.getAll(), machinesAPI.getAll(), sparePartsAPI.getAll()]);
      setRows(d.data);
      setClients(c.data);
      setOrders(o.data);
      setMachines(m.data);
      setParts(p.data);
    } catch (e) {
      toast({ title: "Failed to load dispatch", description: (e as Error).message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);
  useEffect(() => {
    load();
  }, [load]);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => (!type || r.type === type) && (!q || [r.dispatchNo, r.clientName, r.soNo].some((v) => v.toLowerCase().includes(q))));
  }, [rows, search, type]);

  const clientOrders = orders.filter((o) => o.client === f.client && !["Cancelled", "Closed"].includes(o.status));
  const clientMachines = machines.filter((m) => !f.client || m.client === f.client);

  const openNew = () => {
    setF({ type: "Outward", client: "", salesOrder: "", machine: "", vehicleNo: "", driverName: "", lrNo: "", returnReason: "", notes: "" });
    setLines([{ kind: "material", description: "", unit: "pcs", quantity: 1, rate: 0, gstRate: 0 }]);
    setOpen(true);
  };

  // Picking an order copies its material lines so the challan matches what was sold
  const pickOrder = (id: string) => {
    const so = orders.find((o) => o._id === id);
    setF((p) => ({ ...p, salesOrder: id }));
    if (so) setLines(so.items.map((i) => ({ kind: i.kind, part: i.part, description: i.description, unit: i.unit, quantity: i.quantity, rate: i.price || 0, gstRate: 0 })));
  };

  const save = async () => {
    setSaving(true);
    try {
      await dispatchAPI.create({ ...f, salesOrder: f.salesOrder || undefined, machine: f.machine || undefined, items: lines });
      toast({ title: f.type === "Return" ? "Return recorded" : "Dispatch recorded" });
      setOpen(false);
      load();
    } catch (e) {
      toast({ title: "Could not save", description: (e as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const text = (k: "vehicleNo" | "driverName" | "lrNo" | "notes" | "returnReason", label: string) => (
    <div><Label>{label}</Label><Input value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></div>
  );

  return (
    <AppLayout title="Dispatch">
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Challan, client or order" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select value={type} onChange={(e) => setType(e.target.value)} className={`${selectClass} w-40`} aria-label="Type">
            <option value="">All types</option>
            <option>Outward</option>
            <option>Return</option>
          </select>
          <Button className="ml-auto" onClick={openNew}><Plus className="w-4 h-4 mr-1.5" /> New dispatch</Button>
        </div>

        <div className="rounded-xl border bg-card overflow-x-auto">
          {loading ? (
            <div className="p-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : shown.length === 0 ? (
            <p className="p-10 text-center text-sm text-muted-foreground">No dispatches yet</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="p-3 font-normal">Challan</th><th className="p-3 font-normal">Date</th><th className="p-3 font-normal">Client</th><th className="p-3 font-normal">Order</th>
                  <th className="p-3 font-normal">Vehicle</th><th className="p-3 font-normal text-right">Qty</th><th className="p-3 font-normal text-right">Value</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r._id} onClick={() => setDetail(r)} className="border-t cursor-pointer hover:bg-muted/60 transition-colors">
                    <td className="p-3"><span className="plate">{r.dispatchNo}</span></td>
                    <td className="p-3 text-muted-foreground">{fmtDate(r.date)}</td>
                    <td className="p-3">{r.clientName}{r.type === "Return" && <span className="text-xs text-warning"> · return</span>}</td>
                    <td className="p-3 text-muted-foreground">{r.soNo || "—"}</td>
                    <td className="p-3 text-muted-foreground">{r.vehicleNo || "—"}</td>
                    <td className="p-3 text-right tabular-nums">{r.totalQty}</td>
                    <td className="p-3 text-right tabular-nums">{inr(r.totalAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New dispatch</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Type</Label>
              <select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value as "Outward" | "Return" })} className={selectClass}>
                <option value="Outward">Outward delivery</option>
                <option value="Return">Return from client</option>
              </select>
            </div>
            <div>
              <Label>Client</Label>
              <select value={f.client} onChange={(e) => setF({ ...f, client: e.target.value, salesOrder: "", machine: "" })} className={selectClass}>
                <option value="">Choose a client</option>
                {clients.map((c) => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Sales order</Label>
              <select value={f.salesOrder} onChange={(e) => pickOrder(e.target.value)} className={selectClass} disabled={!f.client}>
                <option value="">None</option>
                {clientOrders.map((o) => (
                  <option key={o._id} value={o._id}>{o.soNo} · {o.status}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Machine</Label>
              <select value={f.machine} onChange={(e) => setF({ ...f, machine: e.target.value })} className={selectClass}>
                <option value="">None</option>
                {clientMachines.map((m) => (
                  <option key={m._id} value={m._id}>{m.machineNo} · {m.name}</option>
                ))}
              </select>
            </div>
            {text("vehicleNo", "Vehicle no.")}
            {text("driverName", "Driver")}
            {text("lrNo", "LR no.")}
            {f.type === "Return" ? text("returnReason", "Return reason") : text("notes", "Notes")}
          </div>
          <OrderLines lines={lines} onChange={setLines} parts={parts} priceKey="rate" />
          <p className="text-xs text-muted-foreground">
            {f.type === "Return" ? "Returned stock items go back into inventory." : f.salesOrder ? "Stock was already deducted when the order was marked dispatched." : "Stock items on a challan without an order are deducted from inventory."}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving || !f.client}>{saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-xl">
          {detail && (
            <>
              <DialogHeader><DialogTitle className="font-medium flex items-center gap-3"><span className="plate">{detail.dispatchNo}</span>{detail.clientName}</DialogTitle></DialogHeader>
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
                <span>{fmtDate(detail.date)}</span>
                {detail.soNo && <span>Order {detail.soNo}</span>}
                {detail.machineNo && <span>Machine {detail.machineNo}</span>}
                {detail.vehicleNo && <span>Vehicle {detail.vehicleNo}</span>}
                {detail.driverName && <span>Driver {detail.driverName}</span>}
                {detail.lrNo && <span>LR {detail.lrNo}</span>}
              </div>
              {detail.returnReason && <p className="text-sm">Reason: {detail.returnReason}</p>}
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground"><tr><th className="py-2 font-normal">Item</th><th className="font-normal text-right">Qty</th><th className="font-normal text-right">Rate</th></tr></thead>
                <tbody>
                  {detail.items.map((i, x) => (
                    <tr key={x} className="border-t"><td className="py-2">{i.description}</td><td className="text-right tabular-nums">{i.quantity}</td><td className="text-right tabular-nums">{inr(i.rate)}</td></tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
