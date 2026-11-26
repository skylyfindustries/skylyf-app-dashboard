import JsBarcode from "jsbarcode";

export interface LabelPart {
  partName: string;
  partNumber?: string;
  barcode?: string;
  location?: string;
}

const esc = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

// Render a Code 128 barcode to an SVG string
export function barcodeSvg(code: string): string {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  JsBarcode(svg, code, {
    format: "CODE128",
    width: 2,
    height: 50,
    displayValue: true,
    fontSize: 14,
    margin: 4,
  });
  return svg.outerHTML;
}

// Open a print window with one label per part (50mm x 30mm, one per page-cell)
export function printLabels(parts: LabelPart[]) {
  const labels = parts
    .filter((p) => p.barcode)
    .map(
      (p) => `<div class="label">
        <div class="name">${esc(p.partName)}</div>
        <div class="rack">Rack: ${esc(p.location || "—")}</div>
        ${barcodeSvg(p.barcode!)}
        ${p.partNumber ? `<div class="pn">P/N: ${esc(p.partNumber)}</div>` : ""}
      </div>`,
    )
    .join("");
  const w = window.open("", "_blank");
  if (!w) return false;
  w.document.write(`<!doctype html><html><head><title>Rack Labels</title><style>
    @page { margin: 8mm; }
    body { font-family: Arial, sans-serif; margin: 0; }
    .sheet { display: flex; flex-wrap: wrap; gap: 3mm; }
    .label { width: 60mm; height: 36mm; border: 0.3mm dashed #999; padding: 1.5mm 2mm;
      box-sizing: border-box; display: flex; flex-direction: column; align-items: center;
      justify-content: center; page-break-inside: avoid; overflow: hidden; text-align: center; }
    .name { font-size: 10pt; font-weight: bold; line-height: 1.1; max-height: 2.4em; overflow: hidden; }
    .rack { font-size: 9pt; }
    .pn { font-size: 7pt; color: #444; }
    svg { width: 100%; height: 15mm; }
  </style></head><body><div class="sheet">${labels}</div>
  <script>window.onload=function(){window.print();}</script></body></html>`);
  w.document.close();
  return true;
}

