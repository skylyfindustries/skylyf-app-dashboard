import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { OrderLine } from "@/services/api";

export interface StockPart { _id: string; partName: string; unit?: string; unitPrice?: number; quantity?: number }

export const inr = (n: number) => `₹${(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
export const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—");
export const toInput = (d?: string | null) => (d ? d.slice(0, 10) : "");

export const totals = (lines: OrderLine[], key: "rate" | "price") => {
  let subtotal = 0;
  let tax = 0;
  for (const l of lines) {
    const amt = (Number(l.quantity) || 0) * (Number(l[key]) || 0);
    subtotal += amt;
    tax += (amt * (Number(l.gstRate) || 0)) / 100;
  }
  return { subtotal, tax, total: subtotal + tax };
};

const selectCls = "h-9 w-full min-w-0 rounded-md border border-input bg-background px-2 text-sm";

// Editable item rows shared by purchase and sales orders
export function OrderLines({ lines, onChange, parts, priceKey, machineLines, priceFor }: {
  lines: OrderLine[];
  onChange: (l: OrderLine[]) => void;
  parts: StockPart[];
  priceKey: "rate" | "price";
  machineLines?: boolean;
  // agreed rate for this item with the chosen party, from the price master
  priceFor?: (partId: string) => number | undefined;
}) {
  const set = (i: number, patch: Partial<OrderLine>) => onChange(lines.map((l, x) => (x === i ? { ...l, ...patch } : l)));
  const pick = (i: number, id: string) => {
    const p = parts.find((x) => x._id === id);
    set(i, p ? { part: p._id, description: p.partName, unit: p.unit || "pcs", [priceKey]: lines[i][priceKey] || priceFor?.(p._id) || p.unitPrice || 0 } : { part: null });
  };
  const t = totals(lines, priceKey);
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[1fr_72px_88px_64px_28px] gap-2 text-xs text-muted-foreground px-0.5">
        <span>Item</span><span>Qty</span><span>{priceKey === "rate" ? "Rate" : "Price"}</span><span>GST %</span><span />
      </div>
      {lines.map((l, i) => (
        <div key={i} className="space-y-1">
          <div className="grid grid-cols-[1fr_72px_88px_64px_28px] gap-2 items-center">
            {l.kind === "machine" ? (
              <Input className="h-9" placeholder="Machine / model" value={l.description} onChange={(e) => set(i, { description: e.target.value })} />
            ) : (
              <select className={selectCls} value={l.part || ""} onChange={(e) => pick(i, e.target.value)} aria-label="Stock item">
                <option value="">Choose stock item</option>
                {parts.map((p) => (
                  <option key={p._id} value={p._id}>{p.partName}</option>
                ))}
              </select>
            )}
            <Input className="h-9" type="number" min={1} value={l.quantity || ""} onChange={(e) => set(i, { quantity: Number(e.target.value) })} aria-label="Quantity" />
            <Input className="h-9" type="number" min={0} value={l[priceKey] ?? ""} onChange={(e) => set(i, { [priceKey]: Number(e.target.value) })} aria-label="Price" />
            <Input className="h-9" type="number" min={0} value={l.gstRate} onChange={(e) => set(i, { gstRate: Number(e.target.value) })} aria-label="GST percent" />
            <button type="button" onClick={() => onChange(lines.filter((_, x) => x !== i))} className="text-muted-foreground hover:text-destructive" aria-label="Remove item">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
      <div className="flex gap-2">
        <Button type="button" size="sm" variant="outline" onClick={() => onChange([...lines, { kind: "material", description: "", unit: "pcs", quantity: 1, [priceKey]: 0, gstRate: 18 }])}>
          <Plus className="w-4 h-4 mr-1" /> Stock item
        </Button>
        {machineLines && (
          <Button type="button" size="sm" variant="outline" onClick={() => onChange([...lines, { kind: "machine", description: "", unit: "pcs", quantity: 1, [priceKey]: 0, gstRate: 18 }])}>
            <Plus className="w-4 h-4 mr-1" /> Machine
          </Button>
        )}
      </div>
      <div className="text-sm text-right space-y-0.5 tabular-nums pt-1">
        <div className="text-muted-foreground">Subtotal {inr(t.subtotal)} · GST {inr(t.tax)}</div>
        <div className="font-medium">Total {inr(t.total)}</div>
      </div>
    </div>
  );
}

const TONE: Record<string, string> = {
  Open: "bg-muted-foreground/50", Draft: "bg-muted-foreground/50", Confirmed: "bg-primary/60", Partial: "bg-warning", "In Production": "bg-warning",
  Received: "bg-success", Dispatched: "bg-primary", Closed: "bg-success", Cancelled: "bg-destructive",
};
export function StatusDot({ status }: { status: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      <span className={`h-2 w-2 rounded-full ${TONE[status] || "bg-muted-foreground/50"}`} />
      {status}
    </span>
  );
}

export const selectClass = selectCls.replace("h-9", "h-10").replace("px-2", "px-3");
