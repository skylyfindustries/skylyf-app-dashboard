import { useState } from 'react';
import { api } from '../api/client.js';
import { useApi } from '../api/useApi.js';
import Modal, { Field } from './Modal.jsx';

// Two steps: the form, then the one-time device key.
export default function RegisterMachine({ companyId, onClose, onDone }) {
  const clients = useApi('/admin/clients').data ?? [];
  const types = useApi('/admin/machine-types').data ?? [];
  const [created, setCreated] = useState(null);

  if (created) {
    return (
      <Modal title={`${created.code} registered`} submitText="Done" onSubmit={async () => onDone()} onClose={onDone}>
        <p>Give this device key to the gateway (header <code>x-api-key</code>). It is shown only once.</p>
        <div className="key">{created.deviceKey}</div>
      </Modal>
    );
  }
  return (
    <Modal title="Register machine" submitText="Register" onClose={onClose}
      onSubmit={async (f) => setCreated(await api('/admin/machines', { method: 'POST', body: f }))}>
      <Field label="Client">
        <select name="companyId" required defaultValue={companyId}>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </Field>
      <Field label="Machine code"><input name="code" required placeholder="PC-11" /></Field>
      <Field label="Type"><select name="typeKey">{types.map((t) => <option key={t.key} value={t.key}>{t.name}</option>)}</select></Field>
      <Field label="Model"><input name="model" /></Field>
      <Field label="Daily target"><input name="todayTarget" type="number" min="0" defaultValue="0" /></Field>
    </Modal>
  );
}
