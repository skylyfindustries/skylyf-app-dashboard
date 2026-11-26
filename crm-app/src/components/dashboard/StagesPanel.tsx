import { useEffect, useState } from "react";
import { Camera, ChevronDown, Pencil, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { machinesAPI, photoUrl } from "@/services/api";
import { roleLabels, UserRole } from "@/types/crm";
import { cn } from "@/lib/utils";
import { StageUpdateDialog } from "./StageUpdateDialog";
import { MachineRow, StageRow, STATUS_LABEL, STATUS_STYLE, isOverdue } from "./stageUtils";

export const MANAGER_ROLES: UserRole[] = ["super_admin", "admin", "service_manager", "production_manager"];

interface Draft {
  _id?: string;
  name: string;
  assignee: string;
  dueDate: string;
}

// Build stages of one machine: who does what, by when, and the photo proof of each update.
export function StagesPanel({ machine, onChanged }: { machine: MachineRow; onChanged: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const isManager = !!user && MANAGER_ROLES.includes(user.role);
  const stages = machine.stages ?? [];
  const [editing, setEditing] = useState(false);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [people, setPeople] = useState<{ _id: string; name: string; role: string }[]>([]);
  const [updating, setUpdating] = useState<StageRow | null>(null);
  const [openHistory, setOpenHistory] = useState<string | null>(null);

  useEffect(() => {
    if (isManager) machinesAPI.getAssignees().then((r) => setPeople(r.data)).catch(() => {});
  }, [isManager]);

  const startEdit = () => {
    setDrafts(stages.map((s) => ({ _id: s._id, name: s.name, assignee: s.assignee ?? "", dueDate: s.dueDate?.slice(0, 10) ?? "" })));
    setEditing(true);
  };

  const saveStages = async () => {
    if (drafts.some((d) => !d.name.trim())) {
      toast({ title: "Every stage needs a name", variant: "destructive" });
      return;
    }
    try {
      await machinesAPI.update(machine._id, {
        stages: drafts.map((d) => ({ _id: d._id, name: d.name, assignee: d.assignee || null, dueDate: d.dueDate || null })),
      });
      setEditing(false);
      onChanged();
    } catch (e) {
      toast({ title: "Could not save stages", description: (e as Error).message, variant: "destructive" });
    }
  };

  const setDraft = (i: number, patch: Partial<Draft>) => setDrafts(drafts.map((d, k) => (k === i ? { ...d, ...patch } : d)));

  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="text-sm font-medium">Build stages</h3>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground tabular-nums">
            {stages.filter((s) => s.status === "completed").length}/{stages.length} done
          </span>
          {isManager && !editing && (
            <Button size="sm" variant="outline" onClick={startEdit}>
              <Pencil className="w-3.5 h-3.5 mr-1.5" /> Edit stages
            </Button>
          )}
        </div>
      </div>

      {editing ? (
        <div className="space-y-2">
          {drafts.map((d, i) => (
            <div key={d._id ?? i} className="grid grid-cols-[1fr_1fr_auto_auto] gap-2 items-center">
              <Input placeholder="Stage name, e.g. Welding" value={d.name} onChange={(e) => setDraft(i, { name: e.target.value })} />
              <select
                value={d.assignee}
                onChange={(e) => setDraft(i, { assignee: e.target.value })}
                className="h-10 min-w-0 rounded-md border border-input bg-background px-3 text-sm"
                aria-label="Assigned to"
              >
                <option value="">Unassigned</option>
                {people.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name} ({roleLabels[p.role as UserRole] ?? p.role})
                  </option>
                ))}
              </select>
              <Input type="date" value={d.dueDate} onChange={(e) => setDraft(i, { dueDate: e.target.value })} aria-label="Due date" className="w-40" />
              <button
                onClick={() => setDrafts(drafts.filter((_, k) => k !== i))}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Remove stage"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          <div className="flex justify-between pt-1">
            <Button variant="outline" size="sm" onClick={() => setDrafts([...drafts, { name: "", assignee: "", dueDate: "" }])}>
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Add stage
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditing(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={saveStages}>
                Save stages
              </Button>
            </div>
          </div>
        </div>
      ) : stages.length === 0 ? (
        <p className="text-sm text-muted-foreground">No stages yet</p>
      ) : (
        <ul className="divide-y divide-border rounded-md border border-border">
          {stages.map((s) => {
            const mine = !!user && String(s.assignee) === String(user.id);
            const late = isOverdue(s.dueDate, s.status);
            const last = [...(s.updates ?? [])].reverse().find((u) => u.photos?.length);
            return (
              <li key={s._id} className="p-3 text-sm">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{s.name}</div>
                    <div className={cn("text-xs", late ? "text-destructive" : "text-muted-foreground")}>
                      {s.assigneeName || "Unassigned"} ·{" "}
                      {s.dueDate ? `Due ${format(new Date(s.dueDate), "d MMM")}${late ? " (overdue)" : ""}` : "No due date"}
                    </div>
                  </div>
                  <span className="text-xs tabular-nums text-muted-foreground">{s.progress}%</span>
                  <span className={cn("rounded-full px-2 py-0.5 text-xs", STATUS_STYLE[s.status])}>{STATUS_LABEL[s.status]}</span>
                  {s.status !== "completed" && (mine || isManager) && (
                    <Button size="sm" variant="outline" onClick={() => setUpdating(s)}>
                      Update
                    </Button>
                  )}
                  {(s.updates?.length ?? 0) > 0 && (
                    <button
                      onClick={() => setOpenHistory(openHistory === s._id ? null : s._id)}
                      className="text-muted-foreground hover:text-foreground"
                      aria-label="Show update history"
                      aria-expanded={openHistory === s._id}
                    >
                      <ChevronDown className={cn("w-4 h-4 transition-transform", openHistory === s._id && "rotate-180")} />
                    </button>
                  )}
                </div>
                {last && openHistory !== s._id && (
                  <div className="mt-2 flex gap-1.5">
                    {last.photos!.slice(0, 4).map((p) => (
                      <a key={p} href={photoUrl(p)} target="_blank" rel="noreferrer">
                        <img src={photoUrl(p)} alt={`${s.name} progress`} className="h-12 w-12 rounded border border-border object-cover" />
                      </a>
                    ))}
                  </div>
                )}
                {openHistory === s._id && (
                  <ul className="mt-3 space-y-3 border-l border-border pl-3">
                    {[...(s.updates ?? [])].reverse().map((u) => (
                      <li key={u._id}>
                        <div className="text-xs text-muted-foreground">
                          {u.byName} · {format(new Date(u.at), "d MMM, h:mm a")} · {STATUS_LABEL[u.status as StageRow["status"]] ?? u.status} {u.progress}%
                        </div>
                        {u.note && <div>{u.note}</div>}
                        {!!u.photos?.length && (
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {u.photos.map((p) => (
                              <a key={p} href={photoUrl(p)} target="_blank" rel="noreferrer">
                                <img src={photoUrl(p)} alt="Work photo" className="h-16 w-16 rounded border border-border object-cover" />
                              </a>
                            ))}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Camera className="w-3.5 h-3.5" /> Every update needs a photo of the work
      </p>

      <StageUpdateDialog target={updating ? { machine, stage: updating } : null} onClose={() => setUpdating(null)} onSaved={onChanged} />
    </div>
  );
}
