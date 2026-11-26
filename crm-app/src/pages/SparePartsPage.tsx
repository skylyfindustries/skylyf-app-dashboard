import { AppLayout } from "@/components/layout/AppLayout";
import { cn } from "@/lib/utils";
import {
  Plus,
  Camera,
  Upload,
  Search,
  MoreHorizontal,
  Loader2,
  Pencil,
  Trash2,
  PackageSearch,
  FileText,
  ArrowUpDown,
  Download,
  CheckCircle2,
  X,
  ChevronDown,
  RefreshCw,
  FileSpreadsheet,
  ArrowUpFromLine,
  MapPin,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useCallback, useRef } from "react";
import { sparePartsAPI, settingsAPI, wooSyncAPI, racksAPI } from "@/services/api";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { generatePIPDF } from "@/lib/generatePIPDF";
import { printLabels } from "@/lib/printLabels";
import { PartLabel } from "@/components/PartLabel";

// Mock APIs for removed models
const performaInvoicesAPI = {
  getAll: async (...args: any[]) => ({ data: [] }), // eslint-disable-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
  update: async (...args: any[]) => ({ success: true }), // eslint-disable-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
  create: async (...args: any[]) => ({ success: true }), // eslint-disable-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
  delete: async (...args: any[]) => ({ success: true }), // eslint-disable-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
  receive: async (...args: any[]) => ({ success: true }), // eslint-disable-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
};

const clientsAPI = {
  getAll: async (...args: any[]) => ({ data: [] }), // eslint-disable-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface SparePart {
  _id: string;
  partName: string;
  partNumber: string;
  category: string;
  quantity: number;
  unit: string;
  reorderLevel: number;
  supplier: string;
  unitPrice: number;
  location: string;
  description: string;
  status: string;
  totalValue: number;
  barcode?: string;
  wooProductId?: number | null;
  wooSku?: string;
  wooLastSyncedAt?: string | null;
  wooImageUrl?: string;
  imageUrl?: string;
  wooCategories?: string[];
  wooTaxStatus?: string;
  wooTaxClass?: string;
  gstPercent?: number | null;
  createdAt?: string;
}

interface Client {
  _id: string;
  name: string;
  company: string;
  phone: string;
  email: string;
  address: string;
  gst?: string;
}

interface PIItem {
  partId?: string;
  partName: string;
  partNumber?: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
}

interface PerformaInvoice {
  _id: string;
  piNumber: string;
  clientId?: string;
  clientName: string;
  clientAddress: string;
  clientPhone: string;
  clientGST: string;
  items: PIItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  status: string;
  date: string;
  notes: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const FALLBACK_CATEGORIES = [
  "Electrical",
  "Mechanical",
  "Hydraulic",
  "Pneumatic",
  "General",
  "Consumable",
];
const UNITS = ["pcs", "kg", "m", "litre", "set", "box"];
const PI_STATUSES = ["Draft", "Sent", "Received", "Paid"];

const statusColors: Record<string, string> = {
  "In Stock": "bg-success/10 text-success",
  "Low Stock": "bg-warning/10 text-warning",
  "Out of Stock": "bg-destructive/10 text-destructive",
};

const piStatusColors: Record<string, string> = {
  Draft: "bg-muted text-muted-foreground",
  Sent: "bg-primary/10 text-primary",
  Received: "bg-success/10 text-success",
  Paid: "bg-primary/10 text-primary",
};

const catColors: Record<string, string> = {
  Electrical: "bg-warning/10 text-warning",
  Mechanical: "bg-primary/10 text-primary",
  Hydraulic: "bg-primary/10 text-primary",
  Pneumatic: "bg-primary/10 text-primary",
  General: "bg-muted text-muted-foreground",
  Consumable: "bg-warning/10 text-warning",
};

// ─── Default form states ───────────────────────────────────────────────────────

import { BulkImportDialog } from "@/components/BulkImportDialog";
import { RackManagerDialog } from "@/components/RackManagerDialog";
import { BulkEditPartsDialog } from "@/components/BulkEditPartsDialog";
import { photoUrl } from "@/services/api";

const imageSrc = (u: string) => (u.startsWith("/") ? photoUrl(u) : u);

const defaultPart = {
  partName: "",
  partNumber: "",
  category: "General",
  quantity: 0,
  unit: "pcs",
  reorderLevel: 5,
  supplier: "",
  unitPrice: 0,
  description: "",
  location: "",
  gstPercent: null as number | null,
};

const defaultPI = {
  clientName: "",
  clientAddress: "",
  clientPhone: "",
  clientGST: "",
  taxRate: 18,
  status: "Draft",
  date: new Date().toISOString().split("T")[0],
  notes: "",
};

// ─── Component ────────────────────────────────────────────────────────────────

// ─── PartPicker ───────────────────────────────────────────────────────────────
// Searchable dropdown that pulls from loaded inventory parts.
// Typing filters by name/number; clicking a result auto-fills all fields.
// User can also freely type a custom name not in inventory.

interface PartPickerProps {
  value: string;
  parts: SparePart[];
  onSelect: (part: SparePart) => void;
  onTyped: (name: string) => void;
}

function PartPicker({ value, parts, onSelect, onTyped }: PartPickerProps) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Keep query in sync when parent resets the row
  useEffect(() => {
    setQuery(value);
  }, [value]);

  const filtered =
    query.trim().length === 0
      ? parts.slice(0, 8)
      : parts
          .filter(
            (p) =>
              p.partName.toLowerCase().includes(query.toLowerCase()) ||
              (p.partNumber || "")
                .toLowerCase()
                .includes(query.toLowerCase()) ||
              (p.supplier || "").toLowerCase().includes(query.toLowerCase()),
          )
          .slice(0, 8);

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <input
          className="h-8 w-full rounded-md border border-input bg-background px-2 pr-6 text-xs outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground"
          placeholder="Search or type part name…"
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            onTyped(e.target.value);
            setOpen(true);
          }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
        />
        <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
      </div>

      {open && (
        <div className="absolute z-50 top-full left-0 mt-1 w-72 bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-xs text-muted-foreground">
              No inventory match — will save as custom
            </div>
          ) : (
            <ul className="max-h-52 overflow-y-auto">
              {filtered.map((p) => (
                <li
                  key={p._id}
                  className="px-3 py-2 hover:bg-muted cursor-pointer border-b border-border last:border-0"
                  onMouseDown={() => {
                    setQuery(p.partName);
                    onSelect(p);
                    setOpen(false);
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold text-foreground">
                        {p.partName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {p.partNumber ? `#${p.partNumber} · ` : ""}
                        {p.category}
                        {p.supplier ? ` · ${p.supplier}` : ""}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-medium">
                        ₹{p.unitPrice.toLocaleString()}
                      </p>
                      <p
                        className={cn(
                          "text-xs",
                          p.status === "In Stock"
                            ? "text-success"
                            : p.status === "Low Stock"
                              ? "text-warning"
                              : "text-destructive",
                        )}
                      >
                        {p.quantity} {p.unit}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

// ─── ClientPicker ─────────────────────────────────────────────────────────────

interface ClientPickerProps {
  value: string;
  onSelect: (c: Client) => void;
  onTyped: (name: string) => void;
}

function ClientPicker({ value, onSelect, onTyped }: ClientPickerProps) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<Client[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const t = setTimeout(() => {
      clientsAPI
        .getAll({ search: query, limit: "6" } as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .then((r) => setResults(r.data || []))
        .catch(() => setResults([]));
    }, 200);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <input
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground"
          placeholder="Search or type client name…"
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            onTyped(e.target.value);
            setOpen(true);
          }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
        />
        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-50 top-full left-0 mt-1 w-full min-w-[280px] bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
          <ul className="max-h-48 overflow-y-auto">
            {results.map((c) => (
              <li
                key={c._id}
                className="px-3 py-2 hover:bg-muted cursor-pointer border-b border-border last:border-0"
                onMouseDown={() => {
                  setQuery(c.name);
                  onSelect(c);
                  setOpen(false);
                }}
              >
                <p className="text-sm font-semibold text-foreground">
                  {c.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {c.company}
                  {c.phone ? ` · ${c.phone}` : ""}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function SparePartsPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tab, setTab] = useState<"inventory" | "invoices" | "ledger">(
    "inventory",
  );
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Inventory state
  const [parts, setParts] = useState<SparePart[]>([]);
  const [loadingParts, setLoadingParts] = useState(true);
  const [partModal, setPartModal] = useState(false);
  const [editingPartId, setEditingPartId] = useState<string | null>(null);
  const [partForm, setPartForm] = useState({ ...defaultPart });
  const [partImage, setPartImage] = useState<File | null>(null);
  const [partImagePreview, setPartImagePreview] = useState("");
  const [bulkOpen, setBulkOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [rackModal, setRackModal] = useState(false);
  const [racks, setRacks] = useState<string[]>([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [savingPart, setSavingPart] = useState(false);
  const [createdPart, setCreatedPart] = useState<SparePart | null>(null);

  // Stock adjust modal
  const [adjustModal, setAdjustModal] = useState(false);
  const [adjustTarget, setAdjustTarget] = useState<SparePart | null>(null);
  const [adjustQty, setAdjustQty] = useState(0);
  const [adjustReason, setAdjustReason] = useState("");
  const [savingAdjust, setSavingAdjust] = useState(false);

  // PI (Performa Invoice) state
  const [invoices, setInvoices] = useState<PerformaInvoice[]>([]);
  const [loadingPI, setLoadingPI] = useState(true);
  const [piModal, setPIModal] = useState(false);
  const [editingPIId, setEditingPIId] = useState<string | null>(null);
  const [piForm, setPIForm] = useState({ ...defaultPI });
  const [piItems, setPIItems] = useState<PIItem[]>([
    {
      partName: "",
      partNumber: "",
      quantity: 1,
      unit: "pcs",
      unitPrice: 0,
      totalPrice: 0,
    },
  ]);
  const [savingPI, setSavingPI] = useState(false);
  const [settings, setSettings] = useState<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const [generatingPDF, setGeneratingPDF] = useState<string | null>(null);

  // WooCommerce sync state
  const [syncing, setSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [wooCategories, setWooCategories] =
    useState<string[]>(FALLBACK_CATEGORIES);

  // Client Ledger state
  const [clients, setClients] = useState<Client[]>([]);
  const [ledgerClientId, setLedgerClientId] = useState<string>("");
  const [ledgerInvoices, setLedgerInvoices] = useState<PerformaInvoice[]>([]);
  const [loadingLedger, setLoadingLedger] = useState(false);

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchRacks = useCallback(async () => {
    try {
      const res = await racksAPI.getAll();
      setRacks(res.data.map((r) => r.code));
    } catch {
      /* the form still works with the current value */
    }
  }, []);
  useEffect(() => {
    fetchRacks();
  }, [fetchRacks]);

  const fetchParts = useCallback(async () => {
    try {
      setLoadingParts(true);
      const params: Record<string, string> = {};
      if (catFilter !== "all") params.category = catFilter;
      if (search) params.search = search;
      const res = await sparePartsAPI.getAll(params);
      let data = res.data || [];
      if (statusFilter !== "all")
        data = data.filter((p: SparePart) => p.status === statusFilter);
      setParts(data);
      setSelected((sel) => {
        const ids = new Set(data.map((p: SparePart) => p._id));
        return new Set([...sel].filter((id) => ids.has(id)));
      });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoadingParts(false);
    }
  }, [catFilter, statusFilter, search, toast]);

  const fetchInvoices = useCallback(async () => {
    try {
      setLoadingPI(true);
      const res = await performaInvoicesAPI.getAll();
      setInvoices(res.data || []);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoadingPI(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchParts();
  }, [fetchParts]);
  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);
  useEffect(() => {
    settingsAPI
      .get()
      .then((r) => setSettings(r.data))
      .catch(() => {});
    wooSyncAPI
      .status()
      .then((r) => setLastSyncedAt(r.data.lastSyncedAt))
      .catch(() => {});
    wooSyncAPI
      .getCategories()
      .then((r) => {
        if (r.data?.length) setWooCategories(r.data);
      })
      .catch(() => {});
    clientsAPI
      .getAll({ limit: "200" } as any) // eslint-disable-line @typescript-eslint/no-explicit-any
      .then((r) => setClients(r.data || []))
      .catch(() => {});
  }, []);

  // ── Client Ledger ─────────────────────────────────────────────────────────

  const fetchLedger = useCallback(async (clientId: string) => {
    if (!clientId) {
      setLedgerInvoices([]);
      return;
    }
    try {
      setLoadingLedger(true);
      const res = await performaInvoicesAPI.getAll({ clientId } as any) // eslint-disable-line @typescript-eslint/no-explicit-any;
      setLedgerInvoices(res.data || []);
    } catch {
      setLedgerInvoices([]);
    } finally {
      setLoadingLedger(false);
    }
  }, []);

  const handleLedgerClientChange = (id: string) => {
    setLedgerClientId(id);
    fetchLedger(id);
  };

  // ── WooCommerce Sync ───────────────────────────────────────────────────────

  const handleWooSync = async () => {
    try {
      setSyncing(true);
      const res = await wooSyncAPI.sync();
      const { added, updated, errors } = res.data;
      setLastSyncedAt(new Date().toISOString());
      toast({
        title: "WooCommerce Sync Complete",
        description: `${added} added · ${updated} updated${errors.length ? ` · ${errors.length} errors` : ""}`,
      });
      fetchParts();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      toast({
        title: "Sync Failed",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  // ── Inventory CRUD ─────────────────────────────────────────────────────────

  const openAddPart = () => {
    setPartForm({ ...defaultPart });
    setPartImage(null);
    setPartImagePreview("");
    setEditingPartId(null);
    setPartModal(true);
  };
  const openEditPart = (p: SparePart) => {
    setPartForm({
      partName: p.partName,
      partNumber: p.partNumber,
      category: p.category,
      quantity: p.quantity,
      unit: p.unit,
      reorderLevel: p.reorderLevel,
      supplier: p.supplier,
      unitPrice: p.unitPrice,
      description: p.description,
      location: p.location ?? "",
      gstPercent: p.gstPercent ?? null,
    });
    setPartImage(null);
    setPartImagePreview(p.imageUrl ? imageSrc(p.imageUrl) : p.wooImageUrl || "");
    setEditingPartId(p._id);
    setPartModal(true);
  };

  const handleSavePart = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingPart(true);
      let res;
      if (editingPartId) {
        res = await sparePartsAPI.update(editingPartId, partForm);
      } else {
        res = await sparePartsAPI.create(partForm);
        setCreatedPart(res.data);
      }
      let woo = res.woo;
      let photoError = "";
      if (partImage) {
        try {
          const up = await sparePartsAPI.uploadImage(res.data._id, partImage);
          woo = up.woo ?? woo;
        } catch (err) {
          photoError = (err as Error).message;
        }
      }
      const wooNote = !woo
        ? ""
        : woo.pushed
          ? woo.imageSkipped
            ? " Sent to WooCommerce, but the photo was kept here only (set PUBLIC_API_URL on the server so WooCommerce can fetch it)."
            : " Sent to WooCommerce."
          : ` Saved here, but WooCommerce said: ${woo.reason}`;
      toast({
        title: editingPartId ? "Part updated" : "Part added to inventory",
        description: (photoError ? `Photo failed: ${photoError}.` : "") + wooNote || undefined,
        variant: photoError || (woo && !woo.pushed) ? "destructive" : "default",
      });
      setPartModal(false);
      fetchParts();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSavingPart(false);
    }
  };

  const toggleOne = (id: string) =>
    setSelected((sel) => {
      const next = new Set(sel);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const allSelected = parts.length > 0 && parts.every((p) => selected.has(p._id));
  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(parts.map((p) => p._id)));

  const handleBulkDelete = async () => {
    const chosen = parts.filter((p) => selected.has(p._id));
    const linked = chosen.filter((p) => p.wooProductId).length;
    const msg =
      `Delete ${chosen.length} spare part${chosen.length === 1 ? "" : "s"}?` +
      (linked ? `\n\n${linked} linked WooCommerce product${linked === 1 ? "" : "s"} will be set to draft (hidden from the store).` : "") +
      "\n\nThis cannot be undone in the CRM.";
    if (!window.confirm(msg)) return;
    setBulkDeleting(true);
    try {
      const res = await sparePartsAPI.bulkDelete(chosen.map((p) => p._id));
      toast({ title: `Deleted ${res.data.deleted} parts` });
      setSelected(new Set());
      fetchParts();
    } catch (e) {
      toast({ title: "Bulk delete failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleDeletePart = async (id: string, isWooLinked?: boolean) => {
    const msg = isWooLinked
      ? "Delete this spare part? It will be set to DRAFT on your WooCommerce store (hidden, not permanently deleted)."
      : "Delete this spare part?";
    if (!window.confirm(msg)) return;
    try {
      await sparePartsAPI.delete(id);
      toast({ title: "Deleted" });
      fetchParts();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const openAdjust = (p: SparePart) => {
    setAdjustTarget(p);
    setAdjustQty(0);
    setAdjustReason("");
    setAdjustModal(true);
  };
  const handleAdjust = async () => {
    if (!adjustTarget || adjustQty === 0) return;
    try {
      setSavingAdjust(true);
      await sparePartsAPI.adjustStock(
        adjustTarget._id,
        adjustQty,
        adjustReason,
      );
      toast({ title: "Stock updated" });
      setAdjustModal(false);
      fetchParts();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSavingAdjust(false);
    }
  };

  // ── Performa Invoice CRUD ──────────────────────────────────────────────────

  const openAddPI = () => {
    setPIForm({ ...defaultPI, date: new Date().toISOString().split("T")[0] });
    setPIItems([
      {
        partName: "",
        partNumber: "",
        quantity: 1,
        unit: "pcs",
        unitPrice: 0,
        totalPrice: 0,
      },
    ]);
    setEditingPIId(null);
    setPIModal(true);
  };

  const openEditPI = (inv: PerformaInvoice) => {
    setPIForm({
      clientName: inv.clientName,
      clientAddress: inv.clientAddress,
      clientPhone: inv.clientPhone,
      clientGST: inv.clientGST,
      taxRate: inv.taxRate,
      status: inv.status,
      date: inv.date?.split("T")[0] || new Date().toISOString().split("T")[0],
      notes: inv.notes,
    });
    setPIItems(
      inv.items.length
        ? inv.items
        : [
            {
              partName: "",
              partNumber: "",
              quantity: 1,
              unit: "pcs",
              unitPrice: 0,
              totalPrice: 0,
            },
          ],
    );
    setEditingPIId(inv._id);
    setPIModal(true);
  };

  const updatePIItem = (idx: number, field: keyof PIItem, value: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    setPIItems((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      if (field === "quantity" || field === "unitPrice") {
        next[idx].totalPrice =
          Number(next[idx].quantity) * Number(next[idx].unitPrice);
      }
      return next;
    });
  };

  const addPIItem = () =>
    setPIItems((prev) => [
      ...prev,
      {
        partName: "",
        partNumber: "",
        quantity: 1,
        unit: "pcs",
        unitPrice: 0,
        totalPrice: 0,
      },
    ]);
  const removePIItem = (idx: number) =>
    setPIItems((prev) => prev.filter((_, i) => i !== idx));

  const selectPartForItem = (idx: number, part: SparePart) => {
    setPIItems((prev) => {
      const next = [...prev];
      next[idx] = {
        ...next[idx],
        partId: part._id,
        partName: part.partName,
        partNumber: part.partNumber || "",
        unit: part.unit,
        unitPrice: part.unitPrice,
        totalPrice: Number(next[idx].quantity) * part.unitPrice,
      };
      return next;
    });
  };

  const piSubtotal = piItems.reduce((s, i) => s + Number(i.totalPrice), 0);
  const piTax = piSubtotal * (Number(piForm.taxRate) / 100);
  const piTotal = piSubtotal + piTax;

  const handleSavePI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!piForm.clientName.trim()) {
      toast({ title: "Client name required", variant: "destructive" });
      return;
    }
    if (piItems.some((i) => !i.partName.trim())) {
      toast({ title: "All items need a name", variant: "destructive" });
      return;
    }
    try {
      setSavingPI(true);
      const payload = {
        ...piForm,
        items: piItems.map((i) => ({
          ...i,
          quantity: Number(i.quantity),
          unitPrice: Number(i.unitPrice),
          totalPrice: Number(i.quantity) * Number(i.unitPrice),
        })),
      };
      if (editingPIId) {
        await performaInvoicesAPI.update(editingPIId, payload);
      } else {
        await performaInvoicesAPI.create(payload);
      }
      toast({
        title: "Success",
        description: editingPIId
          ? "Invoice updated"
          : "Performa invoice created",
      });
      setPIModal(false);
      fetchInvoices();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSavingPI(false);
    }
  };

  const handleDeletePI = async (id: string) => {
    if (!window.confirm("Delete this performa invoice?")) return;
    try {
      await performaInvoicesAPI.delete(id);
      toast({ title: "Deleted" });
      fetchInvoices();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleReceive = async (id: string) => {
    if (
      !window.confirm(
        "Mark as Received? This will update inventory stock levels.",
      )
    )
      return;
    try {
      await performaInvoicesAPI.receive(id);
      toast({ title: "Received", description: "Stock levels updated" });
      fetchInvoices();
      fetchParts();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleDownloadPI = async (
    inv: PerformaInvoice,
    format: "POS" | "A4" = "POS",
  ) => {
    try {
      setGeneratingPDF(inv._id);
      await generatePIPDF(inv as any, settings, format); // eslint-disable-line @typescript-eslint/no-explicit-any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      toast({
        title: "PDF Error",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setGeneratingPDF(null);
    }
  };

  // ── Export ────────────────────────────────────────────────────────────────────

  const exportExcel = () => {
    const rows = parts.map((p) => ({
      "Part Name": p.partName,
      "Part Number": p.partNumber || "",
      Categories: p.wooCategories?.length
        ? p.wooCategories.join(", ")
        : p.category,
      Quantity: p.quantity,
      Unit: p.unit,
      "Reorder Level": p.reorderLevel,
      Supplier: p.supplier || "",
      "Unit Price (₹)": p.unitPrice,
      "Total Value (₹)": p.totalValue || 0,
      Status: p.status,
      "GST (%)": p.gstPercent != null ? `${p.gstPercent}%` : "—",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Spare Parts");
    XLSX.writeFile(
      wb,
      `spare-parts-${new Date().toISOString().split("T")[0]}.xlsx`,
    );
  };

  const exportPDF = () => {
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 14;
    let y = 14;

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Spare Parts Inventory", margin, y);
    y += 6;
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(120);
    doc.text(
      `Exported on ${new Date().toLocaleDateString("en-IN")}  ·  ${parts.length} parts`,
      margin,
      y,
    );
    doc.setTextColor(0);
    y += 6;

    const cols = [
      "Part Name",
      "Part #",
      "Category",
      "Qty",
      "Unit",
      "Reorder",
      "Supplier",
      "Unit Price",
      "Total Value",
      "Status",
    ];
    const colWidths = [48, 24, 24, 14, 12, 16, 36, 22, 24, 20];
    const rowH = 7;

    // Header
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, y, pageW - margin * 2, rowH, "F");
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    let x = margin + 2;
    cols.forEach((col, i) => {
      doc.text(col, x, y + 4.5);
      x += colWidths[i];
    });
    y += rowH;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    parts.forEach((p, idx) => {
      if (y + rowH > doc.internal.pageSize.getHeight() - 10) {
        doc.addPage();
        y = 14;
      }
      if (idx % 2 === 1) {
        doc.setFillColor(250, 250, 250);
        doc.rect(margin, y, pageW - margin * 2, rowH, "F");
      }
      const cells = [
        p.partName.slice(0, 28),
        p.partNumber || "—",
        p.category,
        String(p.quantity),
        p.unit,
        String(p.reorderLevel),
        (p.supplier || "—").slice(0, 22),
        `Rs ${(p.unitPrice || 0).toLocaleString()}`,
        `Rs ${(p.totalValue || 0).toLocaleString()}`,
        p.status,
      ];
      x = margin + 2;
      cells.forEach((cell, i) => {
        doc.text(cell, x, y + 4.5);
        x += colWidths[i];
      });
      y += rowH;
    });

    doc.save(`spare-parts-${new Date().toISOString().split("T")[0]}.pdf`);
  };

  // ─── Stat cards ──────────────────────────────────────────────────────────────

  const totalParts = parts.length;
  const lowStock = parts.filter((p) => p.status === "Low Stock").length;
  const outOfStock = parts.filter((p) => p.status === "Out of Stock").length;
  const totalValue = parts.reduce((s, p) => s + (p.totalValue || 0), 0);

  // Performa Invoice stats
  const totalInvoices = invoices.length;
  const draftInvoices = invoices.filter((inv) => inv.status === "Draft").length;
  const receivedInvoices = invoices.filter(
    (inv) => inv.status === "Received",
  ).length;
  const invoicesTotalValue = invoices.reduce(
    (s, inv) => s + (inv.total || 0),
    0,
  );

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <AppLayout title="Spare Parts Inventory">
      {/* Stat cards - Dynamic based on tab */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {(tab === "inventory"
          ? [
              {
                label: "Total Parts",
                value: totalParts,
                color: "text-primary",
              },
              { label: "Low Stock", value: lowStock, color: "text-warning" },
              {
                label: "Out of Stock",
                value: outOfStock,
                color: "text-destructive",
              },
              {
                label: "Inventory Value",
                value: `₹${totalValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`,
                color: "text-success",
              },
            ]
          : [
              {
                label: "Total Invoices",
                value: totalInvoices,
                color: "text-primary",
              },
              {
                label: "Draft",
                value: draftInvoices,
                color: "text-warning",
              },
              {
                label: "Received",
                value: receivedInvoices,
                color: "text-success",
              },
              {
                label: "Total Value",
                value: `₹${invoicesTotalValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`,
                color: "text-primary",
              },
            ]
        ).map((card) => (
          <div
            key={card.label}
            className="bg-card border border-border rounded-xl px-4 py-3"
          >
            <p className="text-xs text-muted-foreground">{card.label}</p>
            <p className={cn("text-xl font-semibold mt-1", card.color)}>
              {card.value}
            </p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-muted rounded-lg p-1 w-fit">
        {(
          [
            { key: "inventory", label: "Inventory" },
            { key: "invoices", label: "Purchase Invoice" },
            { key: "ledger", label: "Client Ledger" },
          ] as const
        ).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              "px-4 py-1.5 rounded-md text-sm font-medium transition-colors",
              tab === key
                ? "bg-card shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── INVENTORY TAB ── */}
      {tab === "inventory" && (
        <>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2 w-56">
                <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                <input
                  type="text"
                  placeholder="Search parts..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="bg-transparent text-sm outline-none w-full placeholder:text-muted-foreground"
                />
              </div>
              <Select value={catFilter} onValueChange={setCatFilter}>
                <SelectTrigger className="w-36 h-9 text-sm">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {wooCategories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32 h-9 text-sm">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="In Stock">In Stock</SelectItem>
                  <SelectItem value="Low Stock">Low Stock</SelectItem>
                  <SelectItem value="Out of Stock">Out of Stock</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              {lastSyncedAt && (
                <span className="text-xs text-muted-foreground hidden sm:block">
                  Synced{" "}
                  {new Date(lastSyncedAt).toLocaleTimeString("en-IN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              )}
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={handleWooSync}
                disabled={syncing}
              >
                <RefreshCw
                  className={cn("w-3.5 h-3.5", syncing && "animate-spin")}
                />
                {syncing ? "Syncing..." : "Sync WooCommerce"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={exportExcel}
                disabled={parts.length === 0}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={exportPDF}
                disabled={parts.length === 0}
              >
                <Download className="w-3.5 h-3.5" /> PDF
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setRackModal(true)}>
                <MapPin className="w-3.5 h-3.5" /> Racks
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setBulkOpen(true)}>
                <Upload className="w-3.5 h-3.5" /> Bulk import
              </Button>
              <Button size="sm" className="gap-1.5" onClick={openAddPart}>
                <Plus className="w-3.5 h-3.5" /> Add Part
              </Button>
            </div>
          </div>

          {selected.size > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-2.5">
              <p className="text-sm font-medium">
                {selected.size} selected
                <button className="ml-3 text-xs font-normal text-primary hover:underline" onClick={() => setSelected(new Set())}>
                  Clear
                </button>
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setBulkEditOpen(true)}>
                  Edit selected
                </Button>
                <Button size="sm" variant="destructive" onClick={handleBulkDelete} disabled={bulkDeleting}>
                  {bulkDeleting && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                  Delete selected
                </Button>
              </div>
            </div>
          )}

          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="w-9 px-3 py-3">
                      <input
                        type="checkbox"
                        className="rounded"
                        aria-label="Select all"
                        checked={allSelected}
                        onChange={toggleAll}
                      />
                    </th>
                    <th className="w-12 px-2 py-3"></th>
                    {[
                      "Name",
                      "SKU",
                      "Stock",
                      "Price",
                      "Categories",
                      "GST",
                      "Date",
                      "",
                    ].map((h) => (
                      <th
                        key={h}
                        className="text-left px-3 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loadingParts ? (
                    <tr>
                      <td colSpan={10} className="text-center py-12">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                        <p className="text-sm text-muted-foreground mt-2">
                          Loading inventory...
                        </p>
                      </td>
                    </tr>
                  ) : parts.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="text-center py-12">
                        <PackageSearch className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
                        <p className="text-sm text-muted-foreground">
                          No spare parts found.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    parts.map((part) => (
                      <tr
                        key={part._id}
                        className="group border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                      >
                        {/* Checkbox */}
                        <td className="px-3 py-3">
                          <input
                            type="checkbox"
                            className="rounded"
                            aria-label={`Select ${part.partName}`}
                            checked={selected.has(part._id)}
                            onChange={() => toggleOne(part._id)}
                          />
                        </td>
                        {/* Thumbnail */}
                        <td className="px-2 py-3">
                          {part.imageUrl || part.wooImageUrl ? (
                            <img
                              src={part.imageUrl ? imageSrc(part.imageUrl) : part.wooImageUrl}
                              alt={part.partName}
                              className="w-10 h-10 rounded object-cover border border-border bg-muted"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded border border-border bg-muted flex items-center justify-center">
                              <PackageSearch className="w-4 h-4 text-muted-foreground/30" />
                            </div>
                          )}
                        </td>
                        {/* Name */}
                        <td className="px-3 py-3 w-[160px] max-w-[160px]">
                          <p
                            className="font-semibold text-foreground leading-tight text-sm truncate max-w-[140px]"
                            title={part.partName}
                          >
                            {part.partName}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            ID: {part._id.slice(-6)}
                          </p>
                          {part.supplier && (
                            <p className="text-xs text-muted-foreground">
                              {part.supplier}
                            </p>
                          )}
                          <div className="hidden group-hover:flex items-center gap-2 mt-1">
                            <button
                              onClick={() => openEditPart(part)}
                              className="text-xs text-primary hover:underline font-medium"
                            >
                              Edit
                            </button>
                            <span className="text-muted-foreground">|</span>
                            <button
                              onClick={() => openAdjust(part)}
                              className="text-xs text-muted-foreground hover:text-foreground hover:underline"
                            >
                              Adjust Stock
                            </button>
                            <span className="text-muted-foreground">|</span>
                            <button
                              onClick={() =>
                                handleDeletePart(part._id, !!part.wooProductId)
                              }
                              className="text-xs text-destructive hover:underline"
                            >
                              Trash
                            </button>
                          </div>
                        </td>
                        {/* SKU */}
                        <td className="px-3 py-3 text-sm text-muted-foreground">
                          {part.partNumber || (
                            <span className="text-muted-foreground/40">—</span>
                          )}
                        </td>
                        {/* Stock */}
                        <td className="px-3 py-3">
                          <p className="text-sm font-semibold">
                            {part.quantity}{" "}
                            <span className="text-xs font-normal text-muted-foreground">
                              {part.unit}
                            </span>
                          </p>
                          <span
                            className={cn(
                              "text-xs font-medium px-1.5 py-0.5 rounded mt-0.5 inline-block",
                              statusColors[part.status] || "bg-muted",
                            )}
                          >
                            {part.status}
                          </span>
                          {part.status === "Low Stock" && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              reorder: {part.reorderLevel}
                            </p>
                          )}
                        </td>
                        {/* Price */}
                        <td className="px-3 py-3">
                          <p className="font-semibold text-sm">
                            ₹{(part.unitPrice || 0).toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            total: ₹{(part.totalValue || 0).toLocaleString()}
                          </p>
                        </td>
                        {/* Categories */}
                        <td className="px-3 py-3 max-w-[160px]">
                          {part.wooCategories &&
                          part.wooCategories.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {part.wooCategories.map((cat) => (
                                <span
                                  key={cat}
                                  className={cn(
                                    "text-xs font-medium px-1.5 py-0.5 rounded",
                                    catColors[cat] ||
                                      "bg-muted text-muted-foreground",
                                  )}
                                >
                                  {cat}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span
                              className={cn(
                                "text-xs font-medium px-2 py-0.5 rounded ",
                                catColors[part.category] ||
                                  "bg-muted text-muted-foreground",
                              )}
                            >
                              {part.category}
                            </span>
                          )}
                        </td>
                        {/* GST */}
                        <td className="px-3 py-3 whitespace-nowrap">
                          {part.wooTaxStatus === "taxable" &&
                          part.gstPercent != null &&
                          part.gstPercent > 0 ? (
                            <div className="flex flex-col gap-0.5">
                              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded bg-success/10 text-success w-fit">
                                <CheckCircle2 className="w-3 h-3" /> Taxable
                              </span>
                              <span className="text-xs text-muted-foreground font-medium px-1">
                                GST {part.gstPercent}%
                              </span>
                            </div>
                          ) : part.gstPercent === 0 ||
                            part.wooTaxStatus === "none" ? (
                            <span className="inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded bg-muted text-muted-foreground">
                              Exempt
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              —
                            </span>
                          )}
                        </td>
                        {/* Date */}
                        <td className="px-3 py-3 text-xs text-muted-foreground whitespace-nowrap">
                          {part.createdAt ? (
                            <>
                              <p className="font-medium text-foreground/70">
                                Published
                              </p>
                              <p>
                                {new Date(part.createdAt).toLocaleDateString(
                                  "en-GB",
                                )}
                              </p>
                            </>
                          ) : (
                            "—"
                          )}
                        </td>
                        {/* Actions */}
                        <td className="px-3 py-3">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="p-1.5 rounded hover:bg-muted transition-colors">
                                <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() =>
                                  navigate(`/rack-scan?code=${encodeURIComponent(part.barcode || part.partNumber)}&issue=1`)
                                }
                              >
                                <ArrowUpFromLine className="w-4 h-4 mr-2" /> Issue
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => openAdjust(part)}
                              >
                                <ArrowUpDown className="w-4 h-4 mr-2" /> Adjust
                                Stock
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => openEditPart(part)}
                              >
                                <Pencil className="w-4 h-4 mr-2" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                                onClick={() =>
                                  handleDeletePart(
                                    part._id,
                                    !!part.wooProductId,
                                  )
                                }
                              >
                                <Trash2 className="w-4 h-4 mr-2" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {parts.length > 0 && (
              <div className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
                {parts.length} item{parts.length !== 1 ? "s" : ""}
              </div>
            )}
          </div>
        </>
      )}

      {/* ── INVOICES TAB ── */}
      {tab === "invoices" && (
        <>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2 w-56">
              <Search className="w-4 h-4 text-muted-foreground shrink-0" />
              <input
                type="text"
                placeholder="Search invoices..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-transparent text-sm outline-none w-full placeholder:text-muted-foreground"
              />
            </div>
            <Button size="sm" className="gap-1.5" onClick={openAddPI}>
              <Plus className="w-3.5 h-3.5" /> Create Purchase Invoice
            </Button>
          </div>

          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {[
                      "Invoice #",
                      "Client",
                      "Items",
                      "Total",
                      "Date",
                      "Status",
                      "",
                    ].map((h) => (
                      <th
                        key={h}
                        className="text-left px-4 py-3 text-xs font-medium text-muted-foreground"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loadingPI ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                      </td>
                    </tr>
                  ) : invoices.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12">
                        <FileText className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
                        <p className="text-sm text-muted-foreground">
                          No Purchase Invoice yet.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    invoices
                      .filter(
                        (inv) =>
                          !search ||
                          inv.piNumber
                            .toLowerCase()
                            .includes(search.toLowerCase()) ||
                          inv.clientName
                            .toLowerCase()
                            .includes(search.toLowerCase()),
                      )
                      .map((inv) => (
                        <tr
                          key={inv._id}
                          className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors"
                        >
                          <td className="px-4 py-3 font-semibold text-primary">
                            {inv.piNumber}
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-medium">{inv.clientName}</p>
                            {inv.clientPhone && (
                              <p className="text-xs text-muted-foreground">
                                {inv.clientPhone}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {inv.items?.length || 0} items
                          </td>
                          <td className="px-4 py-3 font-medium">
                            ₹
                            {(inv.total || 0).toLocaleString("en-IN", {
                              maximumFractionDigits: 0,
                            })}
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">
                            {new Date(inv.date).toLocaleDateString("en-GB")}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={cn(
                                "text-xs font-medium px-2 py-1 rounded-md",
                                piStatusColors[inv.status] || "bg-muted",
                              )}
                            >
                              {inv.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="p-1 rounded hover:bg-muted transition-colors">
                                  <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => handleDownloadPI(inv, "POS")}
                                  disabled={generatingPDF === inv._id}
                                >
                                  {generatingPDF === inv._id ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  ) : (
                                    <Download className="w-4 h-4 mr-2" />
                                  )}
                                  Download POS Receipt
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleDownloadPI(inv, "A4")}
                                  disabled={generatingPDF === inv._id}
                                >
                                  {generatingPDF === inv._id ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  ) : (
                                    <Download className="w-4 h-4 mr-2" />
                                  )}
                                  Download A4 Invoice
                                </DropdownMenuItem>
                                {(inv.status === "Draft" ||
                                  inv.status === "Sent") && (
                                  <DropdownMenuItem
                                    onClick={() => handleReceive(inv._id)}
                                  >
                                    <CheckCircle2 className="w-4 h-4 mr-2" />{" "}
                                    Mark Received
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  onClick={() => openEditPI(inv)}
                                >
                                  <Pencil className="w-4 h-4 mr-2" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                                  onClick={() => handleDeletePI(inv._id)}
                                >
                                  <Trash2 className="w-4 h-4 mr-2" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── CLIENT LEDGER TAB ── */}
      {tab === "ledger" && (
        <>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-72">
              <Select
                value={ledgerClientId}
                onValueChange={handleLedgerClientChange}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select a client…" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c._id} value={c._id}>
                      {c.name} {c.company ? `— ${c.company}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {ledgerClientId && (
              <span className="text-xs text-muted-foreground">
                {ledgerInvoices.length} invoice
                {ledgerInvoices.length !== 1 ? "s" : ""}
                {ledgerInvoices.length > 0 &&
                  ` · Total ₹${ledgerInvoices.reduce((s, i) => s + (i.total || 0), 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`}
              </span>
            )}
          </div>

          {!ledgerClientId ? (
            <div className="bg-card rounded-xl border border-border py-16 text-center">
              <FileText className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">
                Select a client to view their ledger
              </p>
            </div>
          ) : loadingLedger ? (
            <div className="py-16 text-center">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
            </div>
          ) : ledgerInvoices.length === 0 ? (
            <div className="bg-card rounded-xl border border-border py-16 text-center">
              <FileText className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">
                No invoices found for this client
              </p>
            </div>
          ) : (
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      {[
                        "Invoice #",
                        "Items",
                        "Subtotal",
                        "Tax",
                        "Total",
                        "Date",
                        "Status",
                      ].map((h) => (
                        <th
                          key={h}
                          className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ledgerInvoices.map((inv) => (
                      <tr
                        key={inv._id}
                        className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                      >
                        <td className="px-4 py-3 font-semibold text-primary">
                          {inv.piNumber}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {inv.items?.length || 0} items
                        </td>
                        <td className="px-4 py-3">
                          ₹
                          {(inv.subtotal || 0).toLocaleString("en-IN", {
                            maximumFractionDigits: 0,
                          })}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          ₹
                          {(inv.taxAmount || 0).toLocaleString("en-IN", {
                            maximumFractionDigits: 0,
                          })}{" "}
                          ({inv.taxRate}%)
                        </td>
                        <td className="px-4 py-3 font-semibold text-foreground">
                          ₹
                          {(inv.total || 0).toLocaleString("en-IN", {
                            maximumFractionDigits: 0,
                          })}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">
                          {new Date(inv.date).toLocaleDateString("en-GB")}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "text-xs font-medium px-2 py-1 rounded-md",
                              piStatusColors[inv.status] || "bg-muted",
                            )}
                          >
                            {inv.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-muted/40 border-t border-border">
                      <td
                        className="px-4 py-3 font-semibold text-xs"
                        colSpan={4}
                      >
                        Grand Total
                      </td>
                      <td className="px-4 py-3 font-semibold text-primary">
                        ₹
                        {ledgerInvoices
                          .reduce((s, i) => s + (i.total || 0), 0)
                          .toLocaleString("en-IN", {
                            maximumFractionDigits: 0,
                          })}
                      </td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── ADD/EDIT SPARE PART MODAL ── */}
      <RackManagerDialog
        open={rackModal}
        onClose={() => setRackModal(false)}
        onChanged={() => {
          fetchRacks();
          fetchParts();
        }}
      />
      <BulkEditPartsDialog
        racks={racks}
        open={bulkEditOpen}
        ids={[...selected]}
        categories={wooCategories}
        onClose={() => setBulkEditOpen(false)}
        onDone={() => {
          setSelected(new Set());
          fetchParts();
        }}
      />
      <BulkImportDialog open={bulkOpen} onClose={() => setBulkOpen(false)} onDone={fetchParts} />

      <Dialog open={partModal} onOpenChange={setPartModal}>
        <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSavePart}>
            <DialogHeader>
              <DialogTitle>
                {editingPartId ? "Edit Spare Part" : "Add Spare Part"}
              </DialogTitle>
              <DialogDescription>
                {editingPartId
                  ? "Update part details."
                  : "Register a new spare part in the inventory."}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                <div className="grid gap-1.5">
                  <Label>
                    Part Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    placeholder="e.g. Drive belt 450mm" value={partForm.partName}
                    onChange={(e) =>
                      setPartForm((f) => ({ ...f, partName: e.target.value }))
                    }
                    required
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>Part Number / SKU</Label>
                  <Input
                    value={partForm.partNumber}
                    placeholder="e.g. SP-001"
                    onChange={(e) =>
                      setPartForm((f) => ({ ...f, partNumber: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                <div className="grid gap-1.5">
                  <Label>
                    Category <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={partForm.category}
                    onValueChange={(v) =>
                      setPartForm((f) => ({ ...f, category: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {wooCategories.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label>Unit</Label>
                  <Select
                    value={partForm.unit}
                    onValueChange={(v) =>
                      setPartForm((f) => ({ ...f, unit: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {UNITS.map((u) => (
                        <SelectItem key={u} value={u}>
                          {u}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="grid gap-1.5">
                  <Label>Quantity</Label>
                  <Input placeholder="e.g. 10"
                    type="number"
                    min="0"
                    value={partForm.quantity}
                    onChange={(e) =>
                      setPartForm((f) => ({
                        ...f,
                        quantity: Number(e.target.value),
                      }))
                    }
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>Reorder Level</Label>
                  <Input placeholder="e.g. 5"
                    type="number"
                    min="0"
                    value={partForm.reorderLevel}
                    onChange={(e) =>
                      setPartForm((f) => ({
                        ...f,
                        reorderLevel: Number(e.target.value),
                      }))
                    }
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>Unit Price (₹)</Label>
                  <Input placeholder="e.g. 1500"
                    type="number"
                    min="0"
                    step="any"
                    value={partForm.unitPrice}
                    onChange={(e) =>
                      setPartForm((f) => ({
                        ...f,
                        unitPrice: Number(e.target.value),
                      }))
                    }
                  />
                </div>
              </div>

              <div className="grid gap-1.5">
                <Label>Supplier</Label>
                <Input
                  value={partForm.supplier}
                  placeholder="Supplier / source name"
                  onChange={(e) =>
                    setPartForm((f) => ({ ...f, supplier: e.target.value }))
                  }
                />
              </div>

              <div className="grid gap-1.5">
                <Label>Description</Label>
                <Input placeholder="Short description"
                  value={partForm.description}
                  onChange={(e) =>
                    setPartForm((f) => ({ ...f, description: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label>Rack</Label>
                  <button
                    type="button"
                    className="text-xs text-primary hover:underline"
                    onClick={() => setRackModal(true)}
                  >
                    Manage racks
                  </button>
                </div>
                <Select
                  value={partForm.location || "__none__"}
                  onValueChange={(v) =>
                    setPartForm((f) => ({ ...f, location: v === "__none__" ? "" : v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select rack" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No rack</SelectItem>
                    {/* keep a legacy free-text location selectable until it's moved */}
                    {partForm.location &&
                      !racks.includes(partForm.location.trim().toUpperCase()) && (
                        <SelectItem value={partForm.location}>
                          {partForm.location} (not in rack list)
                        </SelectItem>
                      )}
                    {racks.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {racks.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No racks yet — use "Manage racks" to add some.
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <Label icon={Camera}>Photo</Label>
                <div className="flex items-center gap-3">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md border border-border bg-muted flex items-center justify-center">
                    {partImagePreview ? (
                      <img src={partImagePreview} alt="Part" className="h-full w-full object-cover" />
                    ) : (
                      <Camera className="h-5 w-5 text-muted-foreground/40" />
                    )}
                  </div>
                  <Input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => {
                      const f = e.target.files?.[0] ?? null;
                      setPartImage(f);
                      if (f) setPartImagePreview(URL.createObjectURL(f));
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">JPG, PNG or WebP, up to 5 MB. Also shown on your WooCommerce product</p>
              </div>
              <div className="space-y-1">
                <Label>GST Rate (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  placeholder="e.g. 18 (leave blank if unknown)"
                  value={partForm.gstPercent ?? ""}
                  onChange={(e) =>
                    setPartForm((f) => ({
                      ...f,
                      gstPercent:
                        e.target.value === ""
                          ? null
                          : parseFloat(e.target.value),
                    }))
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setPartModal(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={savingPart}>
                {savingPart && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {editingPartId ? "Update" : "Add Part"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── ADJUST STOCK MODAL ── */}
      <Dialog open={adjustModal} onOpenChange={setAdjustModal}>
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle>Adjust Stock</DialogTitle>
            <DialogDescription>{adjustTarget?.partName}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-3">
            <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2 text-sm">
              <span className="text-muted-foreground">Current:</span>
              <span className="font-semibold">
                {adjustTarget?.quantity} {adjustTarget?.unit}
              </span>
            </div>
            <div className="grid gap-1.5">
              <Label>Adjustment (use negative to reduce)</Label>
              <Input
                type="number"
                value={adjustQty}
                onChange={(e) => setAdjustQty(Number(e.target.value))}
                placeholder="e.g. +10 or -5"
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Reason</Label>
              <Input
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                placeholder="Purchase, usage, damage..."
              />
            </div>
            {adjustQty !== 0 && (
              <p className="text-sm text-muted-foreground">
                New quantity:{" "}
                <span className="font-semibold text-foreground">
                  {(adjustTarget?.quantity || 0) + adjustQty}{" "}
                  {adjustTarget?.unit}
                </span>
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAdjust}
              disabled={savingAdjust || adjustQty === 0}
            >
              {savingAdjust && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── CREATE / EDIT PI MODAL ── */}
      <Dialog open={piModal} onOpenChange={setPIModal}>
        <DialogContent className="sm:max-w-[680px] max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSavePI}>
            <DialogHeader>
              <DialogTitle>
                {editingPIId
                  ? "Edit Performa Invoice"
                  : "Create Purchase Invoice"}
              </DialogTitle>
              <DialogDescription>
                Fill client details and line items. Download as receipt-style
                PDF.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-5 py-4">
              {/* Client details */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2">
                  Client Details
                </p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                  <div className="grid gap-1.5 col-span-2">
                    <Label>
                      Client Name <span className="text-destructive">*</span>
                    </Label>
                    <ClientPicker
                      value={piForm.clientName}
                      onSelect={(c) =>
                        setPIForm((f) => ({
                          ...f,
                          clientName: c.name,
                          clientPhone: c.phone || f.clientPhone,
                          clientAddress: c.address || f.clientAddress,
                          clientGST: c.gst || f.clientGST,
                        }))
                      }
                      onTyped={(name) =>
                        setPIForm((f) => ({ ...f, clientName: name }))
                      }
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>Phone</Label>
                    <Input placeholder="+91 98765 43210"
                      value={piForm.clientPhone}
                      onChange={(e) =>
                        setPIForm((f) => ({
                          ...f,
                          clientPhone: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>GST Number</Label>
                    <Input placeholder="e.g. 24ABCDE1234F1Z5"
                      value={piForm.clientGST}
                      onChange={(e) =>
                        setPIForm((f) => ({ ...f, clientGST: e.target.value }))
                      }
                    />
                  </div>
                  <div className="grid gap-1.5 col-span-2">
                    <Label>Address</Label>
                    <Input placeholder="Street, area, city"
                      value={piForm.clientAddress}
                      onChange={(e) =>
                        setPIForm((f) => ({
                          ...f,
                          clientAddress: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
              </div>

              {/* PI meta */}
              <div className="grid grid-cols-3 gap-3">
                <div className="grid gap-1.5">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={piForm.date}
                    onChange={(e) =>
                      setPIForm((f) => ({ ...f, date: e.target.value }))
                    }
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>Tax Rate (%)</Label>
                  <Input placeholder="e.g. 18"
                    type="number"
                    min="0"
                    max="100"
                    value={piForm.taxRate}
                    onChange={(e) =>
                      setPIForm((f) => ({
                        ...f,
                        taxRate: Number(e.target.value),
                      }))
                    }
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>Status</Label>
                  <Select
                    value={piForm.status}
                    onValueChange={(v) =>
                      setPIForm((f) => ({ ...f, status: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PI_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-muted-foreground">
                    Line Items
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addPIItem}
                    className="h-7 text-xs"
                  >
                    <Plus className="w-3 h-3 mr-1" /> Add Item
                  </Button>
                </div>

                {/* Header */}
                <div className="grid grid-cols-12 gap-1 mb-1 text-xs text-muted-foreground font-medium px-1">
                  <div className="col-span-4">Part Name</div>
                  <div className="col-span-2">Part #</div>
                  <div className="col-span-1">Qty</div>
                  <div className="col-span-1">Unit</div>
                  <div className="col-span-2">Rate (₹)</div>
                  <div className="col-span-1">Total</div>
                  <div className="col-span-1"></div>
                </div>

                <div className="space-y-1.5">
                  {piItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-12 gap-1 items-center"
                    >
                      <div className="col-span-4">
                        <PartPicker
                          value={item.partName}
                          parts={parts}
                          onSelect={(p) => selectPartForItem(idx, p)}
                          onTyped={(name) =>
                            updatePIItem(idx, "partName", name)
                          }
                        />
                      </div>
                      <div className="col-span-2">
                        <Input
                          className="h-8 text-xs"
                          placeholder="#SKU"
                          value={item.partNumber || ""}
                          onChange={(e) =>
                            updatePIItem(idx, "partNumber", e.target.value)
                          }
                        />
                      </div>
                      <div className="col-span-1">
                        <Input
                          className="h-8 text-xs"
                          placeholder="Qty" type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) =>
                            updatePIItem(
                              idx,
                              "quantity",
                              Number(e.target.value),
                            )
                          }
                        />
                      </div>
                      <div className="col-span-1">
                        <Select
                          value={item.unit}
                          onValueChange={(v) => updatePIItem(idx, "unit", v)}
                        >
                          <SelectTrigger className="h-8 text-xs px-2">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {UNITS.map((u) => (
                              <SelectItem key={u} value={u} className="text-xs">
                                {u}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-2">
                        <Input
                          className="h-8 text-xs"
                          type="number"
                          min="0"
                          step="any"
                          value={item.unitPrice}
                          onChange={(e) =>
                            updatePIItem(
                              idx,
                              "unitPrice",
                              Number(e.target.value),
                            )
                          }
                        />
                      </div>
                      <div className="col-span-1 text-xs font-medium text-right pr-1">
                        ₹
                        {(item.totalPrice || 0).toLocaleString("en-IN", {
                          maximumFractionDigits: 0,
                        })}
                      </div>
                      <div className="col-span-1 flex justify-center">
                        {piItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removePIItem(idx)}
                            className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Totals summary */}
                <div className="mt-3 bg-muted rounded-lg px-4 py-3 flex flex-col items-end gap-1 text-sm">
                  <div className="flex gap-8">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium">
                      ₹
                      {piSubtotal.toLocaleString("en-IN", {
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                  <div className="flex gap-8">
                    <span className="text-muted-foreground">
                      GST ({piForm.taxRate}%)
                    </span>
                    <span className="font-medium">
                      ₹
                      {piTax.toLocaleString("en-IN", {
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                  <div className="flex gap-8 border-t border-border pt-1 mt-0.5">
                    <span className="font-semibold">Total</span>
                    <span className="font-semibold text-primary">
                      ₹
                      {piTotal.toLocaleString("en-IN", {
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid gap-1.5">
                <Label>Notes</Label>
                <Input
                  value={piForm.notes}
                  onChange={(e) =>
                    setPIForm((f) => ({ ...f, notes: e.target.value }))
                  }
                  placeholder="Any special instructions..."
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setPIModal(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={savingPI}>
                {savingPI && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingPIId ? "Update Invoice" : "Create Invoice"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={!!createdPart} onOpenChange={(o) => !o && setCreatedPart(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Part added</DialogTitle>
            <DialogDescription>Its rack label is ready to print as {createdPart?.barcode}</DialogDescription>
          </DialogHeader>
          <div className="flex justify-center py-2">
            {createdPart && (
              <PartLabel
                partName={createdPart.partName}
                partNumber={createdPart.partNumber}
                barcode={createdPart.barcode}
                location={createdPart.location}
              />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreatedPart(null)}>
              Done
            </Button>
            <Button onClick={() => createdPart && printLabels([createdPart])}>
              Print label
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
