import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { PipelineStage, machinesAPI, pipelineAPI } from "@/services/api";

interface Props {
  open: boolean;
  stages: PipelineStage[];
  onClose: () => void;
  onSaved: () => void;
}

type Row = { key: number; name: string; assignee: string };
type Person = { _id: string; name: string; role: string };

const NONE = "__none__";
let seq = 0;

export function PipelineSetupDialog({ open, stages, onClose, onSaved }: Props) {
  const { toast } = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [applyToOpen, setApplyToOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Reset from the saved pipeline each time the dialog opens
  useEffect(() => {
    if (!open) return;
    setRows(stages.map((s) => ({ key: ++seq, name: s.name, assignee: s.assignee ? String(s.assignee) : "" })));
    setApplyToOpen(false);
    machinesAPI
      .getAssignees()
      .then((r) => setPeople(r.data))
      .catch((e) => toast({ title: "Couldn't load users", description: (e as Error).message, variant: "destructive" }));
  }, [open, stages, toast]);

  const patch = (key: number, p: Partial<Row>) => setRows((r) => r.map((x) => (x.key === key ? { ...x, ...p } : x)));
  const move = (i: number, d: -1 | 1) =>
    setRows((r) => {
      const j = i + d;
      if (j < 0 || j >= r.length) return r;
      const next = [...r];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const unassigned = rows.filter((r) => !r.assignee).length;

  const save = async () => {
    setSaving(true);
    try {
      const res = await pipelineAPI.save(
        rows.map((r) => ({ name: r.name.trim(), assignee: r.assignee || null })),
        applyToOpen,
      );
      toast({
        title: "Pipeline saved",
        description: applyToOpen ? `${res.updatedStages} open stage${res.updatedStages === 1 ? "" : "s"} reassigned.` : "New machines will use these stages and owners.",
      });
      onSaved();
      onClose();
    } catch (e) {
      toast({ title: "Couldn't save pipeline", description: (e as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Pipeline setup</DialogTitle>
          <DialogDescription>
            Set the production stages in order and who is responsible for each. Every new machine starts with these.
          </DialogDescription>
        </DialogHeader>

        <ol className="space-y-2">
          {rows.map((r, i) => (
            <li key={r.key} className="flex items-center gap-2">
              <span className="w-5 text-right text-xs text-muted-foreground tabular-nums">{i + 1}</span>
              <Input
                className="flex-1"
                placeholder="Stage name"
                value={r.name}
                onChange={(e) => patch(r.key, { name: e.target.value })}
              />
              <Select value={r.assignee || NONE} onValueChange={(v) => patch(r.key, { assignee: v === NONE ? "" : v })}>
                <SelectTrigger className="w-[190px]">
                  <SelectValue placeholder="Responsible" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Unassigned</SelectItem>
                  {people.map((p) => (
                    <SelectItem key={p._id} value={p._id}>
                      {p.name}
                    </SelectItem>
                  ))}
                  {/* keep a saved owner visible even if the user list hasn't loaded */}
                  {r.assignee && !people.some((p) => p._id === r.assignee) && (
                    <SelectItem value={r.assignee}>{stages.find((s) => String(s.assignee) === r.assignee)?.assigneeName || "Current owner"}</SelectItem>
                  )}
                </SelectContent>
              </Select>
              <Button size="icon" variant="ghost" className="h-8 w-8" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up">
                <ArrowUp className="w-4 h-4" />
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8" disabled={i === rows.length - 1} onClick={() => move(i, 1)} aria-label="Move down">
                <ArrowDown className="w-4 h-4" />
              </Button>
              <Button
                size="icon" variant="ghost" className="h-8 w-8 text-destructive" disabled={rows.length === 1}
                onClick={() => setRows((x) => x.filter((y) => y.key !== r.key))} aria-label="Remove stage"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </li>
          ))}
        </ol>

        <Button variant="outline" size="sm" className="w-fit" onClick={() => setRows((r) => [...r, { key: ++seq, name: "", assignee: "" }])}>
          <Plus className="w-4 h-4 mr-1" /> Add stage
        </Button>

        {unassigned > 0 && (
          <p className="text-xs text-muted-foreground">
            {unassigned} stage{unassigned === 1 ? " has" : "s have"} no one responsible yet.
          </p>
        )}

        <label className="flex items-start gap-2 rounded-lg border border-border p-3 text-sm">
          <input type="checkbox" className="mt-0.5 rounded" checked={applyToOpen} onChange={(e) => setApplyToOpen(e.target.checked)} />
          <span>
            Also reassign machines already in production
            <span className="block text-xs text-muted-foreground">
              Changes the owner on unfinished stages with the same name. Completed stages and their history are untouched.
            </span>
          </span>
        </label>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={save} disabled={saving || rows.some((r) => !r.name.trim())}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save pipeline
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
