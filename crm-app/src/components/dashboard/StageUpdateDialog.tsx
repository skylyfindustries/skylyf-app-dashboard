import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { machinesAPI } from "@/services/api";
import { MachineRow, StageRow, machineCode } from "./stageUtils";

const MAX_PHOTOS = 6;

// Progress report on one stage. At least one photo of the work is required.
export function StageUpdateDialog({
  target,
  onClose,
  onSaved,
}: {
  target: { machine: MachineRow; stage: StageRow } | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState({ status: "in_progress", progress: "0", note: "" });
  const [photos, setPhotos] = useState<{ file: File; url: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const picker = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!target) return;
    setForm({
      status: target.stage.status === "pending" ? "in_progress" : target.stage.status,
      progress: String(target.stage.progress ?? 0),
      note: "",
    });
    setPhotos([]);
  }, [target]);

  // Release preview blobs when they are replaced or the dialog unmounts
  useEffect(() => () => photos.forEach((p) => URL.revokeObjectURL(p.url)), [photos]);

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const next = [...photos, ...Array.from(list).map((file) => ({ file, url: URL.createObjectURL(file) }))];
    setPhotos(next.slice(0, MAX_PHOTOS));
    if (picker.current) picker.current.value = "";
  };

  const submit = async () => {
    if (!target) return;
    setSaving(true);
    try {
      await machinesAPI.updateStage(target.machine._id, target.stage._id, {
        status: form.status,
        progress: Number(form.progress),
        note: form.note,
        photos: photos.map((p) => p.file),
      });
      toast({ title: "Progress updated" });
      onSaved();
      onClose();
    } catch (e) {
      toast({ title: "Could not update", description: (e as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const blocked = form.status === "blocked";
  const invalid = !photos.length || (blocked && !form.note.trim());

  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{target?.stage.name}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {target && `${machineCode(target.machine)} · ${target.machine.name}`}
          </p>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Status</Label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="in_progress">In progress</option>
              <option value="completed">Done</option>
              <option value="blocked">Blocked</option>
            </select>
          </div>
          {form.status === "in_progress" && (
            <div>
              <Label>Progress (%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                placeholder="e.g. 60"
                value={form.progress}
                onChange={(e) => setForm({ ...form, progress: e.target.value })}
              />
            </div>
          )}
          <div>
            <Label>{blocked ? "What is blocking this? *" : "Note"}</Label>
            <Input
              placeholder={blocked ? "e.g. Waiting for motor part" : "Optional note for the manager"}
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
            />
          </div>
          <div>
            <Label icon={Camera}>Photos of the work *</Label>
            <input
              ref={picker}
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              className="hidden"
              onChange={(e) => addFiles(e.target.files)}
            />
            <div className="flex flex-wrap gap-2">
              {photos.map((p, i) => (
                <div key={p.url} className="relative h-20 w-20 overflow-hidden rounded-md border border-border">
                  <img src={p.url} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setPhotos(photos.filter((_, k) => k !== i))}
                    className="absolute right-0.5 top-0.5 rounded-full bg-background/90 p-0.5"
                    aria-label={`Remove photo ${i + 1}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {photos.length < MAX_PHOTOS && (
                <button
                  type="button"
                  onClick={() => picker.current?.click()}
                  className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border text-xs text-muted-foreground hover:bg-muted/50"
                >
                  <Camera className="h-5 w-5" /> Add
                </button>
              )}
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">Up to {MAX_PHOTOS} photos. At least one is required</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving || invalid}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
