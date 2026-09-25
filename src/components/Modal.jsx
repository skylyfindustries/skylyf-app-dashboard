// Form dialog. onSubmit gets the form values as an object; a thrown error is shown inside the dialog.
import { useState } from 'react';

export default function Modal({ title, submitText = 'Save', danger, onSubmit, onClose, children }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try { await onSubmit(Object.fromEntries(new FormData(e.target))); } catch (err) { setError(err.message); }
    setBusy(false);
  }

  return (
    <div className="backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal card" onSubmit={submit}>
        <h2>{title}</h2>
        {children}
        <p className="err">{error}</p>
        <div className="row">
          <button className={danger ? 'danger' : ''} disabled={busy}>{submitText}</button>
          <button type="button" className="alt" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </div>
  );
}

export const Field = ({ label, children }) => <label>{label}{children}</label>;

// "Are you sure?" dialog for deletes and other destructive actions.
export const Confirm = ({ title, text, action = 'Delete', onConfirm, onClose }) => (
  <Modal title={title} submitText={action} danger onSubmit={onConfirm} onClose={onClose}><p>{text}</p></Modal>
);
