import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, Line, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AppLayout } from "@/components/layout/AppLayout";
import { Panel } from "@/components/dashboard/Panel";
import { StatCard } from "@/components/dashboard/StatCard";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { financeAPI } from "@/services/api";
import { inr, fmtDate } from "@/components/trade/OrderLines";
import { cn } from "@/lib/utils";

const monthLabel = (k: string) => new Date(`${k}-01`).toLocaleDateString("en-IN", { month: "short" });
const axis = { stroke: "hsl(var(--muted-foreground))", fontSize: 12, tickLine: false, axisLine: false } as const;
const tip = { contentStyle: { background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }, cursor: { fill: "hsl(var(--muted))" } };
const short = (v: number) => (Math.abs(v) >= 100000 ? `${(v / 100000).toFixed(1)}L` : Math.abs(v) >= 1000 ? `${Math.round(v / 1000)}k` : String(v));

export default function FinancePage() {
  const { toast } = useToast();
  const [months, setMonths] = useState(12);
  const [sum, setSum] = useState<any>(null);
  const [machines, setMachines] = useState<any>(null);
  const [detail, setDetail] = useState<any>(null);
  const [filter, setFilter] = useState<"all" | "open" | "done">("all");

  useEffect(() => {
    setSum(null);
    financeAPI.summary(months).then((r) => setSum(r.data)).catch((e) => toast({ title: "Could not load finance", description: e.message, variant: "destructive" }));
  }, [months, toast]);
  useEffect(() => {
    financeAPI.machines().then((r) => setMachines(r.data)).catch(() => {});
  }, []);

  const open = async (id: string) => {
    setDetail({ loading: true });
    try {
      setDetail((await financeAPI.machine(id)).data);
    } catch (e) {
      setDetail(null);
      toast({ title: "Could not load machine", description: (e as Error).message, variant: "destructive" });
    }
  };

  const rows = (machines?.rows ?? []).filter((r: any) => filter === "all" || (filter === "done" ? r.done : !r.done));
  const t = sum?.totals;
  const max = Math.max(...(sum?.categories ?? []).map((c: any) => c.amount), 1);

  return (
    <AppLayout title="Profit and loss">
      <div className="space-y-5">
        <div className="inline-flex rounded-lg border p-0.5 bg-card">
          {[6, 12, 24].map((n) => (
            <button key={n} onClick={() => setMonths(n)} className={cn("h-8 px-3 rounded-md text-sm transition-colors", months === n ? "bg-muted font-medium" : "text-muted-foreground hover:text-foreground")}>{n} months</button>
          ))}
        </div>

        {!sum ? (
          <div className="py-20 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="Earned" value={inr(t.earned)} change={`Machines ${inr(t.machines)} · parts ${inr(t.parts)}`} />
              <StatCard title="Spent" value={inr(t.spent)} change={`Materials ${inr(t.materials + t.partsCost)} · salaries ${inr(t.salaries)}`} />
              <StatCard title={t.profit >= 0 ? "Profit" : "Loss"} value={inr(Math.abs(t.profit))} change={t.earned ? `${Math.round((t.profit / t.earned) * 100)}% of earnings` : "No earnings yet"} changeType={t.profit >= 0 ? "positive" : "negative"} />
              <StatCard title="Other expenses" value={inr(t.expenses)} change={`Over ${sum.months} months`} />
            </div>

            {sum.unpricedDelivered > 0 && (
              <p className="text-sm rounded-lg border bg-card px-4 py-3 text-warning">
                {sum.unpricedDelivered} delivered {sum.unpricedDelivered === 1 ? "machine has" : "machines have"} no selling price, so its earnings are not counted. Set it on the Machines page.
              </p>
            )}

            <Panel title="Earned and spent" subtitle="Per month, with profit as the line">
              <div className="h-72">
                <ResponsiveContainer>
                  <ComposedChart data={sum.monthly} margin={{ left: 0 }}>
                    <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tickFormatter={monthLabel} {...axis} />
                    <YAxis tickFormatter={short} {...axis} />
                    <Tooltip {...tip} labelFormatter={monthLabel} formatter={(v: number) => inr(v)} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="earned" name="Earned" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="spent" name="Spent" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} />
                    <Line type="monotone" dataKey="profit" name="Profit" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </Panel>

            <div className="grid lg:grid-cols-2 gap-5">
              <Panel title="Where the money went" subtitle="Expenses and salaries by category">
                {sum.categories.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No expenses recorded yet</p> : (
                  <div className="space-y-3">
                    {sum.categories.map((c: any) => (
                      <div key={c.category}>
                        <div className="flex justify-between text-sm"><span>{c.category}</span><span className="tabular-nums">{inr(c.amount)}</span></div>
                        <div className="mt-1 h-1.5 rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${(c.amount / max) * 100}%` }} /></div>
                      </div>
                    ))}
                  </div>
                )}
              </Panel>
              <Panel title="Cost of goods" subtitle="Stock used, valued at part cost">
                <table className="w-full text-sm">
                  <tbody>
                    <tr className="border-b"><td className="py-2">Parts used on machines</td><td className="text-right tabular-nums">{inr(t.materials)}</td></tr>
                    <tr className="border-b"><td className="py-2">Cost of spare parts sold</td><td className="text-right tabular-nums">{inr(t.partsCost)}</td></tr>
                    <tr className="border-b"><td className="py-2">Salaries paid</td><td className="text-right tabular-nums">{inr(t.salaries)}</td></tr>
                    <tr><td className="py-2">Other expenses</td><td className="text-right tabular-nums">{inr(t.expenses)}</td></tr>
                  </tbody>
                </table>
                <p className="mt-3 text-xs text-muted-foreground">Stock bought through purchase orders is counted when it is used or sold, not when it arrives.</p>
              </Panel>
            </div>

            <Panel
              title="Profit per machine"
              subtitle="Selling price less parts, estimated labour and linked expenses"
              action={
                <div className="inline-flex rounded-lg border p-0.5">
                  {([["all", "All"], ["open", "Building"], ["done", "Delivered"]] as const).map(([v, l]) => (
                    <button key={v} onClick={() => setFilter(v)} className={cn("h-7 px-2.5 rounded-md text-xs transition-colors", filter === v ? "bg-muted font-medium" : "text-muted-foreground")}>{l}</button>
                  ))}
                </div>
              }
            >
              {!machines ? <Loader2 className="w-4 h-4 animate-spin mx-auto my-8" /> : rows.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No machines</p> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-xs text-muted-foreground">
                      <tr><th className="py-2 font-normal">Machine</th><th className="font-normal text-right">Price</th><th className="font-normal text-right">Parts</th><th className="font-normal text-right">Labour</th><th className="font-normal text-right">Expenses</th><th className="font-normal text-right">Total cost</th><th className="font-normal text-right">Profit</th><th className="font-normal text-right">Margin</th></tr>
                    </thead>
                    <tbody>
                      {rows.map((r: any) => (
                        <tr key={r._id} onClick={() => open(r._id)} className="border-t cursor-pointer hover:bg-muted/60 transition-colors">
                          <td className="py-2"><span className="plate mr-2">{r.machineNo}</span>{r.name}<div className="text-xs text-muted-foreground">{r.clientName || r.status}</div></td>
                          <td className="text-right tabular-nums">{r.sellingPrice ? inr(r.sellingPrice) : <span className="text-muted-foreground">Not set</span>}</td>
                          <td className="text-right tabular-nums text-muted-foreground">{inr(r.materials)}</td>
                          <td className="text-right tabular-nums text-muted-foreground">{inr(r.labour)}</td>
                          <td className="text-right tabular-nums text-muted-foreground">{inr(r.expenses)}</td>
                          <td className="text-right tabular-nums">{inr(r.totalCost)}</td>
                          <td className={cn("text-right tabular-nums", r.profit !== null && (r.profit < 0 ? "text-destructive" : "text-success"))}>{r.profit === null ? "—" : inr(r.profit)}</td>
                          <td className="text-right tabular-nums text-muted-foreground">{r.margin === null ? "—" : `${r.margin}%`}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>
          </>
        )}
      </div>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {detail?.loading ? <div className="py-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin" /></div> : detail && (
            <>
              <DialogHeader><DialogTitle className="font-medium flex items-center gap-3"><span className="plate">{detail.machine.machineNo}</span>{detail.machine.name}</DialogTitle></DialogHeader>
              <div className="grid grid-cols-4 gap-3 text-sm">
                {[["Price", detail.machine.sellingPrice ? inr(detail.machine.sellingPrice) : "Not set"], ["Parts", inr(detail.totals.materials)], ["Labour", inr(detail.totals.labour)], ["Expenses", inr(detail.totals.expenses)]].map(([l, v]) => (
                  <div key={l} className="rounded-lg border p-3"><div className="text-xs text-muted-foreground">{l}</div><div className="mt-1 tabular-nums">{v}</div></div>
                ))}
              </div>
              <div className="flex justify-between text-sm"><span>Total cost {inr(detail.totals.cost)}</span><span className={cn("font-medium", detail.totals.profit !== null && (detail.totals.profit < 0 ? "text-destructive" : "text-success"))}>{detail.totals.profit === null ? "Set a selling price to see profit" : `${detail.totals.profit < 0 ? "Loss" : "Profit"} ${inr(Math.abs(detail.totals.profit))}`}</span></div>

              <h3 className="text-sm font-medium">Parts used</h3>
              {detail.materials.length === 0 ? <p className="text-sm text-muted-foreground">No parts taken for this machine yet</p> : (
                <table className="w-full text-sm"><tbody>{detail.materials.map((p: any) => <tr key={p.partName} className="border-t"><td className="py-1.5">{p.partName}</td><td className="text-right tabular-nums text-muted-foreground">{p.quantity}</td><td className="text-right tabular-nums">{inr(p.cost)}</td></tr>)}</tbody></table>
              )}
              <h3 className="text-sm font-medium">Labour, estimated from salary</h3>
              {detail.labour.length === 0 ? <p className="text-sm text-muted-foreground">No stage has been started yet</p> : (
                <table className="w-full text-sm"><tbody>{detail.labour.map((l: any, i: number) => <tr key={i} className="border-t"><td className="py-1.5">{l.stage}<span className="text-muted-foreground"> · {l.person || "Unassigned"}{l.running && " · running"}</span></td><td className="text-right tabular-nums text-muted-foreground">{l.days} d × {inr(l.dailyRate)}</td><td className="text-right tabular-nums">{inr(l.cost)}</td></tr>)}</tbody></table>
              )}
              <div className="flex items-center justify-between"><h3 className="text-sm font-medium">Expenses</h3><Button asChild size="sm" variant="outline"><Link to={`/expenses?machine=${detail.machine._id}`}>Add or view</Link></Button></div>
              {detail.expenses.length === 0 ? <p className="text-sm text-muted-foreground">No expenses linked to this machine</p> : (
                <table className="w-full text-sm"><tbody>{detail.expenses.map((e: any) => <tr key={e._id} className="border-t"><td className="py-1.5">{e.description}<span className="text-muted-foreground"> · {e.category} · {fmtDate(e.date)}</span></td><td className="text-right tabular-nums">{inr(e.amount)}</td></tr>)}</tbody></table>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
