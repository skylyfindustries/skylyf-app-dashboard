import { Building2, Calendar, Hash, MessageSquare, Reply } from 'lucide-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { date, label } from '../api/format.js';
import { useApi } from '../api/useApi.js';
import { EditDelete } from '../components/Actions.jsx';
import Modal, { Confirm, Field } from '../components/Modal.jsx';
import ExportMenu from '../components/ExportMenu.jsx';
import { Async, Ic, Tag } from '../components/ui.jsx';

const STATUSES = ['open', 'in_progress', 'done'];

export default function Support() {
  const [params, setParams] = useSearchParams();
  const status = params.get('status') ?? '';
  const state = useApi(`/admin/tickets${status ? `?status=${status}` : ''}`);
  const machines = useApi('/admin/machines').data ?? [];
  const [dialog, setDialog] = useState(null); // { kind: 'add' | 'edit' | 'delete', t? }
  const close = () => setDialog(null);
  const done = () => { close(); state.reload(); };

  return (
    <>
      <div className="row">
        <h1>Support</h1>
        <select value={status} onChange={(e) => setParams(e.target.value ? { status: e.target.value } : {})}>
          <option value="">All</option>
          {STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}
        </select>
        <ExportMenu id="support" />
        <button onClick={() => setDialog({ kind: 'add' })}>+ New ticket</button>
      </div>
      <Async state={state}>{(list) => (
        <div className="card tablewrap">
          <table>
            <thead><tr><th>Raised</th><th>Client</th><th>Machine</th><th>Request</th><th>Reply</th><th>Status</th><th /></tr></thead>
            <tbody>
              {list.map((t) => (
                <tr key={t.id}>
                  <td><Ic icon={Calendar}>{date(t.createdAt)}</Ic></td><td><Ic icon={Building2}>{t.client}</Ic></td><td><Ic icon={Hash}>{t.machine}</Ic></td><td className="wrap"><Ic icon={MessageSquare}>{t.note}</Ic></td><td className="wrap">{t.reply && <Ic icon={Reply}>{t.reply}</Ic>}</td>
                  <td><Tag status={t.status} /></td>
                  <td><EditDelete onEdit={() => setDialog({ kind: 'edit', t })} onDelete={() => setDialog({ kind: 'delete', t })} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}</Async>

      {dialog?.kind === 'add' && (
        <Modal title="New support ticket" submitText="Create" onClose={close}
          onSubmit={async (f) => { await api('/admin/tickets', { method: 'POST', body: f }); done(); }}>
          <Field label="Machine">
            <select name="machineId" required>{machines.map((m) => <option key={m._id} value={m._id}>{m.code} — {m.client}</option>)}</select>
          </Field>
          <Field label="Request"><textarea name="note" rows="3" required minLength="3" maxLength="2000" placeholder="What does the client need?" /></Field>
        </Modal>
      )}
      {dialog?.kind === 'edit' && (
        <Modal title="Update ticket" onClose={close}
          onSubmit={async (f) => { await api(`/admin/tickets/${dialog.t.id}`, { method: 'PATCH', body: f }); done(); }}>
          <p className="muted">{dialog.t.client} · {dialog.t.machine}</p>
          <Field label="Request"><textarea name="note" rows="3" required minLength="3" maxLength="2000" defaultValue={dialog.t.note} /></Field>
          <Field label="Status">
            <select name="status" defaultValue={dialog.t.status}>{STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}</select>
          </Field>
          <Field label="Reply to client"><textarea name="reply" rows="4" maxLength="2000" defaultValue={dialog.t.reply} /></Field>
        </Modal>
      )}
      {dialog?.kind === 'delete' && (
        <Confirm title="Delete ticket?" text={`"${dialog.t.note}" (${dialog.t.client}) will be removed.`} onClose={close}
          onConfirm={async () => { await api(`/admin/tickets/${dialog.t.id}`, { method: 'DELETE' }); done(); }} />
      )}
    </>
  );
}
