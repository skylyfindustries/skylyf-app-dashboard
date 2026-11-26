import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, Loader2 } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { fmtDate, inr, selectClass, type StockPart } from "@/components/trade/OrderLines";
import { inwardAPI, purchaseOrdersAPI, sparePartsAPI, vendorsAPI, type Inward, type PurchaseOrder, type Vendor } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";

interface Row { poItem?: string; part: string; label: string; qty: string; rate: string; pending?: number }

export default function MaterialInwardPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [rows, setRows] = useState<Inward[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [parts, setParts] = useState<StockPart[]>([]);
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [poId, setPoId] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [vehicleNo, setVehicleNo] = useState("");
  const [receivedBy, setReceivedBy] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<Row[]>([]);

  const load = useCallback(async () => {
    try {
      const [i, o, v, p] = await Promise.all([inwardAPI.getAll(), purchaseOrdersAPI.getAll(), vendorsAPI.getAll(), sparePartsAPI.getAll()]);
      setRows(i.data);
      setOrders(o.data);
      setVendors(v.data);
      setParts(p.data);
      return o.data;
    } catch (e) {
      toast({ title: "Failed to load inward", description: (e as Error).message, variant: "destructive" });
      return [] as PurchaseOrder[];
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const choosePo = (id: string, list = orders) => {
    setPoId(id);
    const po = list.find((o) => o._id === id);
    if (!po) return setLines([]);
    setVendorId(po.vendor);
    setLines(
      po.items
        .filter((i) => i.quantity - (i.receivedQty || 0) > 0)
        .map((i) => ({ poItem: i._id, part: i.part || "", label: i.description, qty: String(i.quantity - (i.receivedQty || 0)), rate: String(i.rate || 0), pending: i.quantity - (i.receivedQty || 0) })),
    );
  };

  const openNew = (id = "", list = orders) => {
    setPoId("");
    setVendorId("");
    setInvoiceNo("");
    setVehicleNo("");
    setNotes("");
    setReceivedBy(user?.name || "");
    setLines([]);
    if (id) choosePo(id, list);
    setOpen(true);
  };

  useEffect(() => {
    load().then((list) => {
      const id = params.get("po");
      if (id) {
        openNew(id, list);
        setParams({}, { replace: true });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await inwardAPI.create({
        purchaseOrder: poId || undefined, vendor: vendorId || undefined, invoiceNo, vehicleNo, receivedBy, notes,
        items: lines.filter((l) => Number(l.qty) >= 1).map((l) => ({ poItem: l.poItem, part: l.part, quantity: Number(l.qty), rate: Number(l.rate) })),
      });
      toast({ title: "Goods received", description: "Stock has been updated" });
      setOpen(false);
      load();
    } catch (e) {
      toast({ title: "Could not save", description: (e as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const set = (i: number, patch: Partial<Row>) => setLines(lines.map((l, x) => (x === i ? { ...l, ...patch } : l)));
  const receivable = orders.filter((o) => ["Open", "Partial"].includes(o.status));

  return (
    <AppLayout title="Material inward">
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">Goods received at the gate. Each receipt adds to stock and updates its purchase order.</p>
          <Button onClick={() => openNew()}><Plus className="w-4 h-4 mr-1.5" /> Receive goods</Button>
        </div>
        <div className="rounded-xl border bg-card card-shadow overflow-x-auto">
          {loading ? (
            <div className="p-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : rows.length === 0 ? (
            <p className="p-10 text-center text-sm text-muted-foreground">Nothing received yet</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="p-3 font-normal">Receipt</th><th className="p-3 font-normal">Date</th><th className="p-3 font-normal">Vendor</th>
                  <th className="p-3 font-normal">Order</th><th className="p-3 font-normal">Items</th><th className="p-3 font-normal">Received by</th><th className="p-3 font-normal text-right">Value</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r._id} className="border-t align-top">
                    <td className="p-3"><span className="plate">{r.grnNo}</span></td>
                    <td className="p-3 text-muted-foreground">{fmtDate(r.inwardDate)}</td>
                    <td className="p-3">{r.vendorName || "—"}{r.invoiceNo && <div className="text-xs text-muted-foreground">Invoice {r.invoiceNo}</div>}</td>
                    <td className="p-3 text-muted-foreground">{r.poNo || "—"}</td>
                    <td className="p-3">{r.items.map((i) => `${i.quantity} × ${i.partName}`).join(", ")}</td>
                    <td className="p-3 text-muted-foreground">{r.receivedBy}</td>
                    <td className="p-3 text-right tabular-nums">{inr(r.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Receive goods</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Against purchase order</Label>
              <select value={poId} onChange={(e) => choosePo(e.target.value)} className={selectClass}>
                <option value="">No order (direct purchase)</option>
                {receivable.map((o) => (
                  <option key={o._id} value={o._id}>{o.poNo} · {o.vendorName}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Vendor</Label>
              <select value={vendorId} onChange={(e) => setVendorId(e.target.value)} disabled={!!poId} className={selectClass}>
                <option value="">Choose a vendor</option>
                {vendors.map((v) => (
                  <option key={v._id} value={v._id}>{v.name}</option>
                ))}
              </select>
            </div>
            <div><Label>Invoice no.</Label><Input value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} /></div>
            <div><Label>Vehicle no.</Label><Input value={vehicleNo} onChange={(e) => setVehicleNo(e.target.value)} /></div>
            <div><Label>Received by</Label><Input value={receivedBy} onChange={(e) => setReceivedBy(e.target.value)} /></div>
            <div><Label>Notes</Label><Input value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
          </div>

          <div className="space-y-2">
            <div className="grid grid-cols-[1fr_96px_96px] gap-2 text-xs text-muted-foreground"><span>Item</span><span>Received</span><span>Rate</span></div>
            {lines.map((l, i) => (
              <div key={i} className="grid grid-cols-[1fr_96px_96px] gap-2 items-center">
                {l.poItem ? (
                  <div className="text-sm">{l.label}{l.pending !== undefined && <span className="text-muted-foreground"> · {l.pending} pending</span>}{!l.part && <span className="text-destructive"> · not linked to stock</span>}</div>
                ) : (
                  <select value={l.part} onChange={(e) => set(i, { part: e.target.value, label: parts.find((p) => p._id === e.target.value)?.partName || "" })} className={selectClass.replace("h-10", "h-9")}>
                    <option value="">Choose stock item</option>
                    {parts.map((p) => (
                      <option key={p._id} value={p._id}>{p.partName}</option>
                    ))}
                  </select>
                )}
                <Input className="h-9" type="number" min={0} value={l.qty} onChange={(e) => set(i, { qty: e.target.value })} aria-label="Received quantity" />
                <Input className="h-9" type="number" min={0} value={l.rate} onChange={(e) => set(i, { rate: e.target.value })} aria-label="Rate" />
              </div>
            ))}
            {!poId && (
              <Button size="sm" variant="outline" onClick={() => setLines([...lines, { part: "", label: "", qty: "1", rate: "0" }])}>
                <Plus className="w-4 h-4 mr-1" /> Add item
              </Button>
            )}
            {poId && <p className="text-xs text-muted-foreground">Set quantity to 0 for items that did not arrive</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving || !receivedBy.trim() || !lines.some((l) => Number(l.qty) >= 1)}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Confirm receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
