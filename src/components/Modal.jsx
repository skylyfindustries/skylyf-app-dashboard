// Form dialog. onSubmit gets the form values as an object (and the raw FormData as 2nd argument).
// Every submit asks "are you sure?" first, then shows a success or failure dialog:
//   confirm={false}  skip the question (the dialog itself already is one, e.g. delete)
//   success={false}  skip the success dialog (the caller shows its own result, e.g. the device key screen); a message string replaces the default text
// A dialog whose button is "Done" is only an info screen and is left alone.
import { useState } from "react";
import { ask, tell } from "./Feedback.jsx";

export default function Modal({
  title,
  submitText = "Save",
  danger,
  wide,
  confirm = true,
  success,
  onSubmit,
  onClose,
  children,
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const info = submitText === "Done";

  async function submit(e) {
    e.preventDefault();
    const form = e.target;
    setError("");
    if (
      !info &&
      confirm &&
      !(await ask({
        title,
        message: `Do you want to ${submitText.toLowerCase()}?`,
        action: `Yes, ${submitText.toLowerCase()}`,
        danger,
      }))
    )
      return;
    setBusy(true);
    try {
      const fd = new FormData(form);
      await onSubmit(Object.fromEntries(fd), fd);
      if (!info && success !== false)
        tell({
          ok: true,
          title,
          message: success || "Completed successfully.",
        });
    } catch (err) {
      setError(err.message);
      if (!info) tell({ ok: false, title, message: err.message });
    }
    setBusy(false);
  }

  return (
    <div
      className="backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <form className={`modal card${wide ? " wide" : ""}`} onSubmit={submit}>
        <h2>{title}</h2>
        {children}
        <p className="err">{error}</p>
        <div className="row">
          <button className={danger ? "danger" : ""} disabled={busy}>
            {submitText}
          </button>
          <button type="button" className="alt" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

export const Field = ({ label, children }) => (
  <label>
    {label}
    {children}
  </label>
);

// "Are you sure?" dialog for deletes and other destructive actions: it is the confirmation, so no second question.
export const Confirm = ({
  title,
  text,
  action = "Delete",
  success,
  onConfirm,
  onClose,
}) => (
  <Modal
    title={title}
    submitText={action}
    danger
    confirm={false}
    success={success}
    onSubmit={onConfirm}
    onClose={onClose}
  >
    <p>{text}</p>
  </Modal>
);
