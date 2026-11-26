import jsPDF from "jspdf";
import logo from "@/assets/images/logo.png";

const PRIMARY = "#1e3a8a";
const SECONDARY = "#111827";
const MUTED = "#6b7280";
const LINE = "#d1d5db";
const BG = "#f3f4f6";

function toRgb(hex: string) {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
}
const setFill = (doc: jsPDF, c: string) => {
  const { r, g, b } = toRgb(c);
  doc.setFillColor(r, g, b);
};
const setDraw = (doc: jsPDF, c: string) => {
  const { r, g, b } = toRgb(c);
  doc.setDrawColor(r, g, b);
};
const setTextClr = (doc: jsPDF, c: string) => {
  const { r, g, b } = toRgb(c);
  doc.setTextColor(r, g, b);
};
function hline(doc: jsPDF, x: number, y: number, w: number, c: string, lw = 0.3) {
  setDraw(doc, c);
  doc.setLineWidth(lw);
  doc.line(x, y, x + w, y);
}

async function loadFont(doc: jsPDF, file: string, name: string, style: string): Promise<boolean> {
  try {
    const res = await fetch(`/fonts/${file}`);
    if (!res.ok) return false;
    const buf = await res.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let bin = "";
    for (let i = 0; i < bytes.length; i += 8192) bin += String.fromCharCode(...bytes.subarray(i, i + 8192));
    doc.addFileToVFS(file, btoa(bin));
    doc.addFont(file, name, style);
    return true;
  } catch {
    return false;
  }
}

export interface PIData {
  piNumber: string;
  date: string;
  clientName: string;
  clientAddress?: string;
  clientPhone?: string;
  clientGST?: string;
  items: {
    partName: string;
    partNumber?: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    totalPrice: number;
  }[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  status: string;
  notes?: string;
}

export async function generatePIPDF(pi: PIData, settings: any, format: "POS" | "A4" = "POS"): Promise<void> {
  if (format === "A4") {
    return generateA4PIPDF(pi, settings);
  }
  
  const companyName = settings?.companyName || "BAGCLUES EXIM PRIVATE LIMITED";
  const companyAddress = settings?.companyAddress || "A-79, SECTOR 58, NOIDA(UP)-201301";
  const companyPhone = settings?.companyPhone || "76540-44444";
  const companyGST = settings?.companyGST || "09AAGCB9274N1ZW";

  const RW = 226;
  const ML = 10;
  const CW = RW - ML * 2;

  const headerH = 110;
  const supplierH = 60;
  const itemsH = pi.items.length * 32 + 24;
  const totalsH = 80;
  const footerH = 40;
  const RH = headerH + supplierH + itemsH + totalsH + footerH + (pi.notes ? 30 : 0);

  const doc = new jsPDF({ unit: "pt", format: [RW, RH], orientation: "portrait" });

  const regularOk = await loadFont(doc, "NotoSans-Regular.ttf", "NotoSans", "normal");
  const boldOk = await loadFont(doc, "NotoSans-Bold.ttf", "NotoSans", "bold");
  const F = regularOk && boldOk ? "NotoSans" : "helvetica";

  const setN = (sz: number) => { doc.setFont(F, "normal"); doc.setFontSize(sz); };
  const setB = (sz: number) => { doc.setFont(F, "bold"); doc.setFontSize(sz); };
  const rupee = (n: number) => (regularOk && boldOk ? "₹" : "Rs.") + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  let y = 8;
  setFill(doc, PRIMARY);
  doc.rect(0, 0, RW, 72, "F");

  try { doc.addImage(logo, "PNG", ML, y + 2, 22, 32); } catch {}

  setB(8); setTextClr(doc, "#ffffff");
  doc.text(companyName.toUpperCase(), ML + 26, y + 14);

  setN(6); setTextClr(doc, "#cbd5e1");
  const addrLines = doc.splitTextToSize(companyAddress.toUpperCase(), CW - 26);
  addrLines.forEach((l: string, i: number) => doc.text(l, ML + 26, y + 23 + i * 7));
  doc.text(`M: ${companyPhone}  GST: ${companyGST}`, ML + 26, y + 23 + addrLines.length * 7);

  setFill(doc, "#0f2060");
  doc.rect(0, 58, RW, 18, "F");
  setB(8.5); setTextClr(doc, "#ffffff");
  doc.text("PERFORMA INVOICE", RW / 2, 70, { align: "center" });

  y = 84;
  setFill(doc, BG); doc.rect(0, y, RW, 16, "F");
  setB(6.5); setTextClr(doc, SECONDARY);
  doc.text(pi.piNumber, ML, y + 10.5);
  setN(6.5); setTextClr(doc, MUTED);
  doc.text(new Date(pi.date).toLocaleDateString("en-GB"), RW - ML, y + 10.5, { align: "right" });

  y += 20;
  hline(doc, ML, y, CW, LINE); y += 6;
  setB(6.5); setTextClr(doc, PRIMARY); doc.text("CLIENT DETAILS", ML, y); y += 8;

  setB(7.5); setTextClr(doc, SECONDARY); doc.text(pi.clientName.toUpperCase(), ML, y); y += 9;

  setN(6.5); setTextClr(doc, MUTED);
  if (pi.clientAddress) {
    doc.splitTextToSize(pi.clientAddress, CW).forEach((l: string) => { doc.text(l, ML, y); y += 7; });
  }
  if (pi.clientPhone) { doc.text(`Phone: ${pi.clientPhone}`, ML, y); y += 7; }
  if (pi.clientGST) { doc.text(`GST: ${pi.clientGST}`, ML, y); y += 7; }

  y += 4; hline(doc, ML, y, CW, LINE); y += 6;

  setFill(doc, PRIMARY); doc.rect(ML, y, CW, 14, "F");
  setB(6); setTextClr(doc, "#ffffff");
  const C1 = CW * 0.38, C2 = CW * 0.14, C3 = CW * 0.24, C4 = CW * 0.24;
  const x1 = ML, x2 = ML + C1, x3 = ML + C1 + C2, x4 = ML + C1 + C2 + C3;
  doc.text("ITEM", x1 + 3, y + 9.5);
  doc.text("QTY", x2 + C2 / 2, y + 9.5, { align: "center" });
  doc.text("RATE", x3 + C3 - 3, y + 9.5, { align: "right" });
  doc.text("AMOUNT", x4 + C4 - 3, y + 9.5, { align: "right" });
  y += 14;

  pi.items.forEach((item, i) => {
    const rowH = 28;
    setFill(doc, i % 2 === 0 ? "#ffffff" : BG);
    doc.rect(ML, y, CW, rowH, "F");
    setB(6.5); setTextClr(doc, SECONDARY);
    doc.text((item.partName || "").substring(0, 22), x1 + 3, y + 9);
    setN(6); setTextClr(doc, MUTED);
    if (item.partNumber) doc.text(`#${item.partNumber}`, x1 + 3, y + 17);
    setN(7); setTextClr(doc, SECONDARY);
    doc.text(`${item.quantity} ${item.unit}`, x2 + C2 / 2, y + 13, { align: "center" });
    doc.text(rupee(item.unitPrice), x3 + C3 - 3, y + 13, { align: "right" });
    setB(7); doc.text(rupee(item.totalPrice), x4 + C4 - 3, y + 13, { align: "right" });
    setDraw(doc, LINE); doc.setLineWidth(0.2);
    [x2, x3, x4].forEach((xd) => doc.line(xd, y, xd, y + rowH));
    hline(doc, ML, y + rowH, CW, LINE);
    y += rowH;
  });
  y += 6;

  const totRows = [["Subtotal", rupee(pi.subtotal)], [`GST (${pi.taxRate}%)`, rupee(pi.taxAmount)]];
  totRows.forEach(([lbl, val]) => {
    setN(6.5); setTextClr(doc, MUTED); doc.text(lbl, ML, y);
    setN(6.5); setTextClr(doc, SECONDARY); doc.text(val, RW - ML, y, { align: "right" });
    y += 10;
  });

  hline(doc, ML, y, CW, PRIMARY, 0.6); y += 7;
  setFill(doc, PRIMARY); doc.rect(ML, y, CW, 18, "F");
  setB(8); setTextClr(doc, "#ffffff"); doc.text("TOTAL", ML + 5, y + 12);
  setB(9); doc.text(rupee(pi.total), RW - ML - 5, y + 12, { align: "right" });
  y += 22;

  const statusColors: any = { Draft: "#6b7280", Sent: "#2563eb", Received: "#16a34a", Paid: "#7c3aed" };
  const { r, g, b } = toRgb(statusColors[pi.status] || "#6b7280");
  doc.setFillColor(r, g, b); doc.roundedRect(ML, y, 36, 10, 2, 2, "F");
  setB(5.5); setTextClr(doc, "#ffffff");
  doc.text(pi.status.toUpperCase(), ML + 18, y + 7, { align: "center" });
  y += 16;

  if (pi.notes) {
    hline(doc, ML, y, CW, LINE); y += 7;
    setB(6); setTextClr(doc, MUTED); doc.text("NOTES:", ML, y); y += 7;
    setN(6); setTextClr(doc, SECONDARY);
    doc.splitTextToSize(pi.notes, CW).forEach((l: string) => { doc.text(l, ML, y); y += 7; });
    y += 4;
  }

  hline(doc, ML, y, CW, LINE); y += 10;
  setN(6); setTextClr(doc, MUTED); doc.text("Generated by Agency Flow CRM", RW / 2, y, { align: "center" });

  doc.save(`${pi.piNumber}-pos.pdf`);
}

async function generateA4PIPDF(pi: PIData, settings: any): Promise<void> {
  const companyName = settings?.companyName || "BAGCLUES EXIM PRIVATE LIMITED";
  const companyAddress = settings?.companyAddress || "A-79, SECTOR 58, NOIDA(UP)-201301";
  const companyPhone = settings?.companyPhone || "76540-44444";
  const companyGST = settings?.companyGST || "09AAGCB9274N1ZW";

  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });
  const PW = 595.28; // A4 width in pt
  const PH = 841.89; // A4 height in pt
  const ML = 40; // margin left
  const MR = 40; // margin right
  const CW = PW - ML - MR; // content width

  const regularOk = await loadFont(doc, "NotoSans-Regular.ttf", "NotoSans", "normal");
  const boldOk = await loadFont(doc, "NotoSans-Bold.ttf", "NotoSans", "bold");
  const F = regularOk && boldOk ? "NotoSans" : "helvetica";

  const setN = (sz: number) => { doc.setFont(F, "normal"); doc.setFontSize(sz); };
  const setB = (sz: number) => { doc.setFont(F, "bold"); doc.setFontSize(sz); };
  const rupee = (n: number) => (regularOk && boldOk ? "₹" : "Rs.") + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  let y = 40;
  
  // Header
  try { doc.addImage(logo, "PNG", ML, y, 60, 80); } catch {}
  
  setB(16); setTextClr(doc, PRIMARY);
  doc.text(companyName.toUpperCase(), ML + 80, y + 20);
  
  setN(10); setTextClr(doc, MUTED);
  doc.text(companyAddress, ML + 80, y + 36);
  doc.text(`Phone: ${companyPhone} | GST: ${companyGST}`, ML + 80, y + 50);
  
  setB(24); setTextClr(doc, "#e2e8f0");
  doc.text("INVOICE", PW - MR, y + 25, { align: "right" });
  
  y = 130;
  hline(doc, ML, y, CW, LINE, 1);
  y += 20;

  // Details row
  setB(10); setTextClr(doc, PRIMARY); doc.text("BILL TO", ML, y);
  doc.text("INVOICE DETAILS", PW - MR, y, { align: "right" });
  
  y += 15;
  setB(11); setTextClr(doc, SECONDARY); doc.text(pi.clientName.toUpperCase(), ML, y);
  
  setN(10); setTextClr(doc, SECONDARY);
  doc.text(`Invoice #: ${pi.piNumber}`, PW - MR, y, { align: "right" });
  
  y += 15;
  setN(10); setTextClr(doc, MUTED);
  let addrY = y;
  if (pi.clientAddress) {
    doc.splitTextToSize(pi.clientAddress, 250).forEach((l: string) => { doc.text(l, ML, addrY); addrY += 14; });
  }
  if (pi.clientPhone) { doc.text(`Phone: ${pi.clientPhone}`, ML, addrY); addrY += 14; }
  if (pi.clientGST) { doc.text(`GST: ${pi.clientGST}`, ML, addrY); addrY += 14; }

  doc.text(`Date: ${new Date(pi.date).toLocaleDateString("en-GB")}`, PW - MR, y, { align: "right" });
  doc.text(`Status: ${pi.status}`, PW - MR, y + 14, { align: "right" });

  y = Math.max(addrY, y + 40) + 20;

  // Items Table
  setFill(doc, PRIMARY);
  doc.rect(ML, y, CW, 24, "F");
  
  setB(10); setTextClr(doc, "#ffffff");
  const colX = [ML + 10, ML + CW * 0.45, ML + CW * 0.65, ML + CW * 0.85];
  doc.text("DESCRIPTION", colX[0], y + 16);
  doc.text("QTY", colX[1], y + 16, { align: "center" });
  doc.text("PRICE", colX[2], y + 16, { align: "right" });
  doc.text("AMOUNT", colX[3] + 25, y + 16, { align: "right" });
  
  y += 24;

  pi.items.forEach((item, i) => {
    const rowH = 36;
    if (y + rowH > PH - 100) {
      doc.addPage();
      y = 40;
    }
    setFill(doc, i % 2 === 0 ? "#ffffff" : BG);
    doc.rect(ML, y, CW, rowH, "F");
    
    setB(10); setTextClr(doc, SECONDARY);
    doc.text((item.partName || ""), colX[0], y + 16);
    setN(9); setTextClr(doc, MUTED);
    if (item.partNumber) doc.text(`#${item.partNumber}`, colX[0], y + 28);
    
    setN(10); setTextClr(doc, SECONDARY);
    doc.text(`${item.quantity} ${item.unit}`, colX[1], y + 22, { align: "center" });
    doc.text(rupee(item.unitPrice), colX[2], y + 22, { align: "right" });
    setB(10); doc.text(rupee(item.totalPrice), colX[3] + 25, y + 22, { align: "right" });
    
    y += rowH;
  });

  y += 20;

  // Totals
  const totW = 200;
  const totX = PW - MR - totW;
  
  setN(10); setTextClr(doc, MUTED);
  doc.text("Subtotal:", totX, y);
  setTextClr(doc, SECONDARY); doc.text(rupee(pi.subtotal), PW - MR, y, { align: "right" });
  
  y += 18;
  setTextClr(doc, MUTED);
  doc.text(`Tax (${pi.taxRate}%):`, totX, y);
  setTextClr(doc, SECONDARY); doc.text(rupee(pi.taxAmount), PW - MR, y, { align: "right" });
  
  y += 15;
  hline(doc, totX, y, totW, LINE, 1);
  y += 20;
  
  setB(12); setTextClr(doc, PRIMARY);
  doc.text("TOTAL DUE:", totX, y);
  doc.text(rupee(pi.total), PW - MR, y, { align: "right" });
  
  y += 40;
  if (pi.notes) {
    setB(10); setTextClr(doc, MUTED); doc.text("NOTES:", ML, y); y += 14;
    setN(10); setTextClr(doc, SECONDARY);
    doc.splitTextToSize(pi.notes, CW - 100).forEach((l: string) => { doc.text(l, ML, y); y += 14; });
  }

  // Footer
  y = PH - 40;
  hline(doc, ML, y, CW, LINE, 1);
  y += 15;
  setN(9); setTextClr(doc, MUTED);
  doc.text("Thank you for your business!", PW / 2, y, { align: "center" });

  doc.save(`${pi.piNumber}-a4.pdf`);
}
