import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import * as XLSX from "xlsx";
import { AlertTriangle, CheckCircle2, Clock, Download, Loader2, PauseCircle, ShieldAlert, Timer, Truck } from "lucide-react";
import { format } from "date-fns";
import { AppLayout } from "@/components/layout/AppLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { MaterialNeedRow, ProductionAnalytics, StatRow, productionAPI } from "@/services/api";
import { cn } from "@/lib/utils";

const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

function Panel({ title, subtitle, action, children }: { title: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="bg-card rounded-xl border border-border card-shadow p-5">
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

function StatTable({ rows, label }: { rows: StatRow[]; label: string }) {
  if (!rows.length) return <p className="py-6 text-center text-sm text-muted-foreground">No data yet</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-xs text-muted-foreground">
          <tr>
            <th className="py-2 font-normal">{label}</th>
            <th className="py-2 text-right font-normal">Done</th>
            <th className="py-2 text-right font-normal">Open</th>
            <th className="py-2 text-right font-normal">Late</th>
            <th className="py-2 text-right font-normal">Blocked</th>
            <th className="py-2 text-right font-normal">Avg days</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((r) => (
            <tr key={r.name}>
              <td className="py-2">{r.name}</td>
              <td className="py-2 text-right tabular-nums">{r.done}</td>
              <td className="py-2 text-right tabular-nums">{r.open}</td>
              <td className={cn("py-2 text-right tabular-nums", r.late > 0 && "text-red-700")}>{r.late}</td>
              <td className={cn("py-2 text-right tabular-nums", r.blocked > 0 && "text-red-700")}>{r.blocked}</td>
              <td className="py-2 text-right tabular-nums">{r.avgDays || "–"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ProductionInsightsPage() {
  const { toast } = useToast();
  const [days, setDays] = useState(90);
  const [stats, setStats] = useState<ProductionAnalytics | null>(null);
  const [needs, setNeeds] = useState<{ rows: MaterialNeedRow[]; shortParts: number; estCost: number } | null>(null);
  const [showAll, setShowAll] = useState(false);

  const load = useCallback(async () => {
    try {
      const [a, n] = await Promise.all([productionAPI.analytics(days), productionAPI.materialNeeds()]);
      setStats(a.data);
      setNeeds(n.data);
    } catch (e) {
      toast({ title: "Failed to load insights", description: (e as Error).message, variant: "destructive" });
    }
  }, [days, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const exportShortages = () => {
    const rows = (needs?.rows ?? [])
      .filter((r) => r.shortage > 0)
      .map((r) => ({
        Part: r.partName,
        SKU: r.partNumber,
        Supplier: r.supplier,
        "Needed for open machines": r.required,
        "In stock": r.inStock,
        "To buy": r.shortage,
        Unit: r.unit,
        "Unit price": r.unitPrice,
        "Estimated cost": r.estCost,
        "Needed for": r.machines.map((m) => `${m.machineNo} (${m.quantity})`).join(", "),
      }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "To buy");
    XLSX.writeFile(wb, `purchase-list-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
  };

  if (!stats || !needs)
    return (
      <AppLayout title="Production Insights">
        <div className="flex justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );

  const shown = showAll ? needs.rows : needs.rows.filter((r) => r.shortage > 0);

  return (
    <AppLayout title="Production Insights">
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">Delivery, bottlenecks, team workload and material needs for open machines.</p>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            aria-label="Period"
          >
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={365}>Last year</option>
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            title="On-time delivery"
            value={stats.onTimeRate === null ? "–" : `${stats.onTimeRate}%`}
            change={`${stats.delivered} delivered`}
            icon={Truck}
            iconColor="bg-success/10 text-success"
          />
          <StatCard title="Avg order → delivery" value={stats.avgLeadDays === null ? "–" : `${stats.avgLeadDays} d`} icon={Clock} />
          <StatCard title="Overdue machines" value={stats.overdue} change={`${stats.active} in production`} icon={AlertTriangle} iconColor="bg-warning/10 text-warning" />
          <StatCard title="Blocked stages" value={stats.blocked} icon={PauseCircle} iconColor="bg-destructive/10 text-destructive" />
          <StatCard title="Awaiting QC" value={stats.qcPending} change={stats.qcFailed ? `${stats.qcFailed} with a failed check` : "No failed checks"} icon={ShieldAlert} />
          <StatCard
            title="Parts to buy"
            value={needs.shortParts}
            change={`≈ ${inr(needs.estCost)}`}
            icon={Timer}
            iconColor="bg-destructive/10 text-destructive"
          />
          {stats.bottleneck && (
            <StatCard
              title="Biggest bottleneck"
              value={stats.bottleneck.name}
              change={`${stats.bottleneck.open} open · ${stats.bottleneck.late} late · ${stats.bottleneck.blocked} blocked`}
              icon={AlertTriangle}
              iconColor="bg-warning/10 text-warning"
            />
          )}
        </div>

        <Panel
          title="Material needs"
          subtitle="Planned parts of unfinished machines, minus what was already issued, against rack stock"
          action={
            <Button size="sm" variant="outline" onClick={exportShortages} disabled={needs.shortParts === 0}>
              <Download className="w-3.5 h-3.5 mr-1.5" /> Purchase list
            </Button>
          }
        >
          {shown.length === 0 ? (
            <p className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Everything planned is in stock
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="py-2 font-normal">Part</th>
                    <th className="py-2 font-normal">Needed for</th>
                    <th className="py-2 text-right font-normal">Needed</th>
                    <th className="py-2 text-right font-normal">In stock</th>
                    <th className="py-2 text-right font-normal">To buy</th>
                    <th className="py-2 text-right font-normal">Est. cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {shown.map((r) => (
                    <tr key={r.part}>
                      <td className="py-2">
                        {r.partName}
                        <div className="text-xs text-muted-foreground">{[r.partNumber, r.supplier].filter(Boolean).join(" · ")}</div>
                      </td>
                      <td className="py-2 text-xs">
                        {r.machines.map((m) => (
                          <Link key={m._id} to={`/machines?open=${m._id}`} className="mr-2 underline-offset-2 hover:underline">
                            {m.machineNo} ({m.quantity})
                          </Link>
                        ))}
                      </td>
                      <td className="py-2 text-right tabular-nums">{r.required}</td>
                      <td className="py-2 text-right tabular-nums">{r.inStock}</td>
                      <td className={cn("py-2 text-right tabular-nums font-medium", r.shortage > 0 && "text-red-700")}>{r.shortage}</td>
                      <td className="py-2 text-right tabular-nums">{r.shortage ? inr(r.estCost) : "–"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <button onClick={() => setShowAll((v) => !v)} className="mt-3 text-xs text-muted-foreground hover:text-foreground">
            {showAll ? "Show only parts to buy" : "Show all planned parts"}
          </button>
        </Panel>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <Panel title="Stages" subtitle="Average days from start to finish, and where work is piling up">
            <StatTable rows={stats.stages} label="Stage" />
          </Panel>
          <Panel title="Team" subtitle="Stages finished and still open per person">
            <StatTable rows={stats.people} label="Person" />
          </Panel>
        </div>

        <Panel title="Blocked right now" subtitle="Stages waiting on something, with the reason given">
          {stats.blockedList.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Nothing is blocked</p>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {stats.blockedList.map((b, i) => (
                <li key={i} className="flex flex-wrap items-start justify-between gap-2 py-2.5">
                  <div>
                    <Link to={`/machines?open=${b.machineId}`} className="font-medium hover:underline">
                      {b.machineNo} · {b.machine}
                    </Link>
                    <div className="text-xs text-muted-foreground">
                      {b.stage} · {b.assignee || "Unassigned"}
                    </div>
                  </div>
                  <div className="max-w-md text-right text-xs">
                    {b.reason || "No reason given"}
                    {b.since && <div className="text-muted-foreground">since {format(new Date(b.since), "d MMM")}</div>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </AppLayout>
  );
}
