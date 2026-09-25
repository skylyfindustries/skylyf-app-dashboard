import { Gauge, Package, Tag as TagIcon, Warehouse } from 'lucide-react';
import { useState } from 'react';
import { api } from '../api/client.js';
import { useApi } from '../api/useApi.js';
import { EditDelete } from '../components/Actions.jsx';
import Modal, { Confirm, Field } from '../components/Modal.jsx';
import ExportMenu from '../components/ExportMenu.jsx';
import { Async, Ic, MachineImg } from '../components/ui.jsx';

// Machine types: names, units and stock. Adding a type needs no app release.
export default function Catalog() {
  const state = useApi('/admin/machine-types');
  const [dialog, setDialog] = useState(null); // { kind: 'add' | 'edit' | 'delete', t? }
  const close = () => setDialog(null);
  const done = () => { close(); state.reload(); };
  const t = dialog?.t;

  const fields = (
    <>
      <Field label="Name"><input name="name" required defaultValue={t?.name} /></Field>
      <Field label="Speed unit (e.g. Cups/min)"><input name="speedUnit" required defaultValue={t?.speedUnit} /></Field>
      <Field label="Output unit (e.g. Cups)"><input name="outputUnit" required defaultValue={t?.outputUnit} /></Field>
      <Field label="Units in stock"><input name="stock" type="number" min="0" defaultValue={t?.stock ?? 0} /></Field>
    </>
  );

  return (
    <>
      <div className="row"><h1>Machine types</h1><ExportMenu id="stock" /><button onClick={() => setDialog({ kind: 'add' })}>+ Add type</button></div>
      <Async state={state}>{(list) => (
        <div className="card tablewrap">
          <table>
            <thead><tr><th>Key</th><th>Name</th><th>Speed unit</th><th>Output unit</th><th className="num">In stock</th><th /></tr></thead>
            <tbody>
              {list.map((x) => (
                <tr key={x.key}>
                  <td><Ic icon={TagIcon}>{x.key}</Ic></td><td><div className="mcell"><MachineImg typeKey={x.key} /><b>{x.name}</b></div></td><td><Ic icon={Gauge}>{x.speedUnit}</Ic></td><td><Ic icon={Package}>{x.outputUnit}</Ic></td><td className="num"><Ic icon={Warehouse}>{x.stock ?? 0}</Ic></td>
                  <td><EditDelete onEdit={() => setDialog({ kind: 'edit', t: x })} onDelete={() => setDialog({ kind: 'delete', t: x })} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}</Async>

      {dialog?.kind === 'add' && (
        <Modal title="Add machine type" submitText="Add" onClose={close}
          onSubmit={async (f) => { await api('/admin/machine-types', { method: 'POST', body: f }); done(); }}>
          <Field label="Key (lowercase, e.g. paper_plate)"><input name="key" required pattern="[a-z0-9_]+" /></Field>
          {fields}
        </Modal>
      )}
      {dialog?.kind === 'edit' && (
        <Modal title={`Edit ${t.name}`} onClose={close}
          onSubmit={async (f) => { await api(`/admin/machine-types/${t.key}`, { method: 'PATCH', body: f }); done(); }}>
          {fields}
        </Modal>
      )}
      {dialog?.kind === 'delete' && (
        <Confirm title={`Delete ${t.name}?`} text="Types that machines are still using can't be deleted." onClose={close}
          onConfirm={async () => { await api(`/admin/machine-types/${t.key}`, { method: 'DELETE' }); done(); }} />
      )}
    </>
  );
}
