import { Building2, Calendar, Factory } from 'lucide-react';
import RegisterMachine from '../components/RegisterMachine.jsx';
import { useState } from 'react';
import { api } from '../api/client.js';
import { date } from '../api/format.js';
import { useApi } from '../api/useApi.js';
import Modal, { Field } from '../components/Modal.jsx';
import { Stats, registrationsStats } from '../components/pageStats.jsx';
import { Async, Ic, Tag } from '../components/ui.jsx';

// Machines owners say they have. Approving creates the real machine for that client and shows its one-time device key.
export default function Registrations() {
  const [status, setStatus] = useState('pending');
  const state = useApi('/admin/registrations');
  const [dialog, setDialog] = useState(null); // { kind: 'approve' | 'reject', r } | { kind: 'key', machines } | { kind: 'register' }
  const close = () => setDialog(null);
  const r = dialog?.r;

  return (
    <>
      <div className="row">
        <h1>Registrations</h1>
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <button onClick={() => setDialog({ kind: 'register' })}>+ Register for client</button>
      </div>
      <Async state={state}>{(list) => {
        const rows = list.filter((x) => !status || x.status === status);
        return (
          <>
          <Stats items={registrationsStats(list)} />
          <div className="card tablewrap">
            <table>
              <thead><tr><th>Requested</th><th>Client</th><th>Machine</th><th className="num">Qty</th><th>Codes</th><th>Serial</th><th>Status</th><th /></tr></thead>
              <tbody>
                {rows.map((x) => (
                  <tr key={x.id}>
                    <td><Ic icon={Calendar}>{date(x.createdAt)}</Ic></td>
                    <td><Ic icon={Building2}>{x.company}</Ic></td>
                    <td><Ic icon={Factory}>{x.model}</Ic></td>
                    <td className="num">{x.qty}</td>
                    <td className="wrap">{x.machines?.map((m) => m.code).join(', ') || '—'}</td>
                    <td className="wrap">{x.serials?.length ? x.serials.map((v) => <div key={v}>{v}</div>) : x.serial || '—'}</td>
                    <td><Tag status={x.status} /></td>
                    <td>
                      {x.status === 'pending' && (
                        <div className="actions">
                          <button type="button" onClick={() => setDialog({ kind: 'approve', r: x })}>Approve</button>
                          <button type="button" className="alt" onClick={() => setDialog({ kind: 'reject', r: x })}>Reject</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {!rows.length && <tr><td colSpan="7">Nothing here.</td></tr>}
              </tbody>
            </table>
          </div>
          </>
        );
      }}</Async>

      {dialog?.kind === 'approve' && (
        <Modal title={`Approve ${r.qty > 1 ? r.qty + ' × ' : ''}${r.model} for ${r.company}`} submitText="Approve" success={false} onClose={close}
          onSubmit={async (f) => {
            const made = await api(`/admin/registrations/${r.id}`, { method: 'PATCH', body: { status: 'approved', ...(f.code && { code: f.code }) } });
            state.reload();
            setDialog({ kind: 'key', machines: made.machines ?? [] });
          }}>
          <p>{r.qty > 1 ? `${r.qty} machines will be added to the client's fleet, each with its own unique code and device key.` : 'The machine will be added to the client\'s fleet.'}</p>
          {r.qty === 1 && <Field label="Machine code (blank = auto SKYLYF-001...)"><input name="code" maxLength="30" defaultValue={r.nickname || ''} placeholder="PC-11" /></Field>}
        </Modal>
      )}
      {dialog?.kind === 'register' && <RegisterMachine onClose={close} onDone={() => { close(); state.reload(); }} />}
      {dialog?.kind === 'reject' && (
        <Modal title={`Reject ${r.model}?`} submitText="Reject" danger onClose={close}
          onSubmit={async () => { await api(`/admin/registrations/${r.id}`, { method: 'PATCH', body: { status: 'rejected' } }); close(); state.reload(); }}>
          <p>{r.company} will see this request as rejected.</p>
        </Modal>
      )}
      {dialog?.kind === 'key' && (
        <Modal title="Machine approved" submitText="Done" onSubmit={async () => close()} onClose={close}>
          <p>The machine now shows in the owner&apos;s app.</p>
          {dialog.machines?.length > 0 && <><p>Give each device key to its gateway (header <code>x-api-key</code>). Shown only once.</p>{dialog.machines.map((m) => <div key={m.id}><b>{m.code}</b><div className="key">{m.deviceKey}</div></div>)}</>}
        </Modal>
      )}
    </>
  );
}
