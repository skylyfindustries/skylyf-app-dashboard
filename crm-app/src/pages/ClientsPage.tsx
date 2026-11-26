import { AppLayout } from "@/components/layout/AppLayout";
import { Plus, Search, Loader2, Pencil, Trash2, Phone, MapPin, Building2, Cog, X, User, Mail, Globe, Hash, FileText, Briefcase, Map, PhoneCall, CreditCard, Home, Calendar, Tag, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useCallback, useMemo } from "react";
import { clientsAPI, machinesAPI } from "@/services/api";
import { useToast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface Client {
  _id: string;
  name: string;
  contactPerson: string;
  designation: string;
  phone: string;
  alternatePhone: string;
  email: string;
  website: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  gstin: string;
  pan: string;
  notes: string;
  machinesTotal: number;
  machinesOpen: number;
}

interface ClientMachine {
  _id: string;
  machineNo: string;
  name: string;
  type: string;
  status: string;
  client?: string | null;
  clientName: string;
  progress?: number;
  targetDate: string | null;
  overdue?: boolean;
  daysLeft?: number | null;
}

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "No due date";

const empty = { name: "", contactPerson: "", designation: "", phone: "", alternatePhone: "", email: "", website: "", address: "", city: "", state: "", pincode: "", gstin: "", pan: "", notes: "" };

function Field({ icon: Icon, label, className, children }: { icon: LucideIcon; label: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <Label className="mb-1.5 flex items-center gap-1.5 text-muted-foreground">
        <Icon className="w-3.5 h-3.5" /> {label}
      </Label>
      {children}
    </div>
  );
}

export default function ClientsPage() {
  const { toast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  // machines of the client being viewed
  const [viewing, setViewing] = useState<Client | null>(null);
  const [allMachines, setAllMachines] = useState<ClientMachine[]>([]);
  const [assignId, setAssignId] = useState("");
  const [adding, setAdding] = useState(false);
  const [nm, setNm] = useState({ name: "", type: "", targetDate: "" });

  const loadMachines = useCallback(async () => {
    setAllMachines((await machinesAPI.getAll()).data);
  }, []);

  const openClient = (c: Client) => {
    setViewing(c);
    setAssignId("");
    setAdding(false);
    setNm({ name: "", type: "", targetDate: "" });
    loadMachines().catch((e) => toast({ title: "Failed to load machines", description: (e as Error).message, variant: "destructive" }));
  };

  const setMachineClient = async (machineId: string, clientId: string | null) => {
    try {
      await machinesAPI.update(machineId, { client: clientId });
      await loadMachines();
      load();
    } catch (e) {
      toast({ title: "Could not update", description: (e as Error).message, variant: "destructive" });
    }
  };

  const createForClient = async () => {
    if (!viewing || !nm.name.trim()) return;
    try {
      await machinesAPI.create({ name: nm.name.trim(), type: nm.type, targetDate: nm.targetDate || null, client: viewing._id });
      setNm({ name: "", type: "", targetDate: "" });
      setAdding(false);
      await loadMachines();
      load();
    } catch (e) {
      toast({ title: "Could not add machine", description: (e as Error).message, variant: "destructive" });
    }
  };

  const load = useCallback(async () => {
    try {
      setClients((await clientsAPI.getAll()).data);
    } catch (e) {
      toast({ title: "Failed to load clients", description: (e as Error).message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const openForm = (c?: Client) => {
    setEditingId(c?._id ?? null);
    setForm(c ? Object.fromEntries(Object.keys(empty).map((k) => [k, (c as unknown as Record<string, string>)[k] ?? ""])) as typeof empty : empty);
    setOpen(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      if (editingId) await clientsAPI.update(editingId, form);
      else await clientsAPI.create(form);
      toast({ title: editingId ? "Client updated" : "Client added" });
      setOpen(false);
      load();
    } catch (e) {
      toast({ title: "Could not save", description: (e as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (c: Client) => {
    if (!confirm(`Delete ${c.name}?`)) return;
    try {
      await clientsAPI.delete(c._id);
      load();
    } catch (e) {
      toast({ title: "Cannot delete", description: (e as Error).message, variant: "destructive" });
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? clients.filter((c) => [c.name, c.contactPerson, c.city, c.phone].some((v) => v?.toLowerCase().includes(q))) : clients;
  }, [clients, search]);

  const f = (k: keyof typeof empty, placeholder = "") => ({ placeholder, value: form[k], onChange: (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value }) });

  return (
    <AppLayout title="Clients">
      <div className="flex flex-wrap gap-3 items-center justify-between mb-5">
        <div className="flex items-center gap-2 bg-card rounded-lg border border-border px-3 py-2 w-72">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, contact, city" className="bg-transparent outline-none text-sm w-full" />
        </div>
        <Button onClick={() => openForm()}>
          <Plus className="w-4 h-4 mr-2" /> Add Client
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-12 text-center text-muted-foreground">
          <Building2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
          No clients yet
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left text-xs text-muted-foreground">
              <tr>
                <th className="p-3 font-normal">Client</th>
                <th className="p-3 font-normal">Contact</th>
                <th className="p-3 font-normal">City</th>
                <th className="p-3 font-normal text-right">Open jobs</th>
                <th className="p-3 font-normal text-right">All jobs</th>
                <th className="p-3 w-28" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((c) => (
                <tr key={c._id} className="hover:bg-muted/50">
                  <td className="p-3">
                    <button onClick={() => openClient(c)} className="font-medium text-left hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded">
                      {c.name}
                    </button>
                    {c.gstin && <div className="text-xs font-mono text-muted-foreground">{c.gstin}</div>}
                  </td>
                  <td className="p-3">
                    <div>{c.contactPerson || "–"}</div>
                    {c.phone && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Phone className="w-3 h-3" /> {c.phone}
                      </div>
                    )}
                  </td>
                  <td className="p-3">
                    {c.city ? (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-muted-foreground" /> {c.city}
                      </span>
                    ) : (
                      "–"
                    )}
                  </td>
                  <td className="p-3 text-right tabular-nums">
                    {c.machinesOpen}
                  </td>
                  <td className="p-3 text-right tabular-nums">{c.machinesTotal}</td>
                  <td className="p-3">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openClient(c)} aria-label="Machines">
                        <Cog className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => openForm(c)} aria-label="Edit client">
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => remove(c)} aria-label="Delete client">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          {viewing && (
            <>
              <DialogHeader>
                <DialogTitle className="font-medium">{viewing.name}</DialogTitle>
                <p className="text-sm text-muted-foreground">
                  {[viewing.contactPerson, viewing.designation].filter(Boolean).join(", ") || "No contact details yet"}
                </p>
                <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                  {([
                    [Phone, viewing.phone], [PhoneCall, viewing.alternatePhone], [Mail, viewing.email], [Globe, viewing.website],
                    [MapPin, [viewing.address, viewing.city, viewing.state, viewing.pincode].filter(Boolean).join(", ")],
                    [FileText, viewing.gstin && `GSTIN ${viewing.gstin}`], [CreditCard, viewing.pan && `PAN ${viewing.pan}`], [FileText, viewing.notes],
                  ] as [LucideIcon, string][]).filter(([, v]) => v).map(([Icon, v], i) => (
                    <div key={i} className="flex items-start gap-2 min-w-0">
                      <Icon className="w-3.5 h-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                      <span className="break-words min-w-0">{v}</span>
                    </div>
                  ))}
                </dl>
              </DialogHeader>

              <div>
                <h3 className="text-sm font-medium mb-2">Machines for this client</h3>
                {(() => {
                  const mine = allMachines.filter((m) => String(m.client) === viewing._id);
                  if (!mine.length) return <p className="text-sm text-muted-foreground">No machines assigned yet</p>;
                  return (
                    <ul className="divide-y divide-border rounded-md border border-border">
                      {mine.map((m) => (
                        <li key={m._id} className="flex items-center gap-3 p-3 text-sm">
                          <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">{m.machineNo}</span>
                          <div className="min-w-0 flex-1">
                            <div className="font-medium truncate">{m.name}</div>
                            <div className={cn("text-xs tabular-nums", m.overdue ? "text-destructive" : "text-muted-foreground")}>
                              {m.status} · {m.progress ?? 0}% · {m.overdue ? `Overdue by ${Math.abs(m.daysLeft ?? 0)} d` : fmtDate(m.targetDate)}
                            </div>
                          </div>
                          <button
                            onClick={() => setMachineClient(m._id, null)}
                            className="text-muted-foreground hover:text-foreground"
                            aria-label={`Remove ${m.name} from this client`}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  );
                })()}
              </div>

              <div className="space-y-3">
                <div className="flex gap-2">
                  <select
                    value={assignId}
                    onChange={(e) => setAssignId(e.target.value)}
                    className="h-10 flex-1 min-w-0 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="">Select an existing machine</option>
                    {allMachines
                      .filter((m) => !m.client)
                      .map((m) => (
                        <option key={m._id} value={m._id}>
                          {m.machineNo} · {m.name}
                        </option>
                      ))}
                  </select>
                  <Button
                    variant="outline"
                    disabled={!assignId}
                    onClick={async () => {
                      await setMachineClient(assignId, viewing._id);
                      setAssignId("");
                    }}
                  >
                    Assign
                  </Button>
                  <Button onClick={() => setAdding((a) => !a)}>
                    <Plus className="w-4 h-4 mr-2" /> New machine
                  </Button>
                </div>

                {adding && (
                  <div className="grid grid-cols-2 gap-x-4 gap-y-4 rounded-md border border-border p-3">
                    <div className="col-span-2">
                      <Label className="mb-1.5 flex items-center gap-1.5 text-muted-foreground"><Cog className="w-3.5 h-3.5" /> Machine name *</Label>
                      <Input autoFocus placeholder="e.g. Pouch making machine" value={nm.name} onChange={(e) => setNm({ ...nm, name: e.target.value })} />
                    </div>
                    <div>
                      <Label className="mb-1.5 flex items-center gap-1.5 text-muted-foreground"><Tag className="w-3.5 h-3.5" /> Type / model</Label>
                      <Input placeholder="e.g. PM-450" value={nm.type} onChange={(e) => setNm({ ...nm, type: e.target.value })} />
                    </div>
                    <div>
                      <Label className="mb-1.5 flex items-center gap-1.5 text-muted-foreground"><Calendar className="w-3.5 h-3.5" /> Due date</Label>
                      <Input type="date" value={nm.targetDate} onChange={(e) => setNm({ ...nm, targetDate: e.target.value })} />
                    </div>
                    <div className="col-span-2 flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setAdding(false)}>Cancel</Button>
                      <Button onClick={createForClient} disabled={!nm.name.trim()}>Create machine</Button>
                    </div>
                    <p className="col-span-2 text-xs text-muted-foreground">
                      Stages, order date and the parts plan can be filled in on the Machines page
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[95vw] max-w-4xl max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-medium">{editingId ? "Edit client" : "Add client"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-x-4 gap-y-4">
            <Field icon={Building2} label="Client name *" className="col-span-2"><Input {...f("name", "e.g. Sharma Packaging Pvt Ltd")} /></Field>
            <Field icon={User} label="Contact person"><Input {...f("contactPerson", "e.g. Rajesh Sharma")} /></Field>
            <Field icon={Briefcase} label="Designation"><Input {...f("designation", "e.g. Purchase Manager")} /></Field>
            <Field icon={Phone} label="Phone"><Input type="tel" {...f("phone", "+91 98765 43210")} /></Field>
            <Field icon={PhoneCall} label="Alternate phone"><Input type="tel" {...f("alternatePhone", "+91 91234 56789")} /></Field>
            <Field icon={Mail} label="Email"><Input type="email" {...f("email", "name@company.com")} /></Field>
            <Field icon={Globe} label="Website"><Input {...f("website", "www.company.com")} /></Field>
            <Field icon={Home} label="Address" className="col-span-2"><Input {...f("address", "Plot no., street, area")} /></Field>
            <Field icon={MapPin} label="City"><Input {...f("city", "e.g. Ahmedabad")} /></Field>
            <Field icon={Map} label="State"><Input {...f("state", "e.g. Gujarat")} /></Field>
            <Field icon={Hash} label="Pincode"><Input inputMode="numeric" maxLength={6} {...f("pincode", "380001")} /></Field>
            <Field icon={FileText} label="GSTIN"><Input maxLength={15} {...f("gstin", "24ABCDE1234F1Z5")} /></Field>
            <Field icon={CreditCard} label="PAN"><Input maxLength={10} {...f("pan", "ABCDE1234F")} /></Field>
            <Field icon={FileText} label="Notes" className="col-span-2"><Input {...f("notes", "Anything useful about this client")} /></Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving || !form.name.trim()}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
