import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AppLayout } from "@/components/layout/AppLayout";
import { Panel } from "@/components/dashboard/Panel";
import { StatCard } from "@/components/dashboard/StatCard";
import { useAuth } from "@/contexts/AuthContext";
import { analyticsAPI } from "@/services/api";
import { cn } from "@/lib/utils";

const inr = (n: number) => `₹${Math.round(n || 0).toLocaleString("en-IN")}`;
const days = (n: number | null | undefined) => (n === null || n === undefined ? "—" : `${n} d`);
const monthLabel = (k: string) => new Date(`${k}-01`).toLocaleDateString("en-IN", { month: "short" });
const dayLabel = (k: string) => new Date(k).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });

const C1 = "hsl(var(--chart-1))";
const C2 = "hsl(var(--chart-2))";
const C3 = "hsl(var(--chart-4))";
const axis = { stroke: "hsl(var(--muted-foreground))", fontSize: 12, tickLine: false, axisLine: false } as const;
const tip = { contentStyle: { background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }, cursor: { fill: "hsl(var(--muted))" } };

const TABS = [
  { id: "machines", label: "Machines", roles: ["super_admin", "admin", "service_manager", "production_manager"] },
  { id: "sales", label: "Parts sales", roles: ["super_admin", "admin", "service_manager", "accountant", "sales_executive"] },
  { id: "stock", label: "Stock and racks", roles: ["super_admin", "admin", "service_manager", "production_manager", "accountant", "store_keeper"] },
] as const;
type Tab = (typeof TABS)[number]["id"];

const Empty = ({ text = "No data in this period" }: { text?: string }) => <p className="py-10 text-center text-sm text-muted-foreground">{text}</p>;

// Plain ranked table with a thin bar behind the lead figure
function Ranked({ rows, label, value, format, extra }: { rows: Record<string, any>[]; label: string; value: string; format: (n: number) => string; extra?: { key: string; head: string; format?: (n: number) => string }[] }) {
  if (!rows.length) return <Empty />;
  const max = Math.max(...rows.map((r) => r[value]), 1);
  return (
    <table className="w-full text-sm">
      <thead className="text-left text-xs text-muted-foreground">
        <tr>
          <th className="py-2 font-normal">{label}</th>
          <th className="py-2 font-normal w-1/3" />
          <th className="py-2 font-normal text-right">{label === "Rack" ? "Units" : "Value"}</th>
          {extra?.map((e) => (
            <th key={e.key} className="py-2 pl-3 font-normal text-right">{e.head}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="border-t">
            <td className="py-2 pr-3 truncate max-w-[220px]">{r[Object.keys(r).find((k) => k !== value && typeof r[k] === "string") || ""] || "—"}</td>
            <td className="py-2"><div className="h-1.5 rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${(r[value] / max) * 100}%` }} /></div></td>
            <td className="py-2 text-right tabular-nums">{format(r[value])}</td>
            {extra?.map((e) => (
              <td key={e.key} className="py-2 pl-3 text-right tabular-nums text-muted-foreground">{(e.format || String)(r[e.key])}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function MachinesTab() {
  const [d, setD] = useState<any>(null);
  const [months, setMonths] = useState(12);
  useEffect(() => {
    setD(null);
    analyticsAPI.machines(months).then((r) => setD(r.data)).catch(() => setD({ error: true }));
  }, [months]);
  if (!d) return <Loading />;
  if (d.error) return <Empty text="Could not load machine analytics" />;
  return (
    <div className="space-y-5">
      <Range value={months} onChange={setMonths} options={[[6, "6 months"], [12, "12 months"], [24, "24 months"]]} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Machines per month" value={String(d.machinesPerMonth)} change={`${d.delivered} delivered in ${d.months} months`} />
        <StatCard title="Average build time" value={days(d.avgLeadDays)} change="Order date to delivery" />
        <StatCard title="Delivered on time" value={d.onTimeRate === null ? "—" : `${d.onTimeRate}%`} change="Against target date" changeType={d.onTimeRate !== null && d.onTimeRate < 70 ? "negative" : "neutral"} />
        <StatCard title="On the floor" value={String(d.inProgress)} change={d.avgWipAge === null ? "Nothing in progress" : `Average age ${d.avgWipAge} d`} />
      </div>
      <Panel title="Started and delivered" subtitle="Machines per month">
        <div className="h-72">
          <ResponsiveContainer>
            <BarChart data={d.monthly} margin={{ left: -16 }}>
              <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tickFormatter={monthLabel} {...axis} />
              <YAxis allowDecimals={false} {...axis} />
              <Tooltip {...tip} labelFormatter={monthLabel} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="started" name="Started" fill={C3} radius={[4, 4, 0, 0]} />
              <Bar dataKey="delivered" name="Delivered" fill={C1} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>
      <div className="grid lg:grid-cols-2 gap-5">
        <Panel title="Build time by model" subtitle="Average days from order to delivery">
          {d.types.length === 0 ? <Empty text="Delivered machines will appear here" /> : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground"><tr><th className="py-2 font-normal">Model</th><th className="font-normal text-right">Built</th><th className="font-normal text-right">Average</th><th className="font-normal text-right">Fastest</th><th className="font-normal text-right">Slowest</th></tr></thead>
              <tbody>
                {d.types.map((t: any) => (
                  <tr key={t.type} className="border-t"><td className="py-2">{t.type}</td><td className="text-right tabular-nums">{t.count}</td><td className="text-right tabular-nums">{t.avgDays} d</td><td className="text-right tabular-nums text-muted-foreground">{t.fastest} d</td><td className="text-right tabular-nums text-muted-foreground">{t.slowest} d</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
        <Panel title="Time in each stage" subtitle="Average days to complete, slowest first">
          <Ranked rows={d.stages.map((s: any) => ({ name: s.name, avgDays: s.avgDays, count: s.count }))} label="Stage" value="avgDays" format={(n) => `${n} d`} extra={[{ key: "count", head: "Done" }]} />
        </Panel>
      </div>
      <Panel title="Machines in progress" subtitle="Oldest first">
        {d.wip.length === 0 ? <Empty text="Nothing on the floor" /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground"><tr><th className="py-2 font-normal">Job</th><th className="font-normal">Client</th><th className="font-normal">Current stage</th><th className="font-normal w-40">Progress</th><th className="font-normal text-right">Age</th></tr></thead>
              <tbody>
                {d.wip.map((m: any) => (
                  <tr key={m._id} className="border-t">
                    <td className="py-2"><Link to={`/machines?open=${m._id}`} className="hover:underline"><span className="plate mr-2">{m.machineNo}</span>{m.name}</Link></td>
                    <td className="text-muted-foreground">{m.clientName || "—"}</td>
                    <td>{m.stage || "—"}{m.blocked && <span className="text-destructive text-xs"> · blocked</span>}</td>
                    <td><div className="flex items-center gap-2"><div className="h-1.5 flex-1 rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${m.progress}%` }} /></div><span className="text-xs tabular-nums text-muted-foreground w-8 text-right">{m.progress}%</span></div></td>
                    <td className={cn("text-right tabular-nums", m.overdue && "text-destructive")}>{m.ageDays} d{m.overdue && " · overdue"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}

function SalesTab() {
  const [d, setD] = useState<any>(null);
  const [months, setMonths] = useState(12);
  useEffect(() => {
    setD(null);
    analyticsAPI.partsSales(months).then((r) => setD(r.data)).catch(() => setD({ error: true }));
  }, [months]);
  if (!d) return <Loading />;
  if (d.error) return <Empty text="Could not load sales analytics" />;
  return (
    <div className="space-y-5">
      <Range value={months} onChange={setMonths} options={[[6, "6 months"], [12, "12 months"], [24, "24 months"]]} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Spare parts revenue" value={inr(d.revenue)} change="Before GST" />
        <StatCard title="Units sold" value={d.units.toLocaleString("en-IN")} change={`${d.orders} orders and challans`} />
        <StatCard title="Average order" value={inr(d.avgOrderValue)} change={`Over ${d.months} months`} />
        <StatCard title="Clients buying" value={String(d.clients.length)} change="With dispatched orders" />
      </div>
      <Panel title="Revenue by month" subtitle="Spare parts dispatched to clients">
        <div className="h-72">
          <ResponsiveContainer>
            <AreaChart data={d.monthly} margin={{ left: 0 }}>
              <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tickFormatter={monthLabel} {...axis} />
              <YAxis tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : v)} {...axis} />
              <Tooltip {...tip} labelFormatter={monthLabel} formatter={(v: number) => inr(v)} />
              <Area type="monotone" dataKey="amount" name="Revenue" stroke={C1} fill={C1} fillOpacity={0.12} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Panel>
      <div className="grid lg:grid-cols-2 gap-5">
        <Panel title="Best selling parts" subtitle="By revenue"><Ranked rows={d.parts} label="Part" value="amount" format={inr} extra={[{ key: "qty", head: "Units" }]} /></Panel>
        <Panel title="Top clients" subtitle="By revenue"><Ranked rows={d.clients} label="Client" value="amount" format={inr} extra={[{ key: "qty", head: "Units" }]} /></Panel>
      </div>
    </div>
  );
}

function StockTab() {
  const [d, setD] = useState<any>(null);
  const [range, setRange] = useState(30);
  useEffect(() => {
    setD(null);
    analyticsAPI.stockFlow(range).then((r) => setD(r.data)).catch(() => setD({ error: true }));
  }, [range]);
  const daily = useMemo(() => d?.daily ?? [], [d]);
  if (!d) return <Loading />;
  if (d.error) return <Empty text="Could not load stock analytics" />;
  const h = d.health;
  return (
    <div className="space-y-5">
      <Range value={range} onChange={setRange} options={[[7, "7 days"], [30, "30 days"], [90, "90 days"]]} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Stock value" value={inr(h.stockValue)} change={`${h.totalParts} items`} />
        <StatCard title="Taken from racks" value={d.totals.issued.toLocaleString("en-IN")} change={`Last ${d.days} days`} />
        <StatCard title="Received and returned" value={(d.totals.received + d.totals.returned).toLocaleString("en-IN")} change={`${d.totals.received} in, ${d.totals.returned} back`} />
        <StatCard title="At or below reorder level" value={String(h.lowStock)} change={`${h.deadStock} not used in ${d.days} days, ${inr(h.deadValue)}`} changeType={h.lowStock ? "negative" : "neutral"} />
      </div>
      <Panel title="Stock movement" subtitle="Units per day">
        <div className="h-72">
          <ResponsiveContainer>
            <BarChart data={daily} margin={{ left: -16 }}>
              <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="day" tickFormatter={dayLabel} minTickGap={24} {...axis} />
              <YAxis allowDecimals={false} {...axis} />
              <Tooltip {...tip} labelFormatter={dayLabel} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="issued" name="Taken" stackId="a" fill={C1} />
              <Bar dataKey="received" name="Received" stackId="b" fill={C2} />
              <Bar dataKey="returned" name="Returned" stackId="b" fill={C3} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>
      <div className="grid lg:grid-cols-2 gap-5">
        <Panel title="Busiest racks" subtitle="Units moved in and out">
          <Ranked rows={d.racks.map((r: any) => ({ rack: r.rack, units: r.issued + r.received + r.returned, taken: r.issued, touches: r.touches }))} label="Rack" value="units" format={(n) => n.toLocaleString("en-IN")} extra={[{ key: "taken", head: "Taken" }, { key: "touches", head: "Scans" }]} />
        </Panel>
        <Panel title="Stock held per rack" subtitle="By value">
          <Ranked rows={h.rackStock.map((r: any) => ({ rack: r.rack, value: r.value, parts: r.parts }))} label="Rack" value="value" format={inr} extra={[{ key: "parts", head: "Items" }]} />
        </Panel>
        <Panel title="Most taken parts" subtitle={`Last ${d.days} days`}>
          <Ranked rows={d.topParts.map((p: any) => ({ name: p.name, qty: p.qty, times: p.times }))} label="Part" value="qty" format={(n) => n.toLocaleString("en-IN")} extra={[{ key: "times", head: "Times" }]} />
        </Panel>
        <Panel title="Where parts went" subtitle="Units taken per machine">
          <Ranked rows={d.machines.map((m: any) => ({ machine: m.machine, qty: m.qty, value: m.value }))} label="Machine" value="qty" format={(n) => n.toLocaleString("en-IN")} extra={[{ key: "value", head: "Cost", format: inr }]} />
        </Panel>
        <Panel title="Who takes stock" subtitle="Units taken per person">
          <Ranked rows={d.people.map((p: any) => ({ name: p.name, qty: p.qty, times: p.times }))} label="Person" value="qty" format={(n) => n.toLocaleString("en-IN")} extra={[{ key: "times", head: "Times" }]} />
        </Panel>
        <Panel title="Reorder soon" subtitle="At or below reorder level" action={<Link to="/purchase-orders" className="text-xs text-primary hover:underline">Raise purchase order</Link>}>
          {h.lowList.length === 0 ? <Empty text="Every item is above its reorder level" /> : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground"><tr><th className="py-2 font-normal">Part</th><th className="font-normal text-right">In stock</th><th className="font-normal text-right">Reorder at</th></tr></thead>
              <tbody>
                {h.lowList.map((p: any) => (
                  <tr key={p.name} className="border-t"><td className="py-2">{p.name}</td><td className="text-right tabular-nums text-destructive">{p.quantity}</td><td className="text-right tabular-nums text-muted-foreground">{p.reorderLevel}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
      </div>
    </div>
  );
}

function Loading() {
  return <div className="py-20 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;
}

function Range({ value, onChange, options }: { value: number; onChange: (n: number) => void; options: [number, string][] }) {
  return (
    <div className="inline-flex rounded-lg border p-0.5 bg-card">
      {options.map(([v, label]) => (
        <button key={v} onClick={() => onChange(v)} className={cn("h-8 px-3 rounded-md text-sm transition-colors", value === v ? "bg-muted font-medium" : "text-muted-foreground hover:text-foreground")}>
          {label}
        </button>
      ))}
    </div>
  );
}

export default function AnalyticsPage() {
  const { user } = useAuth();
  const tabs = TABS.filter((t) => user && (t.roles as readonly string[]).includes(user.role));
  const [tab, setTab] = useState<Tab | "">("");
  const current = tab || tabs[0]?.id;
  return (
    <AppLayout title="Analytics">
      <div className="space-y-5">
        <div className="flex gap-1 border-b">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className={cn("h-10 px-4 text-sm -mb-px border-b-2 transition-colors", current === t.id ? "border-primary text-foreground font-medium" : "border-transparent text-muted-foreground hover:text-foreground")}>
              {t.label}
            </button>
          ))}
        </div>
        {current === "machines" && <MachinesTab />}
        {current === "sales" && <SalesTab />}
        {current === "stock" && <StockTab />}
        {!current && <Empty text="No analytics available for your role" />}
      </div>
    </AppLayout>
  );
}
