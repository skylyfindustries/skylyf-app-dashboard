import { useCallback, useEffect, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { fmtDate, inr, selectClass } from "@/components/trade/OrderLines";
import { financeAPI } from "@/services/api";
import { roleLabels } from "@/types/crm";

const TYPES = ["Salary", "Advance", "Bonus", "Deduction"];
const dot: Record<string, string> = { Paid: "bg-success", "Part paid": "bg-warning", Unpaid: "bg-destructive", "No salary set": "bg-muted-foreground/50" };

export default function PayrollPage() {
  const { toast } = useToast();
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [data, setData] = useState<any>(null);
  const [pay, setPay] = useState<any>(null);
  const [form, setForm] = useState({ amount: "", type: "Salary", paidOn: "", note: "" });
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setData((await financeAPI.payroll(month)).data);
    } catch (e) {
      toast({ title: "Failed to load payroll", description: (e as Error).message, variant: "destructive" });
    }
  }, [month, toast]);
  useEffect(() => {
    setData(null);
    load();
  }, [load]);

  const startPay = (row: any) => {
    setPay(row);
    setForm({ amount: row.due ? String(row.due) : "", type: "Salary", paidOn: new Date().toISOString().slice(0, 10), note: "" });
  };

  const save = async () => {
    setSaving(true);
    try {
      await financeAPI.pay({ user: pay._id, month, amount: Number(form.amount), type: form.type, paidOn: form.paidOn || undefined, note: form.note });
      toast({ title: "Payment recorded", description: `${pay.name}, ${month}` });
      setPay(null);
      load();
    } catch (e) {
      toast({ title: "Could not save", description: (e as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const removePayment = async (id: string) => {
    if (!confirm("Remove this payment?")) return;
    try {
      await financeAPI.deletePayment(id);
      load();
    } catch (e) {
      toast({ title: "Could not remove", description: (e as Error).message, variant: "destructive" });
    }
  };

  return (
    <AppLayout title="Payroll">
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <Input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} className="w-44" aria-label="Month" />
          <p className="text-sm text-muted-foreground">Set each person's monthly salary on the Users page. Paid salaries count as company cost.</p>
        </div>

        {!data ? (
          <div className="py-20 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-4">
              <StatCard title="Monthly payroll" value={inr(data.totalSalary)} change={`${data.rows.filter((r: any) => r.monthlySalary).length} people with a salary`} />
              <StatCard title="Paid" value={inr(data.totalPaid)} change={month} />
              <StatCard title="Still due" value={inr(data.totalDue)} change="Salary less payments" changeType={data.totalDue > 0 ? "negative" : "neutral"} />
            </div>
            <div className="rounded-xl border bg-card overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground">
                  <tr><th className="p-3 font-normal">Employee</th><th className="p-3 font-normal">Role</th><th className="p-3 font-normal text-right">Salary</th><th className="p-3 font-normal text-right">Paid</th><th className="p-3 font-normal text-right">Due</th><th className="p-3 font-normal">Status</th><th className="p-3 w-24" /></tr>
                </thead>
                <tbody>
                  {data.rows.map((r: any) => (
                    <>
                      <tr key={r._id} className="border-t">
                        <td className="p-3"><button className="text-left hover:underline" onClick={() => setOpen(open === r._id ? null : r._id)}>{r.name}</button>{r.department && <div className="text-xs text-muted-foreground">{r.department}</div>}</td>
                        <td className="p-3 text-muted-foreground">{(roleLabels as Record<string, string>)[r.role] || r.role}</td>
                        <td className="p-3 text-right tabular-nums">{r.monthlySalary ? inr(r.monthlySalary) : "—"}</td>
                        <td className="p-3 text-right tabular-nums">{inr(r.paid)}</td>
                        <td className="p-3 text-right tabular-nums">{r.due ? inr(r.due) : "—"}</td>
                        <td className="p-3"><span className="inline-flex items-center gap-1.5"><span className={`h-2 w-2 rounded-full ${dot[r.status]}`} />{r.status}</span></td>
                        <td className="p-3 text-right"><Button size="sm" variant="outline" onClick={() => startPay(r)}>Pay</Button></td>
                      </tr>
                      {open === r._id && (
                        <tr key={`${r._id}-p`} className="bg-muted/40">
                          <td colSpan={7} className="px-3 py-2">
                            {r.payments.length === 0 ? <span className="text-xs text-muted-foreground">No payments this month</span> : r.payments.map((p: any) => (
                              <div key={p._id} className="flex items-center gap-4 py-1 text-xs">
                                <span className="w-24 text-muted-foreground">{fmtDate(p.paidOn)}</span>
                                <span className="w-20">{p.type}</span>
                                <span className="tabular-nums w-24">{p.type === "Deduction" ? "−" : ""}{inr(p.amount)}</span>
                                <span className="flex-1 text-muted-foreground">{p.note}</span>
                                <button onClick={() => removePayment(p._id)} className="text-muted-foreground hover:text-destructive" aria-label="Remove payment"><Trash2 className="w-3.5 h-3.5" /></button>
                              </div>
                            ))}
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <Dialog open={!!pay} onOpenChange={(o) => !o && setPay(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Pay {pay?.name}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Type</Label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={selectClass}>
                {TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
            <div><Label>Amount (₹)</Label><Input type="number" min={0} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
            <div><Label>Paid on</Label><Input type="date" value={form.paidOn} onChange={(e) => setForm({ ...form, paidOn: e.target.value })} /></div>
            <div><Label>Note</Label><Input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPay(null)}>Cancel</Button>
            <Button onClick={save} disabled={saving || !form.amount}>{saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Record payment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
