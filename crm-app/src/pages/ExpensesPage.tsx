import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, Loader2, Trash2 } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { fmtDate, inr, selectClass, toInput } from "@/components/trade/OrderLines";
import { financeAPI, machinesAPI, type ExpenseRow } from "@/services/api";

const MODES = ["Cash", "Bank", "UPI", "Cheque", "Card"];
const thisMonth = () => new Date().toISOString().slice(0, 7);
const blank = { date: "", category: "Other", amount: "", description: "", machine: "", paidTo: "", paymentMode: "Cash", reference: "" };

export default function ExpensesPage() {
  const { toast } = useToast();
  const [params] = useSearchParams();
  const [rows, setRows] = useState<ExpenseRow[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [machines, setMachines] = useState<{ _id: string; machineNo: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(thisMonth());
  const [category, setCategory] = useState("");
  const [machine, setMachine] = useState(params.get("machine") || "");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q: Record<string, string> = {};
      if (month) q.month = month;
      if (category) q.category = category;
      if (machine) q.machine = machine;
      const r = await financeAPI.expenses(q);
      setRows(r.data);
      setCategories(r.categories);
    } catch (e) {
      toast({ title: "Failed to load expenses", description: (e as Error).message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [month, category, machine, toast]);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    machinesAPI.getAll().then((r) => setMachines(r.data)).catch(() => {});
    if (params.get("machine")) {
      setMonth("");
      openForm(undefined, params.get("machine") || "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const byCat = useMemo(() => {
    const m = new Map<string, number>();
    rows.forEach((r) => m.set(r.category, (m.get(r.category) || 0) + r.amount));
    return [...m].sort((a, b) => b[1] - a[1]);
  }, [rows]);
  const total = rows.reduce((s, r) => s + r.amount, 0);

  const openForm = (r?: ExpenseRow, machineId = "") => {
    setEditing(r?._id || null);
    setForm(r ? { date: toInput(r.date), category: r.category, amount: String(r.amount), description: r.description, machine: r.machine || "", paidTo: r.paidTo, paymentMode: r.paymentMode, reference: r.reference } : { ...blank, machine: machineId, date: new Date().toISOString().slice(0, 10) });
    setOpen(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      await financeAPI.saveExpense({ ...form, amount: Number(form.amount), machine: form.machine || null }, editing || undefined);
      toast({ title: editing ? "Expense updated" : "Expense added" });
      setOpen(false);
      load();
    } catch (e) {
      toast({ title: "Could not save", description: (e as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (r: ExpenseRow) => {
    if (!confirm(`Delete this ${inr(r.amount)} expense?`)) return;
    try {
      await financeAPI.deleteExpense(r._id);
      load();
    } catch (e) {
      toast({ title: "Could not delete", description: (e as Error).message, variant: "destructive" });
    }
  };

  return (
    <AppLayout title="Expenses">
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-44" aria-label="Month" />
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={`${selectClass} w-44`} aria-label="Category">
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <select value={machine} onChange={(e) => setMachine(e.target.value)} className={`${selectClass} w-56`} aria-label="Machine">
            <option value="">All machines</option>
            {machines.map((m) => (
              <option key={m._id} value={m._id}>{m.machineNo} · {m.name}</option>
            ))}
          </select>
          {(month || category || machine) && <Button variant="ghost" onClick={() => { setMonth(""); setCategory(""); setMachine(""); }}>Clear</Button>}
          <Button className="ml-auto" onClick={() => openForm(undefined, machine)}><Plus className="w-4 h-4 mr-1.5" /> Add expense</Button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total" value={inr(total)} change={`${rows.length} expenses`} />
          {byCat.slice(0, 3).map(([c, v]) => (
            <StatCard key={c} title={c} value={inr(v)} change={`${Math.round((v / total) * 100)}% of total`} />
          ))}
        </div>

        <div className="rounded-xl border bg-card overflow-x-auto">
          {loading ? (
            <div className="p-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : rows.length === 0 ? (
            <p className="p-10 text-center text-sm text-muted-foreground">No expenses for this filter</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr><th className="p-3 font-normal">Date</th><th className="p-3 font-normal">Description</th><th className="p-3 font-normal">Category</th><th className="p-3 font-normal">Machine</th><th className="p-3 font-normal">Paid to</th><th className="p-3 font-normal">Mode</th><th className="p-3 font-normal text-right">Amount</th><th className="p-3 w-10" /></tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r._id} className="border-t hover:bg-muted/60 transition-colors">
                    <td className="p-3 text-muted-foreground whitespace-nowrap">{fmtDate(r.date)}</td>
                    <td className="p-3 cursor-pointer" onClick={() => openForm(r)}>{r.description}{r.reference && <span className="text-xs text-muted-foreground"> · {r.reference}</span>}</td>
                    <td className="p-3">{r.category}</td>
                    <td className="p-3">{r.machineNo ? <span className="plate">{r.machineNo}</span> : <span className="text-muted-foreground">General</span>}</td>
                    <td className="p-3 text-muted-foreground">{r.paidTo || "—"}</td>
                    <td className="p-3 text-muted-foreground">{r.paymentMode}</td>
                    <td className="p-3 text-right tabular-nums">{inr(r.amount)}</td>
                    <td className="p-3"><button onClick={() => remove(r)} className="text-muted-foreground hover:text-destructive" aria-label="Delete expense"><Trash2 className="w-4 h-4" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Edit expense" : "Add expense"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Date</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
            <div><Label>Amount (₹)</Label><Input type="number" min={0} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
            <div className="col-span-2"><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What was this for" /></div>
            <div>
              <Label>Category</Label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={selectClass}>
                {categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Machine</Label>
              <select value={form.machine} onChange={(e) => setForm({ ...form, machine: e.target.value })} className={selectClass}>
                <option value="">General, no machine</option>
                {machines.map((m) => (
                  <option key={m._id} value={m._id}>{m.machineNo} · {m.name}</option>
                ))}
              </select>
            </div>
            <div><Label>Paid to</Label><Input value={form.paidTo} onChange={(e) => setForm({ ...form, paidTo: e.target.value })} /></div>
            <div>
              <Label>Payment mode</Label>
              <select value={form.paymentMode} onChange={(e) => setForm({ ...form, paymentMode: e.target.value })} className={selectClass}>
                {MODES.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2"><Label>Reference</Label><Input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="Bill, UPI or cheque number" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving || !form.amount || !form.description.trim()}>{saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
