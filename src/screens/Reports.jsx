import { FileSpreadsheet, FileText } from 'lucide-react';
import { useState } from 'react';
import { exportReport } from '../api/exporter.js';
import { REPORTS } from '../api/reports.js';

// One card per report; each downloads as Excel or PDF.
export default function Reports() {
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const run = async (id, fmt) => {
    setBusy(id + fmt); setError('');
    try { await exportReport(id, fmt); } catch (e) { setError(e.message); }
    setBusy('');
  };
  return (
    <>
      <h1>Reports</h1>
      <p className="err">{error}</p>
      <div className="three reveal">
        {REPORTS.map(({ id, label, desc, icon: Icon }) => (
          <div key={id} className="card report">
            <div className="chip"><Icon size={20} /></div>
            <div>
              <h2>{label}</h2>
              <p className="muted">{desc}</p>
            </div>
            <div className="row tight">
              <button className="alt" disabled={!!busy} onClick={() => run(id, 'xlsx')}><FileSpreadsheet size={15} /> {busy === `${id}xlsx` ? 'Preparing…' : 'Excel'}</button>
              <button className="alt" disabled={!!busy} onClick={() => run(id, 'pdf')}><FileText size={15} /> {busy === `${id}pdf` ? 'Preparing…' : 'PDF'}</button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
