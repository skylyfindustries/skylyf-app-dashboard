import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, CheckCircle2, ClipboardList, Loader2, PlayCircle, ScanBarcode, Timer } from "lucide-react";
import { format } from "date-fns";
import { StatCard } from "@/components/dashboard/StatCard";
import { Button } from "@/components/ui/button";
import { StageUpdateDialog } from "@/components/dashboard/StageUpdateDialog";
import { useAuth } from "@/contexts/AuthContext";
import { machinesAPI } from "@/services/api";
import { roleLabels } from "@/types/crm";
import { cn } from "@/lib/utils";
import { MachineRow, StageRow, STATUS_LABEL, STATUS_STYLE, isOverdue, machineCode } from "./stageUtils";

interface Task {
  machine: MachineRow;
  stage: StageRow;
}

// Dashboard for shop-floor roles: only the stages assigned to the signed-in person.
export function MyWorkDashboard() {
  const { user } = useAuth();
  const [machines, setMachines] = useState<MachineRow[] | null>(null);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<Task | null>(null);

  const load = useCallback(async () => {
    try {
      setMachines((await machinesAPI.getAll()).data);
      setError("");
    } catch (e) {
      setError((e as Error).message);
      setMachines([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const tasks = useMemo<Task[]>(() => {
    if (!machines || !user) return [];
    const out: Task[] = [];
    for (const machine of machines)
      for (const stage of machine.stages ?? [])
        if (String(stage.assignee) === String(user.id)) out.push({ machine, stage });
    const rank = { blocked: 0, in_progress: 1, pending: 2, completed: 3 };
    return out.sort(
      (a, b) =>
        rank[a.stage.status] - rank[b.stage.status] ||
        (a.stage.dueDate ?? "9").localeCompare(b.stage.dueDate ?? "9"),
    );
  }, [machines, user]);

  const open = tasks.filter((t) => t.stage.status !== "completed");
  const stats = {
    open: open.length,
    inProgress: tasks.filter((t) => t.stage.status === "in_progress").length,
    overdue: open.filter((t) => isOverdue(t.stage.dueDate, t.stage.status)).length,
    done: tasks.length - open.length,
  };

  const openUpdate = (t: Task) => setEditing(t);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Hello, {user?.name?.split(" ")[0]}</h1>
          <p className="text-sm text-muted-foreground">
            {user ? roleLabels[user.role] : ""} · {format(new Date(), "EEEE, d MMM")}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to="/rack-scan">
            <ScanBarcode className="w-4 h-4 mr-2" /> Take / return a part
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title="My open tasks" value={stats.open} icon={ClipboardList} />
        <StatCard title="In progress" value={stats.inProgress} icon={PlayCircle} />
        <StatCard
          title="Overdue"
          value={stats.overdue}
          icon={AlertTriangle}
          iconColor="bg-destructive/10 text-destructive"
        />
        <StatCard title="Completed" value={stats.done} icon={CheckCircle2} iconColor="bg-success/10 text-success" />
      </div>

      {error && <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">{error}</div>}

      <section className="bg-card rounded-xl border border-border card-shadow p-5">
        <h2 className="text-sm font-semibold mb-4">My assigned work</h2>
        {machines === null ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : tasks.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Nothing is assigned to you yet</p>
        ) : (
          <ul className="divide-y divide-border">
            {tasks.map((t) => {
              const late = isOverdue(t.stage.dueDate, t.stage.status);
              return (
                <li key={t.stage._id} className="flex flex-wrap items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                        {machineCode(t.machine)}
                      </span>
                      <span className="font-medium truncate">{t.stage.name}</span>
                    </div>
                    <div className={cn("mt-0.5 flex items-center gap-1 text-xs", late ? "text-destructive" : "text-muted-foreground")}>
                      <Timer className="w-3 h-3" />
                      {t.machine.name}
                      {t.machine.customer ? ` · ${t.machine.customer}` : ""} ·{" "}
                      {t.stage.dueDate ? `Due ${format(new Date(t.stage.dueDate), "d MMM")}${late ? " (overdue)" : ""}` : "No due date"}
                    </div>
                  </div>
                  <div className="w-28">
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${t.stage.progress}%` }} />
                    </div>
                    <div className="mt-1 text-xs tabular-nums text-muted-foreground text-right">{t.stage.progress}%</div>
                  </div>
                  <span className={cn("rounded-full px-2 py-0.5 text-xs", STATUS_STYLE[t.stage.status])}>
                    {STATUS_LABEL[t.stage.status]}
                  </span>
                  {t.stage.status !== "completed" && (
                    <Button size="sm" onClick={() => openUpdate(t)}>
                      Update
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <StageUpdateDialog target={editing} onClose={() => setEditing(null)} onSaved={load} />
    </div>
  );
}
