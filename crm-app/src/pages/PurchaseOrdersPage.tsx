import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, Loader2, PackageCheck, Store, Trash2, TriangleAlert } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { OrderLines, StatusDot, fmtDate, inr, selectClass, type StockPart } from "@/components/trade/OrderLines";
import { productionAPI, pricesAPI, purchaseOrdersAPI, sparePartsAPI, vendorsAPI, type OrderLine, type PriceRow, type PurchaseOrder, type Vendor } from "@/services/api";

const STATUSES = ["Draft", "Open", "Partial", "Received", "Cancelled"];
const emptyVendor = { name: "", category: "", contactPerson: "", phone: "", email: "", address: "", city: "", gstin: "", paymentTerms: "", notes: "" };

export default function PurchaseOrdersPage() {
  const { toast } = useToast();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [parts, setParts] = useState<StockPart[]>([]);
  const [prices, setPrices] = useState<PriceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [vendorId, setVendorId] = useState("");
  const [expected, setExpected] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<OrderLine[]>([]);
  const [detail, setDetail] = useState<PurchaseOrder | null>(null);

  const [vOpen, setVOpen] = useState(false);
  const [vForm, setVForm] = useState(emptyVendor);
  const [vEditing, setVEditing] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [o, v, p] = await Promise.all([purchaseOrdersAPI.getAll(), vendorsAPI.getAll(), sparePartsAPI.getAll()]);
      setOrders(o.data);
      setVendors(v.data);
      setParts(p.data);
      pricesAPI.getAll().then((r) => setPrices(r.data)).catch(() => {});
    } catch (e) {
      toast({ title: "Failed to load purchasing", description: (e as Error).message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);
  useEffect(() => {
    load();
  }, [load]);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((o) => (!status || o.status === status) && (!q || [o.poNo, o.vendorName].some((v) => v.toLowerCase().includes(q))));
  }, [orders, search, status]);

  const openNew = (preset?: { vendor?: string; lines?: OrderLine[] }) => {
    setVendorId(preset?.vendor || "");
    setExpected("");
    setNotes("");
    setLines(preset?.lines || [{ kind: "material", description: "", unit: "pcs", quantity: 1, rate: 0, gstRate: 18 }]);
    setOpen(true);
  };

  // Short parts from open machines, grouped to the first supplier that matches a vendor
  const fromShortages = async () => {
    try {
      const { data } = await productionAPI.materialNeeds();
      const short = data.rows.filter((r) => r.shortage > 0);
      if (!short.length) return toast({ title: "No shortages", description: "Stock covers every open machine" });
      const bySupplier = new Map<string, number>();
      short.forEach((r) => bySupplier.set(r.supplier, (bySupplier.get(r.supplier) || 0) + 1));
      const top = [...bySupplier.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
      const v = vendors.find((x) => x.name.toLowerCase() === (top || "").toLowerCase());
      openNew({
        vendor: v?._id,
        lines: short.map((r) => ({ kind: "material", part: r.part, description: r.partName, unit: r.unit, quantity: r.shortage, rate: r.unitPrice, gstRate: 18 })),
      });
    } catch (e) {
      toast({ title: "Could not read shortages", description: (e as Error).message, variant: "destructive" });
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      await purchaseOrdersAPI.create({ vendor: vendorId, expectedDate: expected || null, notes, items: lines });
      toast({ title: "Purchase order created" });
      setOpen(false);
      load();
    } catch (e) {
      toast({ title: "Could not save", description: (e as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const setPoStatus = async (po: PurchaseOrder, next: string) => {
    try {
      const r = await purchaseOrdersAPI.update(po._id, { status: next });
      setDetail(r.data);
      load();
    } catch (e) {
      toast({ title: "Could not update", description: (e as Error).message, variant: "destructive" });
    }
  };

  const saveVendor = async () => {
    try {
      if (vEditing) await vendorsAPI.update(vEditing, vForm);
      else await vendorsAPI.create(vForm);
      setVForm(emptyVendor);
      setVEditing(null);
      setVendors((await vendorsAPI.getAll()).data);
    } catch (e) {
      toast({ title: "Could not save vendor", description: (e as Error).message, variant: "destructive" });
    }
  };
  const removeVendor = async (v: Vendor) => {
    if (!confirm(`Delete vendor ${v.name}?`)) return;
    try {
      await vendorsAPI.delete(v._id);
      setVendors((await vendorsAPI.getAll()).data);
    } catch (e) {
      toast({ title: "Could not delete", description: (e as Error).message, variant: "destructive" });
    }
  };

  return (
    <AppLayout title="Purchase orders">
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="PO number or vendor" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={`${selectClass} w-40`} aria-label="Status">
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" onClick={() => setVOpen(true)}>
              <Store className="w-4 h-4 mr-1.5" /> Vendors
            </Button>
            <Button variant="outline" onClick={fromShortages}>
              <TriangleAlert className="w-4 h-4 mr-1.5" /> From shortages
            </Button>
            <Button onClick={() => openNew()}>
              <Plus className="w-4 h-4 mr-1.5" /> New order
            </Button>
          </div>
        </div>

        <div className="rounded-xl border bg-card card-shadow overflow-x-auto">
          {loading ? (
            <div className="p-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : shown.length === 0 ? (
            <p className="p-10 text-center text-sm text-muted-foreground">No purchase orders yet</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="p-3 font-normal">Order</th><th className="p-3 font-normal">Vendor</th><th className="p-3 font-normal">Date</th>
                  <th className="p-3 font-normal">Expected</th><th className="p-3 font-normal text-right">Total</th><th className="p-3 font-normal">Status</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((o) => (
                  <tr key={o._id} onClick={() => setDetail(o)} className="border-t cursor-pointer hover:bg-muted/60 transition-colors">
                    <td className="p-3"><span className="plate">{o.poNo}</span></td>
                    <td className="p-3">{o.vendorName}</td>
                    <td className="p-3 text-muted-foreground">{fmtDate(o.poDate)}</td>
                    <td className="p-3 text-muted-foreground">{fmtDate(o.expectedDate)}</td>
                    <td className="p-3 text-right tabular-nums">{inr(o.total)}</td>
                    <td className="p-3"><StatusDot status={o.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New purchase order</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Vendor</Label>
              <select value={vendorId} onChange={(e) => setVendorId(e.target.value)} className={selectClass}>
                <option value="">Choose a vendor</option>
                {vendors.map((v) => (
                  <option key={v._id} value={v._id}>{v.name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Expected delivery</Label>
              <Input type="date" value={expected} onChange={(e) => setExpected(e.target.value)} />
            </div>
          </div>
          <OrderLines lines={lines} onChange={setLines} parts={parts} priceKey="rate" priceFor={(id) => prices.find((p) => p.active && p.listType === "purchase" && p.part === id && p.vendor === vendorId)?.unitPrice} />
          <div>
            <Label>Notes</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Payment or delivery terms" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving || !vendorId}>{saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Create order</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle className="font-medium flex items-center gap-3"><span className="plate">{detail.poNo}</span>{detail.vendorName}</DialogTitle>
              </DialogHeader>
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
                <StatusDot status={detail.status} />
                <span>Ordered {fmtDate(detail.poDate)}</span>
                <span>Expected {fmtDate(detail.expectedDate)}</span>
              </div>
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground">
                  <tr><th className="py-2 font-normal">Item</th><th className="font-normal text-right">Ordered</th><th className="font-normal text-right">Received</th><th className="font-normal text-right">Rate</th></tr>
                </thead>
                <tbody>
                  {detail.items.map((i) => (
                    <tr key={i._id} className="border-t">
                      <td className="py-2">{i.description}</td>
                      <td className="text-right tabular-nums">{i.quantity}</td>
                      <td className="text-right tabular-nums">{i.receivedQty}</td>
                      <td className="text-right tabular-nums">{inr(i.rate || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="text-sm text-right tabular-nums">
                <div className="text-muted-foreground">Subtotal {inr(detail.subtotal)} · GST {inr(detail.tax)}</div>
                <div className="font-medium">Total {inr(detail.total)}</div>
              </div>
              {detail.notes && <p className="text-sm text-muted-foreground">{detail.notes}</p>}
              <DialogFooter className="gap-2">
                {["Draft", "Open", "Partial"].includes(detail.status) && !detail.items.some((i) => (i.receivedQty || 0) > 0) && (
                  <Button variant="outline" onClick={() => setPoStatus(detail, "Cancelled")}>Cancel order</Button>
                )}
                {detail.status === "Draft" && <Button variant="outline" onClick={() => setPoStatus(detail, "Open")}>Release</Button>}
                {["Open", "Partial"].includes(detail.status) && (
                  <Button asChild>
                    <Link to={`/material-inward?po=${detail._id}`}><PackageCheck className="w-4 h-4 mr-1.5" /> Receive goods</Link>
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={vOpen} onOpenChange={setVOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Vendors</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            {([["name", "Name"], ["category", "Supplies"], ["contactPerson", "Contact person"], ["phone", "Phone"], ["email", "Email"], ["city", "City"], ["gstin", "GSTIN"], ["paymentTerms", "Payment terms"]] as const).map(([k, label]) => (
              <div key={k}>
                <Label>{label}</Label>
                <Input value={vForm[k]} onChange={(e) => setVForm({ ...vForm, [k]: e.target.value })} />
              </div>
            ))}
          </div>
          <div className="flex gap-2 justify-end">
            {vEditing && <Button variant="outline" onClick={() => { setVEditing(null); setVForm(emptyVendor); }}>Cancel edit</Button>}
            <Button onClick={saveVendor} disabled={!vForm.name.trim()}>{vEditing ? "Save vendor" : "Add vendor"}</Button>
          </div>
          <div className="border-t divide-y">
            {vendors.length === 0 && <p className="py-4 text-sm text-muted-foreground">No vendors yet</p>}
            {vendors.map((v) => (
              <div key={v._id} className="py-2 flex items-center gap-3 text-sm">
                <button className="flex-1 text-left" onClick={() => { setVEditing(v._id); setVForm({ ...emptyVendor, ...v }); }}>
                  <div className="font-medium">{v.name}</div>
                  <div className="text-muted-foreground">{[v.category, v.city, v.phone].filter(Boolean).join(" · ") || "No details"}</div>
                </button>
                <button onClick={() => removeVendor(v)} className="text-muted-foreground hover:text-destructive" aria-label={`Delete ${v.name}`}><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
