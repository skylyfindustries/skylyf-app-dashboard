import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Search, Loader2 } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { OrderLines, StatusDot, fmtDate, inr, selectClass, type StockPart } from "@/components/trade/OrderLines";
import { clientsAPI, pricesAPI, salesOrdersAPI, sparePartsAPI, type OrderLine, type PriceRow, type SalesOrder } from "@/services/api";

const STATUSES = ["Open", "Confirmed", "In Production", "Dispatched", "Closed", "Cancelled"];
const NEXT: Record<string, string> = { Open: "Confirmed", Confirmed: "In Production", "In Production": "Dispatched", Dispatched: "Closed" };

export default function SalesOrdersPage() {
  const { toast } = useToast();
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [clients, setClients] = useState<{ _id: string; name: string }[]>([]);
  const [parts, setParts] = useState<StockPart[]>([]);
  const [prices, setPrices] = useState<PriceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [clientId, setClientId] = useState("");
  const [delivery, setDelivery] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<OrderLine[]>([]);
  const [detail, setDetail] = useState<SalesOrder | null>(null);

  const load = useCallback(async () => {
    try {
      const [o, c, p] = await Promise.all([salesOrdersAPI.getAll(), clientsAPI.getAll(), sparePartsAPI.getAll()]);
      setOrders(o.data);
      setClients(c.data);
      setParts(p.data);
      pricesAPI.getAll().then((r) => setPrices(r.data)).catch(() => {});
    } catch (e) {
      toast({ title: "Failed to load sales orders", description: (e as Error).message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);
  useEffect(() => {
    load();
  }, [load]);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((o) => (!status || o.status === status) && (!q || [o.soNo, o.clientName].some((v) => v.toLowerCase().includes(q))));
  }, [orders, search, status]);

  const openNew = () => {
    setClientId("");
    setDelivery("");
    setNotes("");
    setLines([{ kind: "machine", description: "", unit: "pcs", quantity: 1, price: 0, gstRate: 18 }]);
    setOpen(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      await salesOrdersAPI.create({ client: clientId, deliveryDate: delivery || null, notes, items: lines });
      toast({ title: "Sales order created" });
      setOpen(false);
      load();
    } catch (e) {
      toast({ title: "Could not save", description: (e as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const move = async (so: SalesOrder, next: string) => {
    try {
      const r = await salesOrdersAPI.update(so._id, { status: next });
      setDetail(r.data);
      load();
      if (next === "Dispatched") toast({ title: "Dispatched", description: "Stock was deducted for material items" });
    } catch (e) {
      toast({ title: "Could not update", description: (e as Error).message, variant: "destructive" });
    }
  };

  return (
    <AppLayout title="Sales orders">
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Order number or client" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={`${selectClass} w-44`} aria-label="Status">
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <Button className="ml-auto" onClick={openNew}><Plus className="w-4 h-4 mr-1.5" /> New order</Button>
        </div>

        <div className="rounded-xl border bg-card card-shadow overflow-x-auto">
          {loading ? (
            <div className="p-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : shown.length === 0 ? (
            <p className="p-10 text-center text-sm text-muted-foreground">No sales orders yet</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="p-3 font-normal">Order</th><th className="p-3 font-normal">Client</th><th className="p-3 font-normal">Date</th>
                  <th className="p-3 font-normal">Delivery</th><th className="p-3 font-normal text-right">Total</th><th className="p-3 font-normal">Status</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((o) => (
                  <tr key={o._id} onClick={() => setDetail(o)} className="border-t cursor-pointer hover:bg-muted/60 transition-colors">
                    <td className="p-3"><span className="plate">{o.soNo}</span></td>
                    <td className="p-3">{o.clientName}</td>
                    <td className="p-3 text-muted-foreground">{fmtDate(o.orderDate)}</td>
                    <td className="p-3 text-muted-foreground">{fmtDate(o.deliveryDate)}</td>
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
          <DialogHeader><DialogTitle>New sales order</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Client</Label>
              <select value={clientId} onChange={(e) => setClientId(e.target.value)} className={selectClass}>
                <option value="">Choose a client</option>
                {clients.map((c) => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div><Label>Delivery date</Label><Input type="date" value={delivery} onChange={(e) => setDelivery(e.target.value)} /></div>
          </div>
          <OrderLines lines={lines} onChange={setLines} parts={parts} priceKey="price" machineLines priceFor={(id) => prices.find((p) => p.active && p.listType === "selling" && p.part === id && p.client === clientId)?.unitPrice} />
          <div><Label>Notes</Label><Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Terms or special instructions" /></div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving || !clientId}>{saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Create order</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle className="font-medium flex items-center gap-3"><span className="plate">{detail.soNo}</span>{detail.clientName}</DialogTitle>
              </DialogHeader>
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
                <StatusDot status={detail.status} />
                <span>Ordered {fmtDate(detail.orderDate)}</span>
                <span>Delivery {fmtDate(detail.deliveryDate)}</span>
                {detail.salesPerson && <span>By {detail.salesPerson}</span>}
              </div>
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground">
                  <tr><th className="py-2 font-normal">Item</th><th className="font-normal text-right">Qty</th><th className="font-normal text-right">Price</th><th className="font-normal text-right">GST</th></tr>
                </thead>
                <tbody>
                  {detail.items.map((i) => (
                    <tr key={i._id} className="border-t">
                      <td className="py-2">{i.description}<span className="text-xs text-muted-foreground"> · {i.kind}</span></td>
                      <td className="text-right tabular-nums">{i.quantity}</td>
                      <td className="text-right tabular-nums">{inr(i.price || 0)}</td>
                      <td className="text-right tabular-nums">{i.gstRate}%</td>
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
                {!["Closed", "Cancelled", "Dispatched"].includes(detail.status) && <Button variant="outline" onClick={() => move(detail, "Cancelled")}>Cancel order</Button>}
                {NEXT[detail.status] && <Button onClick={() => move(detail, NEXT[detail.status])}>Mark {NEXT[detail.status].toLowerCase()}</Button>}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
