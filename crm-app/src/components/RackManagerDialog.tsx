import { useCallback, useEffect, useState } from "react";
import { Check, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Rack, racksAPI } from "@/services/api";

interface Props {
  open: boolean;
  onClose: () => void;
  // Called after any change so the page can refresh its rack list and parts
  onChanged: () => void;
}

export function RackManagerDialog({ open, onClose, onChanged }: Props) {
  const { toast } = useToast();
  const [racks, setRacks] = useState<Rack[]>([]);
  const [unlisted, setUnlisted] = useState<{ code: string; partCount: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editCode, setEditCode] = useState("");
  const [editDesc, setEditDesc] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await racksAPI.getAll();
      setRacks(res.data);
      setUnlisted(res.unlisted);
    } catch (e) {
      toast({ title: "Couldn't load racks", description: (e as Error).message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const run = async (fn: () => Promise<unknown>, done?: string) => {
    setBusy(true);
    try {
      await fn();
      if (done) toast({ title: done });
      await load();
      onChanged();
    } catch (e) {
      toast({ title: "Failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const add = () =>
    run(async () => {
      await racksAPI.create({ code, description });
      setCode("");
      setDescription("");
    }, "Rack added");

  const saveEdit = () =>
    run(async () => {
      const res = await racksAPI.update(editId!, { code: editCode, description: editDesc });
      setEditId(null);
      if (res.moved) toast({ title: `Renamed — ${res.moved} part${res.moved === 1 ? "" : "s"} moved` });
    });

  const remove = (r: Rack) => {
    if (!window.confirm(`Delete rack ${r.code}?`)) return;
    run(() => racksAPI.delete(r._id), "Rack deleted");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage racks</DialogTitle>
          <DialogDescription>Racks added here appear as a dropdown in the part form.</DialogDescription>
        </DialogHeader>

        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (code.trim()) add();
          }}
        >
          <Input className="w-32" placeholder="Rack no. e.g. A-01" value={code} onChange={(e) => setCode(e.target.value)} />
          <Input placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
          <Button type="submit" disabled={busy || !code.trim()}>
            <Plus className="w-4 h-4 mr-1" /> Add
          </Button>
        </form>

        {unlisted.length > 0 && (
          <div className="rounded-lg border border-warning/40 bg-warning/5 p-3 text-sm flex items-center justify-between gap-3">
            <span>
              {unlisted.length} location{unlisted.length === 1 ? "" : "s"} used by parts {unlisted.length === 1 ? "isn't" : "aren't"} in the rack list
              <span className="text-muted-foreground"> ({unlisted.slice(0, 4).map((u) => u.code).join(", ")}{unlisted.length > 4 ? "…" : ""})</span>
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => run(() => racksAPI.createMany(unlisted.map((u) => u.code)), "Racks added")}
            >
              Add all
            </Button>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : racks.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">No racks yet. Add your first one above.</p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {racks.map((r) => (
              <li key={r._id} className="flex items-center gap-2 px-3 py-2">
                {editId === r._id ? (
                  <>
                    <Input className="w-28 h-8" value={editCode} onChange={(e) => setEditCode(e.target.value)} />
                    <Input className="h-8" value={editDesc} onChange={(e) => setEditDesc(e.target.value)} />
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={saveEdit} disabled={busy} aria-label="Save">
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditId(null)} aria-label="Cancel">
                      <X className="w-4 h-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">{r.code}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {r.partCount} part{r.partCount === 1 ? "" : "s"}
                        {r.description && ` · ${r.description}`}
                      </p>
                    </div>
                    <Button
                      size="icon" variant="ghost" className="h-8 w-8" aria-label={`Edit ${r.code}`}
                      onClick={() => { setEditId(r._id); setEditCode(r.code); setEditDesc(r.description ?? ""); }}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="icon" variant="ghost" className="h-8 w-8 text-destructive" aria-label={`Delete ${r.code}`}
                      onClick={() => remove(r)} disabled={busy}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
