import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

interface ConfirmOptions {
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
}
interface ResultOptions {
  type: "success" | "error";
  title: string;
  description?: string;
}
interface Ctx {
  /** Resolves true when the user confirms, false when they cancel. */
  confirm: (o: ConfirmOptions) => Promise<boolean>;
  /** Shows the animated success / failure modal. */
  showResult: (o: ResultOptions) => void;
  /** Confirm, then run the action with a spinner, then show success or failure. */
  runWithConfirm: (o: {
    confirm: ConfirmOptions;
    action: () => Promise<unknown>;
    success: { title: string; description?: string };
    errorTitle?: string;
  }) => Promise<boolean>;
}

const DialogsContext = createContext<Ctx | null>(null);

export function useDialogs() {
  const c = useContext(DialogsContext);
  if (!c) throw new Error("useDialogs must be used inside <DialogsProvider>");
  return c;
}

function AnimatedIcon({ type }: { type: "success" | "error" | "warning" }) {
  const color =
    type === "success" ? "hsl(var(--success))" : type === "error" ? "hsl(var(--destructive))" : "hsl(var(--warning))";
  return (
    <div
      className="mx-auto w-20 h-20 rounded-full flex items-center justify-center animate-pop-in animate-ring-pulse"
      style={{ background: `${color.replace(")", " / 0.12)")}`, ["--ring-color" as string]: color.replace(")", " / 0.35)") }}
    >
      {type === "warning" ? (
        <AlertTriangle className="w-9 h-9" style={{ color }} strokeWidth={1.75} />
      ) : (
        <svg viewBox="0 0 52 52" className="w-10 h-10" fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
          {type === "success" ? (
            <path d="M14 27 l8 8 l16 -18" strokeDasharray="40" strokeDashoffset="40" className="animate-draw" />
          ) : (
            <g className="animate-shake">
              <path d="M16 16 L36 36" strokeDasharray="30" strokeDashoffset="30" className="animate-draw" />
              <path d="M36 16 L16 36" strokeDasharray="30" strokeDashoffset="30" className="animate-draw" style={{ animationDelay: "0.5s" }} />
            </g>
          )}
        </svg>
      )}
    </div>
  );
}

export function DialogsProvider({ children }: { children: ReactNode }) {
  const [confirmState, setConfirmState] = useState<(ConfirmOptions & { busy?: boolean }) | null>(null);
  const [result, setResult] = useState<ResultOptions | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);

  const confirm = useCallback(
    (o: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        resolver.current = resolve;
        setConfirmState(o);
      }),
    [],
  );
  const settle = (v: boolean) => {
    resolver.current?.(v);
    resolver.current = null;
    setConfirmState(null);
  };
  const showResult = useCallback((o: ResultOptions) => setResult(o), []);

  const runWithConfirm: Ctx["runWithConfirm"] = useCallback(
    async ({ confirm: c, action, success, errorTitle }) => {
      if (!(await confirm(c))) return false;
      try {
        await action();
        setResult({ type: "success", ...success });
        return true;
      } catch (e: any) {
        setResult({ type: "error", title: errorTitle || "Something went wrong", description: e?.message });
        return false;
      }
    },
    [confirm],
  );

  return (
    <DialogsContext.Provider value={{ confirm, showResult, runWithConfirm }}>
      {children}

      <AlertDialog open={!!confirmState} onOpenChange={(o) => !o && settle(false)}>
        <AlertDialogContent className="max-w-sm text-center rounded-2xl bg-card border-border">
          <AnimatedIcon type={confirmState?.destructive ? "error" : "warning"} />
          <AlertDialogTitle className="text-lg font-semibold text-foreground">{confirmState?.title}</AlertDialogTitle>
          {confirmState?.description && (
            <AlertDialogDescription className="text-sm text-muted-foreground">{confirmState.description}</AlertDialogDescription>
          )}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => settle(false)}>
              {confirmState?.cancelText ?? "Cancel"}
            </Button>
            <Button
              className="flex-1"
              variant={confirmState?.destructive ? "destructive" : "default"}
              onClick={() => settle(true)}
            >
              {confirmState?.busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {confirmState?.confirmText ?? "Confirm"}
            </Button>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!result} onOpenChange={(o) => !o && setResult(null)}>
        <AlertDialogContent className="max-w-sm text-center rounded-2xl bg-card border-border">
          {result && <AnimatedIcon type={result.type} />}
          <AlertDialogTitle className="text-lg font-semibold text-foreground">{result?.title}</AlertDialogTitle>
          {result?.description && (
            <AlertDialogDescription className="text-sm text-muted-foreground">{result.description}</AlertDialogDescription>
          )}
          <Button className="w-full mt-2" variant={result?.type === "error" ? "destructive" : "default"} onClick={() => setResult(null)}>
            {result?.type === "error" ? "Close" : "Done"}
          </Button>
        </AlertDialogContent>
      </AlertDialog>
    </DialogsContext.Provider>
  );
}
