import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import { useRef, useState } from 'react';
import { exportReport } from '../api/exporter.js';

// Export dropdown for one report id (see api/reports.js). Native <details> = no menu state to manage.
export default function ExportMenu({ id }) {
  const ref = useRef();
  const [busy, setBusy] = useState(false);
  const run = async (fmt) => {
    ref.current.open = false;
    setBusy(true);
    try { await exportReport(id, fmt); } catch (e) { alert(e.message); }
    setBusy(false);
  };
  return (
    <details className="menu" ref={ref}>
      <summary className="btn alt"><Download size={15} /> {busy ? 'Exporting…' : 'Export'}</summary>
      <div>
        <button className="link" onClick={() => run('xlsx')}><FileSpreadsheet size={15} /> Excel (.xlsx)</button>
        <button className="link" onClick={() => run('pdf')}><FileText size={15} /> PDF</button>
      </div>
    </details>
  );
}
