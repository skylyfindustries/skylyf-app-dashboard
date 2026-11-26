import { useMemo } from "react";
import { barcodeSvg } from "@/lib/printLabels";

interface Props {
  partName: string;
  partNumber?: string;
  barcode?: string;
  location?: string;
}

// Same layout as the printed rack label, shown on screen
export function PartLabel({ partName, partNumber, barcode, location }: Props) {
  const svg = useMemo(() => (barcode ? barcodeSvg(barcode) : ""), [barcode]);
  return (
    <div className="w-full max-w-[240px] rounded-md border border-dashed border-foreground/20 bg-white px-3 py-2 text-center text-black shadow-sm">
      <div className="text-[13px] font-medium leading-tight line-clamp-2">{partName}</div>
      <div className="text-[11px] text-muted-foreground mt-0.5">Rack {location || "not set"}</div>
      <div className="[&>svg]:w-full [&>svg]:h-12 mt-1" dangerouslySetInnerHTML={{ __html: svg }} />
      {partNumber && <div className="text-[10px] text-muted-foreground font-mono">P/N {partNumber}</div>}
    </div>
  );
}
