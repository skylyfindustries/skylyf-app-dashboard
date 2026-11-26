import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Search, Loader2, Trash2 } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { fmtDate, inr, selectClass, toInput, type StockPart } from "@/components/trade/OrderLines";
import { clientsAPI, pricesAPI, sparePartsAPI, vendorsAPI, type PriceRow } from "@/services/api";

const blank = { listType: "purchase" as "purchase" | "selling", part: "", party: "", unitPrice: "", moq: "1", leadTimeDays: "0", effectiveFrom: "", notes: "" };

export default function PriceMasterPage() {
  const { toast } = useToast();
  const [rows, setRows] = useState<PriceRow[]>([]);
  const [parts, setParts] = useState<StockPart[]>([]);
  const [vendors, setVendors] = useState<{ _id: string; name: string }[]>([]);
  const [clients, setClients] = useState<{ _id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"purchase" | "selling">("purchase");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [r, p, v, c] = await Promise.all([pricesAPI.getAll(), sparePartsAPI.getAll(), vendorsAPI.getAll(), clientsAPI.getAll()]);
      setRows(r.data);
      setParts(p.data);
      setVendors(v.data);
      setClients(c.data);
    } catch (e) {
      toast({ title: "Failed to load prices", description: (e as Error).message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);
  useEffect(() => {
    load();
  }, [load]);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => r.listType === tab && (!q || [r.partName, r.partyName].some((v) => v.toLowerCase().includes(q))));
  }, [rows, tab, search]);

  const openForm = (r?: PriceRow) => {
    setEditing(r?._id || null);
    setForm(r ? { listType: r.listType, part: r.part, party: (r.vendor || r.client) as string, unitPrice: String(r.unitPrice), moq: String(r.moq), leadTimeDays: String(r.leadTimeDays), effectiveFrom: toInput(r.effectiveFrom), notes: r.notes } : { ...blank, listType: tab });
    setOpen(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const body = { listType: form.listType, part: form.part, unitPrice: Number(form.unitPrice), moq: Number(form.moq), leadTimeDays: Number(form.leadTimeDays), effectiveFrom: form.effectiveFrom || undefined, notes: form.notes, [form.listType === "purchase" ? "vendor" : "client"]: form.party };
      if (editing) await pricesAPI.update(editing, body);
      else await pricesAPI.create(body);
      setOpen(false);
      load();
    } catch (e) {
      toast({ title: "Could not save", description: (e as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (r: PriceRow) => {
    try {
      await pricesAPI.update(r._id, { listType: r.listType, part: r.part, unitPrice: r.unitPrice, vendor: r.vendor, client: r.client, moq: r.moq, leadTimeDays: r.leadTimeDays, notes: r.notes, active: !r.active });
      load();
    } catch (e) {
      toast({ title: "Could not update", description: (e as Error).message, variant: "destructive" });
    }
  };

  const remove = async (r: PriceRow) => {
    if (!confirm(`Remove this price for ${r.partName}?`)) return;
    try {
      await pricesAPI.delete(r._id);
      load();
    } catch (e) {
      toast({ title: "Could not delete", description: (e as Error).message, variant: "destructive" });
    }
  };

  const parties = form.listType === "purchase" ? vendors : clients;

  return (
    <AppLayout title="Price master">
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-lg border p-0.5 bg-card">
            {(["purchase", "selling"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)} className={`h-8 px-3 rounded-md text-sm transition-colors ${tab === t ? "bg-muted font-medium" : "text-muted-foreground hover:text-foreground"}`}>
                {t === "purchase" ? "Purchase prices" : "Selling prices"}
              </button>
            ))}
          </div>
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Item or party" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Button className="ml-auto" onClick={() => openForm()}><Plus className="w-4 h-4 mr-1.5" /> Add price</Button>
        </div>

        <div className="rounded-xl border bg-card overflow-x-auto">
          {loading ? (
            <div className="p-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : shown.length === 0 ? (
            <p className="p-10 text-center text-sm text-muted-foreground">No prices yet. Orders fill the rate from here when an item and party match</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="p-3 font-normal">Item</th><th className="p-3 font-normal">{tab === "purchase" ? "Vendor" : "Client"}</th><th className="p-3 font-normal text-right">Price</th>
                  <th className="p-3 font-normal text-right">MOQ</th><th className="p-3 font-normal text-right">Lead time</th><th className="p-3 font-normal">From</th><th className="p-3 font-normal">Status</th><th className="p-3 w-10" />
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r._id} className="border-t hover:bg-muted/60 transition-colors">
                    <td className="p-3 cursor-pointer" onClick={() => openForm(r)}>{r.partName}</td>
                    <td className="p-3">{r.partyName}</td>
                    <td className="p-3 text-right tabular-nums">{inr(r.unitPrice)}</td>
                    <td className="p-3 text-right tabular-nums text-muted-foreground">{r.moq}</td>
                    <td className="p-3 text-right tabular-nums text-muted-foreground">{r.leadTimeDays ? `${r.leadTimeDays} d` : "—"}</td>
                    <td className="p-3 text-muted-foreground">{fmtDate(r.effectiveFrom)}</td>
                    <td className="p-3"><button onClick={() => toggle(r)} className="text-sm">{r.active ? "Active" : <span className="text-muted-foreground">Inactive</span>}</button></td>
                    <td className="p-3"><button onClick={() => remove(r)} className="text-muted-foreground hover:text-destructive" aria-label="Remove price"><Trash2 className="w-4 h-4" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Edit price" : "Add price"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Item</Label>
              <select value={form.part} onChange={(e) => setForm({ ...form, part: e.target.value })} className={selectClass}>
                <option value="">Choose a stock item</option>
                {parts.map((p) => (
                  <option key={p._id} value={p._id}>{p.partName}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <Label>{form.listType === "purchase" ? "Vendor" : "Client"}</Label>
              <select value={form.party} onChange={(e) => setForm({ ...form, party: e.target.value })} className={selectClass} disabled={!!editing}>
                <option value="">Choose</option>
                {parties.map((p) => (
                  <option key={p._id} value={p._id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div><Label>Price</Label><Input type="number" min={0} value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: e.target.value })} /></div>
            <div><Label>Effective from</Label><Input type="date" value={form.effectiveFrom} onChange={(e) => setForm({ ...form, effectiveFrom: e.target.value })} /></div>
            <div><Label>Minimum order</Label><Input type="number" min={1} value={form.moq} onChange={(e) => setForm({ ...form, moq: e.target.value })} /></div>
            <div><Label>Lead time (days)</Label><Input type="number" min={0} value={form.leadTimeDays} onChange={(e) => setForm({ ...form, leadTimeDays: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving || !form.part || !form.party || form.unitPrice === ""}>{saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Save price</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
