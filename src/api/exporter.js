import { api } from './client.js';
import { REPORTS } from './reports.js';

const stamp = () => new Date().toISOString().slice(0, 10);

function save(blob, name) {
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: name });
  a.click();
  URL.revokeObjectURL(a.href);
}

// Heavy libraries load on first export only.
export async function download({ title, cols, rows, name }, fmt) {
  if (fmt === 'pdf') {
    const [{ jsPDF }, { autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
    const doc = new jsPDF({ orientation: cols.length > 6 ? 'landscape' : 'portrait', unit: 'pt', format: 'a4' });
    doc.setFontSize(16).text(`Skylyf - ${title}`, 40, 42);
    doc.setFontSize(9).setTextColor(110).text(`Generated ${new Date().toLocaleString()} - ${rows.length} rows`, 40, 58);
    autoTable(doc, {
      head: [cols], body: rows.map((r) => r.map((v) => v ?? '-')), startY: 72, styles: { fontSize: 8, cellPadding: 4 },
      headStyles: { fillColor: [20, 40, 75] }, alternateRowStyles: { fillColor: [250, 246, 238] },
    });
    doc.save(`${name}.pdf`);
  } else {
    const { default: writeExcelFile } = await import('write-excel-file/browser');
    const cell = (v) => (v === '' || v == null ? null : typeof v === 'number' ? v : String(v));
    const sheet = [cols.map((c) => ({ value: c, fontWeight: 'bold' })), ...rows.map((r) => r.map(cell))];
    save(await writeExcelFile(sheet, { columns: cols.map(() => ({ width: 18 })) }).toBlob(), `${name}.xlsx`);
  }
}

export async function exportReport(id, fmt) {
  const r = REPORTS.find((x) => x.id === id);
  await download({ title: r.label, ...(await r.build(api)), name: `skylyf-${id}-${stamp()}` }, fmt);
}
