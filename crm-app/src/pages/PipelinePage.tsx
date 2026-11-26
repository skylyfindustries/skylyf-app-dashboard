import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Loader2, PauseCircle, Search, Settings2 } from "lucide-react";
import { format } from "date-fns";
import { AppLayout } from "@/components/layout/AppLayout";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { PipelineStage, machinesAPI, pipelineAPI } from "@/services/api";
import { PipelineSetupDialog } from "@/components/PipelineSetupDialog";
import { Button } from "@/components/ui/button";
import { MANAGER_ROLES } from "@/components/dashboard/StagesPanel";
import { MachineRow, STATUS_DOT, STATUS_STYLE, machineCode } from "@/components/dashboard/stageUtils";
import { cn } from "@/lib/utils";

const COLUMNS = ["Planned", "Under Construction", "Testing", "Ready", "Delivered", "In Service"] as const;


// Production pipeline: every machine as a card in the column for its current status.
export default function PipelinePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const canMove = !!user && MANAGER_ROLES.includes(user.role);
  const [machines, setMachines] = useState<MachineRow[] | null>(null);
  const [search, setSearch] = useState("");
  const [onlyMine, setOnlyMine] = useState(false);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [setupOpen, setSetupOpen] = useState(false);

  const loadStages = useCallback(async () => {
    try {
      setStages((await pipelineAPI.get()).data.stages);
    } catch {
      /* the board still works without the owner strip */
    }
  }, []);
  useEffect(() => {
    loadStages();
  }, [loadStages]);

  const load = useCallback(async () => {
    try {
      setMachines((await machinesAPI.getAll()).data);
    } catch (e) {
      toast({ title: "Failed to load pipeline", description: (e as Error).message, variant: "destructive" });
      setMachines([]);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const move = async (m: MachineRow, status: string) => {
    const prev = machines;
    setMachines((list) => list!.map((x) => (x._id === m._id ? { ...x, status } : x)));
    try {
      await machinesAPI.update(m._id, { status });
    } catch (e) {
      setMachines(prev);
      toast({ title: "Could not move machine", description: (e as Error).message, variant: "destructive" });
    }
  };

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (machines ?? []).filter(
      (m) =>
        (!q || [machineCode(m), m.name, m.clientName].some((v) => v?.toLowerCase().includes(q))) &&
        (!onlyMine || m.stages?.some((s) => String(s.assignee) === String(user?.id))),
    );
  }, [machines, search, onlyMine, user]);

  return (
    <AppLayout title="Production Pipeline">
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="flex items-center gap-2 bg-card rounded-lg border border-border px-3 py-2 w-64">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Job no., machine, client"
            className="bg-transparent outline-none text-sm w-full"
          />
        </div>
        <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <input type="checkbox" checked={onlyMine} onChange={(e) => setOnlyMine(e.target.checked)} />
          Only machines I have work on
        </label>
        {canMove && (
          <Button variant="outline" size="sm" className="ml-auto gap-1.5" onClick={() => setSetupOpen(true)}>
            <Settings2 className="w-4 h-4" /> Pipeline setup
          </Button>
        )}
      </div>

      {stages.length > 0 && (
        <div className="mb-5 flex gap-2 overflow-x-auto pb-1" aria-label="Pipeline stages and owners">
          {stages.map((s, i) => (
            <div key={`${s.name}-${i}`} className="shrink-0 rounded-md border border-border bg-card px-3 py-2 text-xs">
              <div className="font-medium">
                <span className="mr-1.5 text-muted-foreground tabular-nums">{i + 1}</span>
                {s.name}
              </div>
              <div className={s.assigneeName ? "text-muted-foreground" : "text-warning"}>
                {s.assigneeName || "No one assigned"}
              </div>
            </div>
          ))}
        </div>
      )}

      <PipelineSetupDialog open={setupOpen} stages={stages} onClose={() => setSetupOpen(false)} onSaved={loadStages} />

      {machines === null ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-3">
          {COLUMNS.map((col) => {
            const items = visible.filter((m) => m.status === col);
            return (
              <section key={col} className="w-72 shrink-0 rounded-lg bg-muted/50 p-3">
                <header className="mb-3 flex items-center justify-between text-sm">
                  <span className="inline-flex items-center gap-2 font-medium">
                    <span className={cn("h-2 w-2 rounded-full", STATUS_DOT[col])} /> {col}
                  </span>
                  <span className="text-xs text-muted-foreground tabular-nums">{items.length}</span>
                </header>
                <div className="space-y-2">
                  {items.length === 0 && <p className="py-6 text-center text-xs text-muted-foreground">Empty</p>}
                  {items.map((m) => {
                    const current = m.stages?.find((s) => s.status === "in_progress" || s.status === "blocked") ?? m.stages?.find((s) => s.status === "pending");
                    return (
                      <div key={m._id} className="rounded-md border border-border bg-card p-3 text-sm">
                        <Link to={`/machines?open=${m._id}`} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded">
                          <div className="flex items-center justify-between gap-2">
                            <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">{machineCode(m)}</span>
                            {m.blocked && (
                              <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs", STATUS_STYLE.blocked)}>
                                <PauseCircle className="w-3 h-3" /> Blocked
                              </span>
                            )}
                            {!m.blocked && m.overdue && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2 py-0.5 text-xs text-warning">
                                <AlertTriangle className="w-3 h-3" /> Overdue
                              </span>
                            )}
                          </div>
                          <div className="mt-1.5 font-medium truncate">{m.name}</div>
                          {m.clientName && <div className="text-xs text-muted-foreground truncate">{m.clientName}</div>}
                          <div className="mt-3 h-1.5 rounded-full bg-foreground/10 overflow-hidden">
                            <div className="h-full bg-foreground" style={{ width: `${m.progress ?? 0}%` }} />
                          </div>
                          <div className="mt-1 flex justify-between text-xs text-muted-foreground tabular-nums">
                            <span>{m.progress ?? 0}%</span>
                            <span>{m.targetDate ? `Due ${format(new Date(m.targetDate), "d MMM")}` : "No due date"}</span>
                          </div>
                          {(m as MachineRow & { qcTotal?: number; qcPassed?: number }).qcTotal ? (
                            <div className="mt-1 text-xs text-muted-foreground tabular-nums">
                              QC {(m as MachineRow & { qcPassed?: number }).qcPassed}/{(m as MachineRow & { qcTotal?: number }).qcTotal}
                            </div>
                          ) : null}
                          {current && (
                            <div className="mt-2 text-xs text-muted-foreground truncate">
                              Now: {current.name}
                              {current.assigneeName ? ` · ${current.assigneeName}` : ""}
                            </div>
                          )}
                        </Link>
                        {canMove && (
                          <select
                            value={m.status}
                            onChange={(e) => move(m, e.target.value)}
                            className="mt-3 h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
                            aria-label={`Move ${m.name}`}
                          >
                            {COLUMNS.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </AppLayout>
  );
}
