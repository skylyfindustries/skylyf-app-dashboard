import { Building2, Calendar, Clock, Factory, Hash, PackageCheck, PackageOpen, Search, Tag as TagIcon, Users, Warehouse } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { date, day } from '../api/format.js';
import { useApi } from '../api/useApi.js';
import ExportMenu from '../components/ExportMenu.jsx';
import ImportMachines from '../components/ImportMachines.jsx';
import StockModal from '../components/StockModal.jsx';
import { Async, Ic, MachineImg, Stat, Tag } from '../components/ui.jsx';

// One table: warehouse stock rows (per type) + every deployed machine with its client.
export default function Inventory() {
  const types = useApi('/admin/machine-types');
  const machines = useApi('/admin/machines');
  const [dialog, setDialog] = useState(null); // 'stock' | 'import'
  const [q, setQ] = useState('');
  const [type, setType] = useState('');
  const state = { data: types.data && machines.data && { types: types.data, machines: machines.data }, error: types.error || machines.error };
  const reload = () => { setDialog(null); types.reload(); machines.reload(); };

  return (
    <>
      <div className="row">
        <h1>Inventory</h1>
        <label className="search"><Search size={15} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search code, client, model…" /></label>
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">All types</option>
          {(types.data ?? []).map((t) => <option key={t.key} value={t.key}>{t.name}</option>)}
        </select>
        <ExportMenu id="machines" />
        <button className="alt" onClick={() => setDialog('import')}>Import</button>
        <button onClick={() => setDialog('stock')}>Update stock</button>
      </div>
      <Async state={state}>{({ types, machines }) => {
        const stock = types.reduce((a, t) => a + (t.stock ?? 0), 0);
        const needle = q.trim().toLowerCase();
        const shown = machines.filter((m) => (!type || m.typeKey === type) && (!needle || [m.code, m.client, m.model, m.typeKey].some((v) => String(v ?? '').toLowerCase().includes(needle))));
        const inStock = needle ? [] : types.filter((t) => (!type || t.key === type) && (t.stock ?? 0) > 0);
        return (
          <>
            <div className="grid reveal">
              <Stat icon={PackageOpen} value={stock} text="In warehouse" />
              <Stat icon={PackageCheck} value={machines.length} text="Deployed to clients" />
              <Stat icon={Users} value={new Set(machines.map((m) => m.companyId)).size} text="Clients holding machines" />
              <Stat icon={Factory} value={stock + machines.length} text="Total units" />
            </div>
            <div className="card tablewrap reveal">
              <table>
                <thead><tr><th>Machine</th><th>Type</th><th>Held by</th><th>Status</th><th className="num">Units</th><th>Registered</th><th>Last seen</th></tr></thead>
                <tbody>
                  {inStock.map((t) => (
                    <tr key={t.key}>
                      <td><div className="mcell"><MachineImg typeKey={t.key} /><div><b>{t.name}</b><br /><small>Unsold stock</small></div></div></td>
                      <td><Ic icon={TagIcon}>{t.key}</Ic></td>
                      <td><Ic icon={Warehouse}>Warehouse</Ic></td>
                      <td><Ic icon={PackageOpen} tone="idle">In stock</Ic></td>
                      <td className="num">{t.stock}</td><td>—</td><td>—</td>
                    </tr>
                  ))}
                  {shown.map((m) => (
                    <tr key={m._id}>
                      <td><div className="mcell"><MachineImg typeKey={m.typeKey} status={m.status} /><div><b><Hash size={13} />{m.code}</b><br /><small>{m.model || '—'}</small></div></div></td>
                      <td><Ic icon={TagIcon}>{m.typeKey}</Ic></td>
                      <td><Link to={`/clients/${m.companyId}`}><Ic icon={Building2}>{m.client}</Ic></Link></td>
                      <td><Tag status={m.status} /></td>
                      <td className="num">1</td>
                      <td><Ic icon={Calendar}>{day(m.createdAt)}</Ic></td><td><Ic icon={Clock}>{date(m.lastSeenAt)}</Ic></td>
                    </tr>
                  ))}
                  {!inStock.length && !shown.length && <tr><td colSpan="7" className="muted">Nothing matches.</td></tr>}
                </tbody>
              </table>
            </div>
            {dialog === 'stock' && <StockModal inventory={types.map((t) => ({ key: t.key, name: t.name, available: t.stock ?? 0 }))} onClose={() => setDialog(null)} onDone={reload} />}
            {dialog === 'import' && <ImportMachines onClose={() => setDialog(null)} onDone={reload} />}
          </>
        );
      }}</Async>
    </>
  );
}
