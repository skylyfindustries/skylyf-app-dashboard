import { useState } from "react";
import { CheckCircle2, Circle, ShieldCheck, XCircle } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { machinesAPI } from "@/services/api";
import { cn } from "@/lib/utils";
import { MANAGER_ROLES } from "./StagesPanel";

export interface QualityCheck {
  _id: string;
  title: string;
  result: "pending" | "pass" | "fail";
  note?: string;
  byName?: string;
  at?: string | null;
}

// Final inspection. Every check must pass before the machine can be marked Ready or Delivered.
export function QualityPanel({ machineId, checks, onChanged }: { machineId: string; checks: QualityCheck[]; onChanged: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const canInspect = !!user && (MANAGER_ROLES.includes(user.role) || user.role === "quality_inspector");
  const isManager = !!user && MANAGER_ROLES.includes(user.role);
  const [failing, setFailing] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const record = async (c: QualityCheck, result: string, why = "") => {
    try {
      await machinesAPI.setQualityCheck(machineId, c._id, { result, note: why });
      setFailing(null);
      setNote("");
      onChanged();
    } catch (e) {
      toast({ title: "Could not save", description: (e as Error).message, variant: "destructive" });
    }
  };

  const seed = async () => {
    try {
      await machinesAPI.seedQualityChecks(machineId);
      onChanged();
    } catch (e) {
      toast({ title: "Could not add checks", description: (e as Error).message, variant: "destructive" });
    }
  };

  const passed = checks.filter((c) => c.result === "pass").length;

  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="flex items-center gap-1.5 text-sm font-medium">
          <ShieldCheck className="w-4 h-4 text-muted-foreground" /> Quality inspection
        </h3>
        {checks.length > 0 && (
          <span className="text-xs text-muted-foreground tabular-nums">
            {passed}/{checks.length} passed
          </span>
        )}
      </div>
      {checks.length === 0 ? (
        <div className="flex items-center justify-between gap-3 rounded-md border border-border p-3 text-sm text-muted-foreground">
          No inspection checklist on this machine
          {isManager && (
            <Button size="sm" variant="outline" onClick={seed}>
              Add standard checks
            </Button>
          )}
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-md border border-border">
          {checks.map((c) => (
            <li key={c._id} className="p-3 text-sm">
              <div className="flex flex-wrap items-center gap-3">
                {c.result === "pass" ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" aria-label="Passed" />
                ) : c.result === "fail" ? (
                  <XCircle className="w-4 h-4 text-red-700" aria-label="Failed" />
                ) : (
                  <Circle className="w-4 h-4 text-muted-foreground" aria-label="Pending" />
                )}
                <div className="min-w-0 flex-1">
                  <div className={cn(c.result === "fail" && "text-red-700")}>{c.title}</div>
                  {c.at && (
                    <div className="text-xs text-muted-foreground">
                      {c.byName} · {format(new Date(c.at), "d MMM, h:mm a")}
                      {c.note ? ` · ${c.note}` : ""}
                    </div>
                  )}
                </div>
                {canInspect && failing !== c._id && (
                  <div className="flex gap-1.5">
                    <Button size="sm" variant="outline" disabled={c.result === "pass"} onClick={() => record(c, "pass")}>
                      Pass
                    </Button>
                    <Button size="sm" variant="outline" disabled={c.result === "fail"} onClick={() => setFailing(c._id)}>
                      Fail
                    </Button>
                  </div>
                )}
              </div>
              {failing === c._id && (
                <div className="mt-2 flex gap-2">
                  <Input autoFocus placeholder="What failed? e.g. Motor overheats at load" value={note} onChange={(e) => setNote(e.target.value)} />
                  <Button size="sm" disabled={!note.trim()} onClick={() => record(c, "fail", note)}>
                    Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setFailing(null)}>
                    Cancel
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
