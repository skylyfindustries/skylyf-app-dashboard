import { CountUp } from "@/components/ui/count-up";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Loader2 } from "lucide-react";
import { PipelineStage, machinesAPI, pipelineAPI } from "@/services/api";
import { cn } from "@/lib/utils";
import { MachineRow, STATUS_DOT } from "./stageUtils";

const COLUMNS = ["Planned", "Under Construction", "Testing", "Ready", "Delivered", "In Service"] as const;
const CLOSED = ["Delivered", "In Service"];

// The stage a machine is working on right now: in progress / blocked, else the first one not started.
const currentStage = (m: MachineRow) =>
  m.stages?.find((s) => s.status === "in_progress" || s.status === "blocked") ?? m.stages?.find((s) => s.status === "pending");

// Dashboard pipeline: the stage flow with owners and where every machine is sitting.
export function PipelineOverview() {
  const [machines, setMachines] = useState<MachineRow[] | null>(null);
  const [stages, setStages] = useState<PipelineStage[]>([]);

  useEffect(() => {
    machinesAPI.getAll().then((r) => setMachines(r.data)).catch(() => setMachines([]));
    pipelineAPI.get().then((r) => setStages(r.data.stages)).catch(() => {});
  }, []);

  const view = useMemo(() => {
    const list = machines ?? [];
    const open = list.filter((m) => !CLOSED.includes(m.status ?? ""));
    const perStage = stages.map((st) => {
      const here = open.filter((m) => currentStage(m)?.name.toLowerCase() === st.name.toLowerCase());
      return {
        ...st,
        count: here.length,
        blocked: here.filter((m) => currentStage(m)?.status === "blocked").length,
        names: here.slice(0, 3).map((m) => m.name),
      };
    });
    const byStatus = COLUMNS.map((c) => ({ name: c, count: list.filter((m) => m.status === c).length }));
    return { perStage, byStatus, total: list.length };
  }, [machines, stages]);

  return (
    <section className="bg-card rounded-xl border border-border card-shadow p-5">
      <header className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-sm font-medium">Production pipeline</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Who is responsible at each stage, and where machines are now</p>
        </div>
        <Link to="/pipeline" className="text-xs font-medium text-primary hover:underline">
          Open pipeline
        </Link>
      </header>

      {machines === null ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {view.total > 0 && (
            <div className="mb-5">
              <div className="flex h-2 overflow-hidden rounded-full bg-muted">
                {view.byStatus.map((s) =>
                  s.count ? <div key={s.name} className={STATUS_DOT[s.name]} style={{ width: `${(s.count / view.total) * 100}%` }} title={`${s.name}: ${s.count}`} /> : null,
                )}
              </div>
              <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {view.byStatus.map((s) => (
                  <li key={s.name} className="inline-flex items-center gap-1.5">
                    <span className={cn("h-2 w-2 rounded-full", STATUS_DOT[s.name])} />
                    {s.name} <span className="tabular-nums font-medium text-foreground"><CountUp value={s.count} /></span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {view.perStage.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No pipeline stages set up yet.</p>
          ) : (
            <ol className="flex items-stretch gap-1 overflow-x-auto pb-1">
              {view.perStage.map((s, i) => (
                <li key={`${s.name}-${i}`} className="flex items-center gap-1 shrink-0">
                  <div className="w-44 rounded-lg border border-border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-muted-foreground tabular-nums">Stage {i + 1}</span>
                      {s.blocked > 0 && <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs text-destructive">{s.blocked} blocked</span>}
                    </div>
                    <p className="mt-1 text-sm font-medium truncate">{s.name}</p>
                    <p className={cn("text-xs truncate", s.assigneeName ? "text-muted-foreground" : "text-warning")}>{s.assigneeName || "No one assigned"}</p>
                    <p className="mt-3 text-2xl font-medium tabular-nums leading-none"><CountUp value={s.count} /></p>
                    <p className="text-xs text-muted-foreground truncate">
                      {s.count === 0 ? "no machines" : s.names.join(", ") + (s.count > 3 ? ` +${s.count - 3}` : "")}
                    </p>
                  </div>
                  {i < view.perStage.length - 1 && <ChevronRight className="w-4 h-4 text-muted-foreground/50 shrink-0" />}
                </li>
              ))}
            </ol>
          )}
        </>
      )}
    </section>
  );
}
