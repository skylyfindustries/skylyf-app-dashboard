import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Props {
  open: boolean;
  onClose: () => void;
  onScan: (code: string) => void;
}

// Scans Code 128 / QR etc. from the device camera. Needs https or localhost.
export function CameraScanner({ open, onClose, onScan }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(true);
  const handled = useRef(false);

  useEffect(() => {
    if (!open) return;
    handled.current = false;
    setError("");
    setStarting(true);
    let controls: { stop: () => void } | undefined;
    let cancelled = false;

    // Dialog content mounts after open; wait a tick for the <video> element
    const t = setTimeout(async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("Camera needs a secure (https) connection.");
        }
        const reader = new BrowserMultiFormatReader();
        controls = await reader.decodeFromConstraints(
          { video: { facingMode: { ideal: "environment" } } },
          videoRef.current!,
          (result) => {
            if (result && !handled.current) {
              handled.current = true;
              onScan(result.getText());
            }
          },
        );
        if (cancelled) controls.stop();
        else setStarting(false);
      } catch (e) {
        setStarting(false);
        const name = (e as Error).name;
        setError(
          name === "NotAllowedError"
            ? "Camera permission was denied. Allow camera access in the browser and try again."
            : name === "NotFoundError"
              ? "No camera found on this device."
              : (e as Error).message || "Could not start the camera.",
        );
      }
    }, 100);

    return () => {
      cancelled = true;
      clearTimeout(t);
      controls?.stop();
    };
  }, [open, onScan]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Scan with camera</DialogTitle>
          <DialogDescription>Hold the rack label steady in the frame</DialogDescription>
        </DialogHeader>
        <div className="relative rounded-md overflow-hidden bg-black aspect-video">
          <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
          {starting && !error && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-white" />
            </div>
          )}
          {!error && !starting && (
            <div className="absolute inset-x-8 top-1/2 h-px bg-white/70" />
          )}
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </DialogContent>
    </Dialog>
  );
}
