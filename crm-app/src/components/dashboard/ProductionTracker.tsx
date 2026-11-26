import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Cog, Loader2, PauseCircle } from "lucide-react";
import { format } from "date-fns";
import { StatCard } from "@/components/dashboard/StatCard";
import { machinesAPI } from "@/services/api";
import { cn } from "@/lib/utils";
import { MachineRow, STATUS_LABEL, STATUS_STYLE, isOverdue, machineCode } from "./stageUtils";

// Production manager view: every machine, who is on which stage, and what is stuck.
export function ProductionTracker() {
  const [machines, setMachines] = useState<MachineRow[] | null>(null);

  useEffect(() => {
    machinesAPI.getAll().then((r) => setMachines(r.data)).catch(() => setMachines([]));
  }, []);

  const view = useMemo(() => {
    const list = machines ?? [];
    const stages = list.flatMap((m) => (m.stages ?? []).map((s) => ({ m, s })));
    const blocked = stages.filter(({ s }) => s.status === "blocked");
    const late = stages.filter(({ s }) => isOverdue(s.dueDate, s.status));
    const done = list.filter((m) => (m.stages?.length ?? 0) > 0 && m.stages!.every((s) => s.status === "completed"));
    const workload = new Map<string, { open: number; late: number }>();
    for (const { s } of stages) {
      if (s.status === "completed") continue;
      const k = s.assigneeName || "Unassigned";
      const w = workload.get(k) ?? { open: 0, late: 0 };
      w.open += 1;
      if (isOverdue(s.dueDate, s.status)) w.late += 1;
      workload.set(k, w);
    }
    return {
      active: list.length - done.length,
      blocked,
      late,
      done: done.length,
      workload: [...workload.entries()].sort((a, b) => b[1].open - a[1].open),
      machines: list.filter((m) => !done.includes(m)),
    };
  }, [machines]);

  if (machines === null)
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title="Machines in production" value={view.active} icon={Cog} />
        <StatCard title="Blocked stages" value={view.blocked.length} icon={PauseCircle} iconColor="bg-destructive/10 text-destructive" />
        <StatCard title="Overdue stages" value={view.late.length} icon={AlertTriangle} iconColor="bg-warning/10 text-warning" />
        <StatCard title="Completed machines" value={view.done} icon={CheckCircle2} iconColor="bg-success/10 text-success" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <section className="xl:col-span-2 bg-card rounded-xl border border-border card-shadow p-5">
          <h2 className="text-sm font-semibold mb-4">Production progress</h2>
          {view.machines.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No machines in production</p>
          ) : (
            <ul className="space-y-4">
              {view.machines.map((m) => (
                <li key={m._id}>
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="min-w-0 truncate">
                      <span className="font-mono text-xs text-muted-foreground mr-2">{machineCode(m)}</span>
                      <span className="font-medium">{m.name}</span>
                    </span>
                    <span className="text-xs tabular-nums text-muted-foreground shrink-0">
                      {m.progress ?? 0}%{m.targetDate ? ` · due ${format(new Date(m.targetDate), "d MMM")}` : ""}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${m.progress ?? 0}%` }} />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {(m.stages ?? []).map((s) => (
                      <span
                        key={s._id}
                        title={`${s.name} · ${s.assigneeName ?? ""} · ${s.progress}%`}
                        className={cn("rounded-full px-2 py-0.5 text-xs", STATUS_STYLE[s.status])}
                      >
                        {s.name} · {s.assigneeName?.split(" ")[0] || "?"} · {STATUS_LABEL[s.status]}
                      </span>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="space-y-4">
          <section className="bg-card rounded-xl border border-border card-shadow p-5">
            <h2 className="text-sm font-semibold mb-3">Needs attention</h2>
            {view.blocked.length + view.late.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing blocked or overdue</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {[...view.blocked, ...view.late.filter((x) => x.s.status !== "blocked")].slice(0, 8).map(({ m, s }) => (
                  <li key={s._id} className="flex items-start justify-between gap-2">
                    <span className="min-w-0">
                      <span className="font-mono text-xs text-muted-foreground">{machineCode(m)}</span> {s.name}
                      <span className="block text-xs text-muted-foreground">{s.assigneeName}</span>
                    </span>
                    <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs", s.status === "blocked" ? STATUS_STYLE.blocked : "bg-warning/10 text-warning")}>
                      {s.status === "blocked" ? "Blocked" : "Overdue"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="bg-card rounded-xl border border-border card-shadow p-5">
            <h2 className="text-sm font-semibold mb-3">Team workload</h2>
            {view.workload.length === 0 ? (
              <p className="text-sm text-muted-foreground">No open work</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {view.workload.map(([name, w]) => (
                  <li key={name} className="flex items-center justify-between">
                    <span>{name}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {w.open} open{w.late ? <span className="text-destructive"> · {w.late} late</span> : null}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
