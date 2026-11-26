import jsPDF from "jspdf";

// Report card of one machine: registration, stages, QC, parts used and who took what.
const PW = 595.28;
const PH = 841.89;
const M = 36;
const CW = PW - M * 2;

const date = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-";
const dateTime = (d?: string | null) =>
  d
    ? new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : "-";
// Built-in PDF fonts have no rupee glyph
const rs = (n?: number) => `Rs. ${(n || 0).toLocaleString("en-IN")}`;

export function generateMachineReportPDF(d: any, opts: { showPrice?: boolean } = {}) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  let y = M;

  const room = (h: number) => {
    if (y + h > PH - M) {
      doc.addPage();
      y = M;
    }
  };
  const heading = (t: string) => {
    room(40);
    y += 10;
    doc.setFont("helvetica", "bold").setFontSize(11).setTextColor(30, 58, 138).text(t, M, y);
    y += 5;
    doc.setDrawColor(209, 213, 219).line(M, y, M + CW, y);
    y += 14;
  };
  // Table with fixed column x-offsets; `right` columns are right-aligned
  const table = (cols: { label: string; w: number; right?: boolean }[], rows: string[][]) => {
    const draw = (cells: string[], bold: boolean) => {
      doc.setFont("helvetica", bold ? "bold" : "normal").setFontSize(8.5).setTextColor(bold ? 107 : 17, bold ? 114 : 24, bold ? 128 : 39);
      const lines = cells.map((c, i) => doc.splitTextToSize(String(c ?? ""), cols[i].w - 8) as string[]);
      const h = Math.max(...lines.map((l) => l.length)) * 11 + 4;
      room(h);
      let x = M;
      lines.forEach((l, i) => {
        doc.text(l, cols[i].right ? x + cols[i].w - 4 : x + 2, y, { align: cols[i].right ? "right" : "left" });
        x += cols[i].w;
      });
      y += h;
      if (!bold) doc.setDrawColor(235, 236, 240).line(M, y - 9, M + CW, y - 9);
    };
    draw(cols.map((c) => c.label), true);
    rows.forEach((r) => draw(r, false));
  };
  const kv = (pairs: [string, string][]) => {
    const colW = CW / 2;
    for (let i = 0; i < pairs.length; i += 2) {
      room(16);
      pairs.slice(i, i + 2).forEach(([k, v], j) => {
        const x = M + j * colW;
        doc.setFont("helvetica", "normal").setFontSize(8.5).setTextColor(107, 114, 128).text(k, x, y);
        doc.setFont("helvetica", "bold").setFontSize(9.5).setTextColor(17, 24, 39).text(String(v || "-"), x + 85, y);
      });
      y += 16;
    }
  };

  // Title
  doc.setFont("helvetica", "bold").setFontSize(18).setTextColor(17, 24, 39).text("Machine Report Card", M, y + 8);
  doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(107, 114, 128).text(`Generated ${dateTime(new Date().toISOString())}`, PW - M, y + 8, { align: "right" });
  y += 26;
  doc.setFont("helvetica", "bold").setFontSize(13).setTextColor(17, 24, 39).text(`${d.name}  (${d.machineNo})`, M, y);
  y += 4;

  heading("Registration & status");
  kv([
    ["Job no.", d.machineNo],
    ["Type", d.type],
    ["Status", d.status],
    ["Progress", `${d.progress ?? 0}% (${d.stagesDone ?? 0}/${d.stagesTotal ?? 0} stages)`],
    ["Registered on", dateTime(d.createdAt)],
    ["Registered by", d.registeredBy],
    ["Client", d.clientName],
    ["Order date", date(d.orderDate)],
    ["Target date", date(d.targetDate)],
    ["Delivered on", date(d.deliveredDate)],
    ...(opts.showPrice ? ([["Selling price", rs(d.sellingPrice)]] as [string, string][]) : []),
    ["Parts cost", rs(d.partsCost)],
  ]);
  if (d.notes) {
    doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(75, 85, 99);
    const l = doc.splitTextToSize(`Notes: ${d.notes}`, CW) as string[];
    room(l.length * 11);
    doc.text(l, M, y);
    y += l.length * 11;
  }

  heading("Pipeline status");
  const steps = ["Planned", "Under Construction", "Testing", "Ready", "Delivered", "In Service"];
  const at = steps.indexOf(d.status);
  const segW = CW / steps.length;
  steps.forEach((st, i) => {
    const x = M + i * segW;
    if (i <= at) doc.setFillColor(30, 58, 138);
    else doc.setFillColor(229, 231, 235);
    doc.rect(x + 1, y - 6, segW - 2, 5, "F");
    doc.setFont("helvetica", i === at ? "bold" : "normal").setFontSize(7.5).setTextColor(i === at ? 17 : 107, i === at ? 24 : 114, i === at ? 39 : 128);
    doc.text(st, x + segW / 2, y + 8, { align: "center" });
  });
  y += 22;
  const owners = new Map<string, { total: number; done: number; open: string[] }>();
  (d.stages || []).forEach((s: any) => {
    const k = s.assigneeName || "Unassigned";
    const o = owners.get(k) || { total: 0, done: 0, open: [] };
    o.total++;
    if (s.status === "completed") o.done++;
    else o.open.push(`${s.name} (${String(s.status).replace("_", " ")})`);
    owners.set(k, o);
  });
  if (owners.size) {
    table(
      [
        { label: "Owner", w: 120 },
        { label: "Stages done", w: 80, right: true },
        { label: "Still open", w: CW - 200 },
      ],
      [...owners].map(([k, o]) => [k, `${o.done} / ${o.total}`, o.open.join(", ") || "All done"]),
    );
  }

  heading("Production stages");
  table(
    [
      { label: "Stage", w: 150 },
      { label: "Assignee", w: 110 },
      { label: "Status", w: 80 },
      { label: "Done", w: 45, right: true },
      { label: "Started", w: 74 },
      { label: "Completed", w: CW - 459 },
    ],
    (d.stages || []).map((s: any) => [
      s.name,
      s.assigneeName,
      String(s.status).replace("_", " "),
      `${s.progress ?? 0}%`,
      date(s.startedAt),
      date(s.completedAt),
    ]),
  );

  heading("Quality checks");
  table(
    [
      { label: "Check", w: 210 },
      { label: "Result", w: 60 },
      { label: "By", w: 90 },
      { label: "When", w: 80 },
      { label: "Note", w: CW - 440 },
    ],
    (d.qualityChecks || []).map((c: any) => [c.title, c.result, c.byName, date(c.at), c.note]),
  );

  heading(`Parts used (${d.partsCount ?? 0} pcs, ${rs(d.partsCost)})`);
  if (!d.parts?.length) {
    doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(107, 114, 128).text("No parts issued yet.", M, y);
    y += 12;
  } else {
    table(
      [
        { label: "Part", w: 220 },
        { label: "Barcode", w: 90 },
        { label: "Qty", w: 45, right: true },
        { label: "Unit", w: 80, right: true },
        { label: "Cost", w: CW - 435, right: true },
      ],
      d.parts.map((p: any) => [p.partName, p.barcode, String(p.quantity), rs(p.unitPrice), rs(p.cost)]),
    );
  }

  heading("Who took which part");
  if (!d.history?.length) {
    doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(107, 114, 128).text("No movements recorded.", M, y);
    y += 12;
  } else {
    table(
      [
        { label: "Date", w: 95 },
        { label: "Type", w: 50 },
        { label: "Part", w: 170 },
        { label: "Qty", w: 35, right: true },
        { label: "Taken by", w: 90 },
        { label: "Reason", w: CW - 440 },
      ],
      [...d.history]
        .sort((a: any, b: any) => +new Date(a.movementDate) - +new Date(b.movementDate))
        .map((h: any) => [dateTime(h.movementDate), h.type, h.partName, String(h.quantity), h.takenBy, h.reason]),
    );
  }

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(156, 163, 175).text(`${d.machineNo} - page ${i} of ${pages}`, PW / 2, PH - 18, { align: "center" });
  }
  doc.save(`report-card-${d.machineNo}.pdf`);
}
