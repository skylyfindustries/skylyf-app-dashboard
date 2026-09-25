import { api } from '../api/client.js';
import Modal, { Field } from './Modal.jsx';

// Set units in stock per machine type.
export default function StockModal({ inventory, onClose, onDone }) {
  const save = async (f) => {
    await Promise.all(inventory.map((t) => api(`/admin/machine-types/${t.key}/stock`, { method: 'PATCH', body: { stock: f[t.key] } })));
    onDone();
  };
  return (
    <Modal title="Update available stock" onSubmit={save} onClose={onClose}>
      {inventory.map((t) => <Field key={t.key} label={t.name}><input name={t.key} type="number" min="0" defaultValue={t.available} /></Field>)}
    </Modal>
  );
}
