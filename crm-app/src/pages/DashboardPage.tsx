import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Boxes,
  IndianRupee,
  Loader2,
  PackageCheck,
  PackageX,
  RefreshCw,
  ShieldAlert,
  Users as UsersIcon,
  Activity,
} from "lucide-react";
import { format, startOfDay, subDays } from "date-fns";
import { AppLayout } from "@/components/layout/AppLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { Panel, Empty } from "@/components/dashboard/Panel";
import { CountUp } from "@/components/ui/count-up";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { activityAPI, sparePartsAPI, usersAPI } from "@/services/api";
import { cn } from "@/lib/utils";
import { FLOOR_ROLES, TRACKING_ROLES } from "@/types/crm";
import { MyWorkDashboard } from "@/components/dashboard/MyWorkDashboard";
import { ProductionTracker } from "@/components/dashboard/ProductionTracker";
import { PipelineOverview } from "@/components/dashboard/PipelineOverview";

interface Part {
  _id: string;
  partName: string;
  partNumber?: string;
  category?: string;
  quantity: number;
  reorderLevel: number;
  unitPrice: number;
  unit?: string;
  location?: string;
  status: "In Stock" | "Low Stock" | "Out of Stock";
}

interface Movement {
  _id: string;
  partName: string;
  type: "ISSUE" | "RETURN" | "RECEIVE";
  quantity: number;
  takenBy: string;
  machine?: string;
  movementDate: string;
}

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const STATUS_COLORS = {
  "In Stock": "hsl(var(--success))",
  "Low Stock": "hsl(var(--warning))",
  "Out of Stock": "hsl(var(--destructive))",
} as const;

const RANGE_DAYS = 14;

export default function DashboardPage() {
  const { user } = useAuth();
  if (user && FLOOR_ROLES.includes(user.role)) {
    return (
      <AppLayout title="My Work">
        <MyWorkDashboard />
      </AppLayout>
    );
  }
  return <OverviewDashboard />;
}

function OverviewDashboard() {
  const { user } = useAuth();
  const [parts, setParts] = useState<Part[] | null>(null);
  const [movements, setMovements] = useState<Movement[] | null>(null);
  const [userCount, setUserCount] = useState<number | null>(null);
  const [activity, setActivity] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const from = format(subDays(new Date(), RANGE_DAYS - 1), "yyyy-MM-dd");
    // Each source is independent: a role that can't see one still gets the rest.
    const [p, m, u, a] = await Promise.allSettled([
      sparePartsAPI.getAll(),
      sparePartsAPI.getMovements({ from, limit: "2000" }),
      usersAPI.getAll(),
      activityAPI.getStats(),
    ]);
    setParts(p.status === "fulfilled" ? p.value.data : null);
    setMovements(m.status === "fulfilled" ? m.value.data : null);
    setUserCount(u.status === "fulfilled" ? u.value.count : null);
    setActivity(a.status === "fulfilled" ? a.value.data : null);
    setRefreshedAt(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const inventory = useMemo(() => {
    if (!parts) return null;
    const counts = { "In Stock": 0, "Low Stock": 0, "Out of Stock": 0 };
    const byCategory = new Map<string, { count: number; value: number }>();
    let value = 0;
    for (const p of parts) {
      counts[p.status] += 1;
      value += p.quantity * p.unitPrice;
      const key = p.category || "General";
      const c = byCategory.get(key) ?? { count: 0, value: 0 };
      c.count += 1;
      c.value += p.quantity * p.unitPrice;
      byCategory.set(key, c);
    }
    const categories = [...byCategory.entries()]
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
    const attention = parts
      .filter((p) => p.status !== "In Stock")
      .sort((a, b) => a.quantity - b.quantity)
      .slice(0, 6);
    const topValue = [...parts]
      .sort((a, b) => b.quantity * b.unitPrice - a.quantity * a.unitPrice)
      .slice(0, 5);
    return { counts, value, categories, attention, topValue };
  }, [parts]);

  const flow = useMemo(() => {
    if (!movements) return null;
    const days = Array.from({ length: RANGE_DAYS }, (_, i) => {
      const d = startOfDay(subDays(new Date(), RANGE_DAYS - 1 - i));
      return { key: format(d, "yyyy-MM-dd"), label: format(d, "d MMM"), out: 0, in: 0 };
    });
    const index = new Map(days.map((d) => [d.key, d]));
    const people = new Map<string, number>();
    let issued = 0;
    let returned = 0;
    for (const mv of movements) {
      const d = index.get(format(new Date(mv.movementDate), "yyyy-MM-dd"));
      if (mv.type === "ISSUE") {
        issued += mv.quantity;
        if (d) d.out += mv.quantity;
        people.set(mv.takenBy, (people.get(mv.takenBy) ?? 0) + mv.quantity);
      } else {
        returned += mv.quantity;
        if (d) d.in += mv.quantity;
      }
    }
    const topTakers = [...people.entries()]
      .map(([name, qty]) => ({ name, qty }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
    return { days, issued, returned, topTakers };
  }, [movements]);

  const statusData = inventory
    ? (Object.keys(inventory.counts) as (keyof typeof STATUS_COLORS)[])
        .map((name) => ({ name, value: inventory.counts[name] }))
        .filter((d) => d.value > 0)
    : [];

  const noData = !loading && !parts && !movements && userCount === null && !activity;

  return (
    <AppLayout title="Dashboard">
      <div className="space-y-6 max-w-[1400px]">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-medium text-foreground">
              Overview
            </h1>
            <p className="text-sm text-muted-foreground">
              {format(new Date(), "EEEE, d MMMM yyyy")}
              {refreshedAt && ` · Updated ${format(refreshedAt, "HH:mm:ss")}`}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Refresh
          </Button>
        </div>

        {noData && (
          <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
            Couldn't load any dashboard data. Check that the backend is running
            and try again.
          </div>
        )}

        <PipelineOverview />

        {user && TRACKING_ROLES.includes(user.role) && <ProductionTracker />}

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {inventory && (
            <>
              <StatCard
                delay={1}
                title="Total Parts"
                value={parts!.length.toLocaleString("en-IN")}
                change={`${inventory.counts["In Stock"]} in stock`}
                changeType="neutral"
                icon={Boxes}
              />
              <StatCard
                delay={2}
                title="Inventory Value"
                value={inr.format(inventory.value)}
                change="Qty × unit price"
                icon={IndianRupee}
                iconColor="bg-success/10 text-success"
              />
              <StatCard
                delay={3}
                title="Low Stock"
                value={inventory.counts["Low Stock"]}
                change={
                  inventory.counts["Low Stock"] ? "Needs reordering" : "All healthy"
                }
                changeType={inventory.counts["Low Stock"] ? "negative" : "positive"}
                icon={AlertTriangle}
                iconColor="bg-warning/10 text-warning"
              />
              <StatCard
                delay={4}
                title="Out of Stock"
                value={inventory.counts["Out of Stock"]}
                change={
                  inventory.counts["Out of Stock"] ? "Unavailable now" : "None"
                }
                changeType={
                  inventory.counts["Out of Stock"] ? "negative" : "positive"
                }
                icon={PackageX}
                iconColor="bg-destructive/10 text-destructive"
              />
            </>
          )}
          {flow && (
            <>
              <StatCard
                delay={5}
                title={`Issued (${RANGE_DAYS}d)`}
                value={flow.issued.toLocaleString("en-IN")}
                change="Units taken from racks"
                icon={ArrowUpRight}
              />
              <StatCard
                delay={6}
                title={`Returned / Received (${RANGE_DAYS}d)`}
                value={flow.returned.toLocaleString("en-IN")}
                change="Units back in stock"
                icon={ArrowDownLeft}
                iconColor="bg-success/10 text-success"
              />
            </>
          )}
          {userCount !== null && (
            <StatCard
                delay={7}
              title="Team Members"
              value={userCount}
              icon={UsersIcon}
            />
          )}
          {activity && (
            <StatCard
                delay={8}
              title="Events (24h)"
              value={activity.last24hCount ?? 0}
              change={
                activity.loginFails
                  ? `${activity.loginFails} failed login${activity.loginFails > 1 ? "s" : ""}`
                  : "No failed logins"
              }
              changeType={activity.loginFails ? "negative" : "positive"}
              icon={activity.loginFails ? ShieldAlert : Activity}
              iconColor={
                activity.loginFails
                  ? "bg-destructive/10 text-destructive"
                  : undefined
              }
            />
          )}
        </div>

        {loading && !parts && !movements && (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Charts */}
        {(flow || inventory) && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            {flow && (
              <Panel
                title="Stock movement"
                subtitle={`Units issued vs. returned, last ${RANGE_DAYS} days`}
                className="xl:col-span-2"
                action={
                  <Link
                    to="/rack-scan"
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Open log
                  </Link>
                }
              >
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={flow.days} margin={{ left: -16, right: 8, top: 4 }}>
                      <defs>
                        <linearGradient id="gOut" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gIn" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--chart-3))" stopOpacity={0.25} />
                          <stop offset="100%" stopColor="hsl(var(--chart-3))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} interval="preserveStartEnd" />
                      <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={11} />
                      <Tooltip
                        contentStyle={{
                          borderRadius: 8,
                          border: "1px solid hsl(var(--border))",
                          background: "hsl(var(--card))",
                          fontSize: 12,
                        }}
                      />
                      <Area type="monotone" dataKey="out" name="Issued" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#gOut)" />
                      <Area type="monotone" dataKey="in" name="Returned" stroke="hsl(var(--chart-3))" strokeWidth={2} fill="url(#gIn)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Panel>
            )}

            {inventory && (
              <Panel title="Stock health" subtitle="Parts by status">
                {statusData.length === 0 ? (
                  <Empty text="No parts yet" />
                ) : (
                  <>
                    <div className="h-44">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={statusData}
                            dataKey="value"
                            nameKey="name"
                            innerRadius={50}
                            outerRadius={72}
                            paddingAngle={2}
                            stroke="none"
                          >
                            {statusData.map((d) => (
                              <Cell key={d.name} fill={STATUS_COLORS[d.name as keyof typeof STATUS_COLORS]} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              borderRadius: 8,
                              border: "1px solid hsl(var(--border))",
                              background: "hsl(var(--card))",
                              fontSize: 12,
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <ul className="mt-2 space-y-1.5">
                      {(Object.keys(STATUS_COLORS) as (keyof typeof STATUS_COLORS)[]).map((s) => (
                        <li key={s} className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2 text-muted-foreground">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ background: STATUS_COLORS[s] }} />
                            {s}
                          </span>
                          <span className="font-medium text-foreground"><CountUp value={inventory.counts[s]} /></span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </Panel>
            )}
          </div>
        )}

        {/* Lists */}
        {inventory && (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            <Panel
              title="Needs attention"
              subtitle="Low and out-of-stock parts"
              action={
                <Link to="/spare-parts" className="text-xs font-medium text-primary hover:underline">
                  View all
                </Link>
              }
            >
              {inventory.attention.length === 0 ? (
                <div className="flex-1 min-h-[160px] flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
                  <PackageCheck className="w-6 h-6 text-success" />
                  Everything is stocked
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {inventory.attention.map((p) => (
                    <li key={p._id} className="py-2.5 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{p.partName}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {p.location || "No location"} · reorder at {p.reorderLevel}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full",
                          p.status === "Out of Stock"
                            ? "bg-destructive/10 text-destructive"
                            : "bg-warning/10 text-warning",
                        )}
                      >
                        {p.quantity} {p.unit ?? "pcs"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel title="Value by category" subtitle="Top categories by stock value">
              {inventory.categories.length === 0 ? (
                <Empty text="No categories yet" />
              ) : (
                <div className="h-60">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={inventory.categories} layout="vertical" margin={{ left: 8, right: 16 }}>
                      <XAxis type="number" hide />
                      <YAxis type="category" dataKey="name" width={90} tickLine={false} axisLine={false} fontSize={11} />
                      <Tooltip
                        formatter={(v: number) => inr.format(v)}
                        cursor={{ fill: "hsl(var(--muted))" }}
                        contentStyle={{
                          borderRadius: 8,
                          border: "1px solid hsl(var(--border))",
                          background: "hsl(var(--card))",
                          fontSize: 12,
                        }}
                      />
                      <Bar dataKey="value" name="Value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={16} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Panel>

            <Panel title="Most active" subtitle={`Units issued by person, last ${RANGE_DAYS} days`}>
              {!flow || flow.topTakers.length === 0 ? (
                <Empty text="No issues recorded" />
              ) : (
                <ul className="space-y-3">
                  {flow.topTakers.map((t) => (
                    <li key={t.name}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="font-medium text-foreground truncate">{t.name}</span>
                        <span className="text-muted-foreground"><CountUp value={t.qty} /></span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${(t.qty / flow.topTakers[0].qty) * 100}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        )}

        {/* Recent movements */}
        {movements && (
          <Panel
            title="Recent movements"
            subtitle="Latest rack activity"
            action={
              <Link to="/rack-scan" className="text-xs font-medium text-primary hover:underline">
                Rack scan & log
              </Link>
            }
          >
            {movements.length === 0 ? (
              <Empty text="No movements in this period" />
            ) : (
              <div className="overflow-x-auto -mx-5">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground border-b border-border">
                      <th className="font-medium px-5 py-2">When</th>
                      <th className="font-medium px-3 py-2">Part</th>
                      <th className="font-medium px-3 py-2">Type</th>
                      <th className="font-medium px-3 py-2 text-right">Qty</th>
                      <th className="font-medium px-3 py-2">Person</th>
                      <th className="font-medium px-5 py-2">Machine</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {movements.slice(0, 8).map((m) => (
                      <tr key={m._id}>
                        <td className="px-5 py-2.5 text-muted-foreground whitespace-nowrap">
                          {format(new Date(m.movementDate), "d MMM, h:mm a")}
                        </td>
                        <td className="px-3 py-2.5 font-medium text-foreground">{m.partName}</td>
                        <td className="px-3 py-2.5">
                          <span
                            className={cn(
                              "text-xs font-semibold px-2 py-0.5 rounded-full",
                              m.type === "ISSUE"
                                ? "bg-primary/10 text-primary"
                                : "bg-success/10 text-success",
                            )}
                          >
                            {m.type === "ISSUE" ? "Issued" : m.type === "RETURN" ? "Returned" : "Received"}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums"><CountUp value={m.quantity} /></td>
                        <td className="px-3 py-2.5">{m.takenBy}</td>
                        <td className="px-5 py-2.5 text-muted-foreground">{m.machine || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        )}
      </div>
    </AppLayout>
  );
}
