import { useState } from 'react';
import { api } from '../api/client.js';
import { useApi } from '../api/useApi.js';
import Modal, { Field } from './Modal.jsx';
import SpecFields, { checkSpec } from './SpecFields.jsx';

// EDIT a machine that belongs to a client (code, status, details). New machines are created by registering a model to a client.
export default function EditMachine({ machine: m, onClose, onDone }) {
  const types = useApi('/admin/machine-types').data ?? [];
  const [type, setType] = useState(m.typeKey); // decides which size / speed / paper inputs show
  return (
    <Modal title={`Edit ${m.code}`} submitText="Save" onClose={onClose}
      onSubmit={async (f) => {
        const problem = checkSpec(f, f.typeKey);
        if (problem) throw new Error(problem);
        const body = { ...f };
        if (f.price === '') delete body.price; // empty = keep
        await api(`/admin/machines/${m._id}`, { method: 'PATCH', body });
        onDone();
      }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 16 }}>
        <Field label="Machine name"><input name="name" required minLength="2" maxLength="80" defaultValue={m.name || m.model || m.code} /></Field>
        <Field label="Machine code"><input name="code" required maxLength="30" defaultValue={m.code} /></Field>
        <Field label="Type"><select name="typeKey" required value={type} onChange={(e) => setType(e.target.value)}>{types.map((t) => <option key={t.key} value={t.key}>{t.name}</option>)}</select></Field>
        <Field label="Machine model"><input name="model" maxLength="40" defaultValue={m.model} /></Field>
        <Field label="Price (₹)"><input name="price" type="number" min="0" step="0.01" defaultValue={m.price ?? ''} /></Field>
        <Field label="Status"><select name="status" defaultValue={m.status}>{['running', 'stopped', 'idle'].map((x) => <option key={x}>{x}</option>)}</select></Field>
      </div>
      <SpecFields type={type} spec={type === m.typeKey ? m.spec : null} />
      <Field label="Description"><textarea name="description" rows="3" maxLength="1000" defaultValue={m.description} /></Field>
    </Modal>
  );
}
