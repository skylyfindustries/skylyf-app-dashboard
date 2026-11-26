import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { AlertCircle, CheckCircle2, Download, FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { BulkRowResult, sparePartsAPI } from "@/services/api";
import { cn } from "@/lib/utils";

// Template column -> field the API understands. Matching ignores case, spaces and symbols.
const COLUMNS: { header: string; key: string; sample: [string | number, string | number]; aliases?: string[] }[] = [
  { header: "Part Name *", key: "partName", sample: ["Drive belt 450mm", "Proximity sensor M12"], aliases: ["name", "part"] },
  { header: "SKU / Part Number", key: "partNumber", sample: ["BELT-450", "PROX-M12"], aliases: ["sku", "partno", "code"] },
  { header: "Category", key: "category", sample: ["Belts", "Sensors"] },
  { header: "Quantity", key: "quantity", sample: [25, 10], aliases: ["qty", "stock"] },
  { header: "Unit", key: "unit", sample: ["pcs", "pcs"] },
  { header: "Reorder Level", key: "reorderLevel", sample: [5, 3] },
  { header: "Unit Price", key: "unitPrice", sample: [450, 1200], aliases: ["price", "rate", "mrp"] },
  { header: "GST %", key: "gstPercent", sample: [18, 18], aliases: ["gst", "tax"] },
  { header: "Supplier", key: "supplier", sample: ["Sharma Traders", "Omron dealer"] },
  { header: "Rack Location", key: "location", sample: ["A-01-02", "B-03-01"], aliases: ["rack", "location"] },
  { header: "Description", key: "description", sample: ["Timing belt for pouch machine", "12mm inductive sensor"] },
  { header: "Image URL", key: "imageUrl", sample: ["", ""], aliases: ["image", "photo"] },
];

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

const columnFor = (header: string) =>
  COLUMNS.find((c) => [c.header, c.key, ...(c.aliases ?? [])].some((n) => norm(n) === norm(header)))?.key;

export function downloadTemplate() {
  const sheet = XLSX.utils.aoa_to_sheet([
    COLUMNS.map((c) => c.header),
    COLUMNS.map((c) => c.sample[0]),
    COLUMNS.map((c) => c.sample[1]),
  ]);
  sheet["!cols"] = COLUMNS.map((c) => ({ wch: Math.max(c.header.length + 2, 16) }));
  const help = XLSX.utils.aoa_to_sheet([
    ["How to fill this template"],
    ["1. Keep the header row. Delete the two sample rows and add your parts."],
    ["2. Part Name is the only required column."],
    ["3. A row whose SKU / Part Number already exists updates that part. Otherwise a new part is created."],
    ["4. Unit must be one of: pcs, kg, m, litre, set, box. Blank means pcs."],
    ["5. Category is created in WooCommerce if it does not exist. Blank means General."],
    ["6. Image URL is optional and must start with http:// or https://. You can also add photos later from the part form."],
    ["7. Up to 300 rows per file."],
  ]);
  help["!cols"] = [{ wch: 110 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, "Spare Parts");
  XLSX.utils.book_append_sheet(wb, help, "Instructions");
  XLSX.writeFile(wb, "spare-parts-import-template.xlsx");
}

type Row = Record<string, unknown>;

export function BulkImportDialog({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const { toast } = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [results, setResults] = useState<BulkRowResult[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [imported, setImported] = useState(false);
  const [pushToWoo, setPushToWoo] = useState(true);

  const reset = () => {
    setFileName("");
    setRows([]);
    setResults(null);
    setImported(false);
    if (input.current) input.current.value = "";
  };

  const close = () => {
    if (imported) onDone();
    reset();
    onClose();
  };

  const onFile = async (file?: File) => {
    if (!file) return;
    reset();
    setFileName(file.name);
    setBusy(true);
    try {
      const wb = XLSX.read(await file.arrayBuffer());
      const raw = XLSX.utils.sheet_to_json<Row>(wb.Sheets[wb.SheetNames[0]], { defval: "" });
      const parsed = raw
        .map((r) => {
          const out: Row = {};
          for (const [h, v] of Object.entries(r)) {
            const key = columnFor(h);
            if (key) out[key] = v;
          }
          return out;
        })
        .filter((r) => Object.values(r).some((v) => String(v).trim() !== ""));
      if (!parsed.length) throw new Error("No rows found. Use the template and keep its header row");
      if (!parsed.some((r) => "partName" in r)) throw new Error("The Part Name column is missing. Use the template");
      setRows(parsed);
      setResults((await sparePartsAPI.bulkImport(parsed, { dryRun: true })).data);
    } catch (e) {
      toast({ title: "Could not read file", description: (e as Error).message, variant: "destructive" });
      reset();
    } finally {
      setBusy(false);
    }
  };

  const runImport = async () => {
    setBusy(true);
    try {
      const res = await sparePartsAPI.bulkImport(rows, { pushToWoo });
      setResults(res.data);
      setImported(true);
      const ok = res.data.filter((r) => r.status === "created" || r.status === "updated").length;
      toast({ title: `${ok} of ${res.data.length} rows imported` });
    } catch (e) {
      toast({ title: "Import failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const bad = results?.filter((r) => r.status === "error").length ?? 0;
  const good = (results?.length ?? 0) - bad;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk import spare parts</DialogTitle>
          <DialogDescription>
            Download the template, fill it in, and upload it. Parts are saved here and sent to WooCommerce.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={downloadTemplate}>
            <Download className="w-4 h-4 mr-2" /> Download template
          </Button>
          <input
            ref={input}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
          <Button onClick={() => input.current?.click()} disabled={busy || imported}>
            <Upload className="w-4 h-4 mr-2" /> Choose file
          </Button>
          {fileName && (
            <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <FileSpreadsheet className="w-4 h-4" /> {fileName}
            </span>
          )}
        </div>

        {busy && !results && (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {results && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
              <span>
                {imported ? "Imported" : "Checked"} {results.length} rows:{" "}
                <span className="text-success">{good} {imported ? "saved" : "ready"}</span>
                {bad > 0 && <span className="text-destructive">, {bad} with problems</span>}
              </span>
              {!imported && (
                <label className="inline-flex items-center gap-2 text-muted-foreground">
                  <input type="checkbox" checked={pushToWoo} onChange={(e) => setPushToWoo(e.target.checked)} />
                  Send to WooCommerce
                </label>
              )}
            </div>
            <div className="max-h-[40vh] overflow-auto rounded-md border border-border">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="p-2 font-normal w-14">Row</th>
                    <th className="p-2 font-normal">Part</th>
                    <th className="p-2 font-normal">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {results.map((r) => (
                    <tr key={r.row}>
                      <td className="p-2 tabular-nums text-muted-foreground">{r.row}</td>
                      <td className="p-2">{r.partName || "—"}</td>
                      <td className={cn("p-2", r.status === "error" ? "text-destructive" : r.woo === "failed" ? "text-warning" : "")}>
                        <span className="inline-flex items-center gap-1.5">
                          {r.status === "error" ? <AlertCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5 text-success" />}
                          {{ create: "Will add", update: "Will update", created: "Added", updated: "Updated", error: "Problem" }[r.status]}
                          {r.woo === "pushed" && " · in WooCommerce"}
                          {r.message && <span className="text-muted-foreground"> — {r.message}</span>}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={close}>
            {imported ? "Done" : "Cancel"}
          </Button>
          {results && !imported && (
            <Button onClick={runImport} disabled={busy || good === 0}>
              {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Import {good} {good === 1 ? "row" : "rows"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
