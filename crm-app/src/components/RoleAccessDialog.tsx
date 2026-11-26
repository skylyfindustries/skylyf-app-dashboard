import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { roleLabels, type UserRole } from "@/types/crm";
import { usersAPI } from "@/services/api";
import { cn } from "@/lib/utils";
import type { PermInfo } from "@/config/permissions";

// Pick a role, then tick the modules and features everyone with that role may use.
export function RoleAccessDialog({
  open, onOpenChange, info, onSaved,
}: { open: boolean; onOpenChange: (o: boolean) => void; info: PermInfo; onSaved: () => void }) {
  const { toast } = useToast();
  const roles = info.roles;
  const [role, setRole] = useState<string>("");
  const [draft, setDraft] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const cur = roles.find((r) => r.role === role);

  useEffect(() => {
    if (open && !role && roles[0]) setRole(roles[0].role);
  }, [open, role, roles]);
  useEffect(() => {
    if (cur) setDraft(cur.permissions);
  }, [cur?.role, cur?.permissions.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async (permissions: string[] | null) => {
    setSaving(true);
    try {
      await usersAPI.setRolePermissions(role, permissions);
      toast({ title: permissions ? "Role access saved" : "Role reset to defaults" });
      onSaved();
    } catch (e: any) {
      toast({ title: "Couldn't save", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };
  const same = cur && [...cur.permissions].sort().join() === [...draft].sort().join();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Role access</DialogTitle>
          <DialogDescription>
            Choose what everyone with a role can use. A user's own custom access (in their Edit form) overrides this. Admins always have full access.
          </DialogDescription>
        </DialogHeader>
        {roles.length === 0 ? (
          <p className="text-sm text-muted-foreground">Role list could not be loaded. Restart the backend and refresh.</p>
        ) : (
          <div className="grid sm:grid-cols-[170px_1fr] gap-4">
            <div className="flex sm:flex-col gap-1 overflow-x-auto">
              {roles.map((r) => (
                <button
                  key={r.role}
                  onClick={() => setRole(r.role)}
                  className={cn(
                    "text-left text-sm rounded-md px-3 py-2 whitespace-nowrap",
                    role === r.role ? "bg-muted font-medium" : "hover:bg-muted/60 text-muted-foreground",
                  )}
                >
                  {roleLabels[r.role as UserRole] || r.role}
                  {r.customized && <span className="ml-1.5 text-[10px] text-primary">edited</span>}
                </button>
              ))}
            </div>
            <div className="space-y-4">
              {info.catalog.map((m) => {
                const keys = m.features.map((f) => f.key);
                const on = keys.filter((k) => draft.includes(k)).length;
                return (
                  <div key={m.module} className="rounded-md border border-border p-3">
                    <label className="flex items-center gap-2 text-sm font-medium mb-2">
                      <Checkbox
                        checked={on === keys.length ? true : on ? "indeterminate" : false}
                        onCheckedChange={(v) =>
                          setDraft(v ? [...new Set([...draft, ...keys])] : draft.filter((k) => !keys.includes(k)))
                        }
                      />
                      {m.label}
                    </label>
                    <div className="grid gap-1.5 pl-6">
                      {m.features.map((f) => (
                        <label key={f.key} className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={draft.includes(f.key)}
                            onCheckedChange={(v) => setDraft(v ? [...draft, f.key] : draft.filter((k) => k !== f.key))}
                          />
                          {f.label}
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
              <div className="flex justify-between gap-2">
                <Button variant="ghost" disabled={saving || !cur?.customized} onClick={() => save(null)}>
                  Reset to default
                </Button>
                <Button disabled={saving || !!same} onClick={() => save(draft)}>
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Save
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
