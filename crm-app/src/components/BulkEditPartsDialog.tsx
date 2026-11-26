import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { sparePartsAPI } from "@/services/api";

const UNITS = ["pcs", "kg", "m", "litre", "set", "box"];

type FieldKey = "category" | "location" | "supplier" | "unit" | "reorderLevel" | "unitPrice" | "gstPercent";

const FIELDS: { key: FieldKey; label: string; type: "text" | "number" | "unit" | "category" | "rack" }[] = [
  { key: "category", label: "Category", type: "category" },
  { key: "location", label: "Rack", type: "rack" },
  { key: "supplier", label: "Supplier", type: "text" },
  { key: "unit", label: "Unit", type: "unit" },
  { key: "reorderLevel", label: "Reorder level", type: "number" },
  { key: "unitPrice", label: "Unit price (₹)", type: "number" },
  { key: "gstPercent", label: "GST %", type: "number" },
];

interface Props {
  open: boolean;
  ids: string[];
  categories: string[];
  racks: string[];
  onClose: () => void;
  onDone: () => void;
}

// Only fields whose box is ticked are sent, so nothing else is touched.
export function BulkEditPartsDialog({ open, ids, categories, racks, onClose, onDone }: Props) {
  const { toast } = useToast();
  const [on, setOn] = useState<Partial<Record<FieldKey, boolean>>>({});
  const [vals, setVals] = useState<Partial<Record<FieldKey, string>>>({});
  const [stockOn, setStockOn] = useState(false);
  const [stockMode, setStockMode] = useState<"add" | "set">("add");
  const [stockVal, setStockVal] = useState("");
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setOn({});
    setVals({});
    setStockOn(false);
    setStockMode("add");
    setStockVal("");
  };

  const anything = Object.values(on).some(Boolean) || stockOn;

  const save = async () => {
    const changes: Record<string, string | number> = {};
    for (const f of FIELDS) {
      if (!on[f.key]) continue;
      const raw = (vals[f.key] ?? "").trim();
      if (f.type === "number") {
        if (raw === "" || !Number.isFinite(Number(raw))) {
          toast({ title: `Enter a number for ${f.label}`, variant: "destructive" });
          return;
        }
        changes[f.key] = Number(raw);
      } else {
        if ((f.key === "category" || f.key === "unit" || f.key === "location") && !raw) {
          toast({ title: `Choose a value for ${f.label}`, variant: "destructive" });
          return;
        }
        changes[f.key] = raw === "__none__" ? "" : raw;
      }
    }
    if (stockOn && (stockVal.trim() === "" || !Number.isFinite(Number(stockVal)))) {
      toast({ title: "Enter a number for stock", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const res = await sparePartsAPI.bulkUpdate(ids, {
        changes,
        stock: stockOn ? { mode: stockMode, value: Number(stockVal) } : undefined,
      });
      toast({ title: `Updated ${res.data.modified} of ${res.data.matched} parts`, description: "WooCommerce is updating in the background." });
      reset();
      onDone();
      onClose();
    } catch (e) {
      toast({ title: "Bulk update failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit {ids.length} selected part{ids.length === 1 ? "" : "s"}</DialogTitle>
          <DialogDescription>Tick a field to change it. Unticked fields stay as they are.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {FIELDS.map((f) => (
            <div key={f.key} className="grid grid-cols-[150px_1fr] items-center gap-3">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  className="rounded"
                  checked={!!on[f.key]}
                  onChange={(e) => setOn((s) => ({ ...s, [f.key]: e.target.checked }))}
                />
                {f.label}
              </label>
              {f.type === "category" || f.type === "unit" || f.type === "rack" ? (
                <Select
                  disabled={!on[f.key]}
                  value={vals[f.key] ?? ""}
                  onValueChange={(v) => setVals((s) => ({ ...s, [f.key]: v }))}
                >
                  <SelectTrigger><SelectValue placeholder="Choose…" /></SelectTrigger>
                  <SelectContent>
                    {f.type === "rack" && <SelectItem value="__none__">No rack (clear)</SelectItem>}
                    {(f.type === "unit" ? UNITS : f.type === "rack" ? racks : categories).map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  disabled={!on[f.key]}
                  type={f.type === "number" ? "number" : "text"}
                  min={f.type === "number" ? 0 : undefined}
                  placeholder={f.key === "location" || f.key === "supplier" ? "Leave blank to clear" : ""}
                  value={vals[f.key] ?? ""}
                  onChange={(e) => setVals((s) => ({ ...s, [f.key]: e.target.value }))}
                />
              )}
            </div>
          ))}

          <div className="border-t border-border pt-3 grid grid-cols-[150px_1fr] items-start gap-3">
            <label className="flex items-center gap-2 text-sm font-medium pt-2">
              <input type="checkbox" className="rounded" checked={stockOn} onChange={(e) => setStockOn(e.target.checked)} />
              Stock quantity
            </label>
            <div className="space-y-1.5">
              <div className="flex gap-2">
                <Select disabled={!stockOn} value={stockMode} onValueChange={(v) => setStockMode(v as "add" | "set")}>
                  <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="add">Add / subtract</SelectItem>
                    <SelectItem value="set">Set to</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  disabled={!stockOn}
                  type="number"
                  placeholder={stockMode === "add" ? "e.g. 10 or -5" : "e.g. 50"}
                  value={stockVal}
                  onChange={(e) => setStockVal(e.target.value)}
                />
              </div>
              <Label className="text-xs text-muted-foreground font-normal">Stock never goes below 0.</Label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={save} disabled={!anything || saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Apply to {ids.length}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
