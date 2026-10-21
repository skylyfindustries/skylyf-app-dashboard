import { useState } from "react";
import { api } from "../api/client.js";
import { useApi } from "../api/useApi.js";
import Modal, { Field } from "./Modal.jsx";

// REGISTER machines a client already bought: pick the client and the machine, say how many pieces.
// Each piece joins the client's fleet at once with its own unique code and device key (shown once).
export default function RegisterMachine({ onClose, onDone }) {
  const clients = useApi("/admin/clients").data ?? [];
  const models = useApi("/admin/catalog").data ?? [];
  const [done, setDone] = useState(null);

  if (done) {
    const list = done.machines ?? [];
    return (
      <Modal
        title={
          list.length > 1
            ? `${list.length} machines registered`
            : `${list[0]?.code} registered`
        }
        submitText="Done"
        onSubmit={async () => onDone()}
        onClose={onDone}
      >
        <p>
          They now show in the client&apos;s app. Give each device key to its
          gateway (header <code>x-api-key</code>). Shown only once.
        </p>
        {list.map((m) => (
          <div key={m.id}>
            <b>{m.code}</b>
            <div className="key">{m.deviceKey}</div>
          </div>
        ))}
      </Modal>
    );
  }
  return (
    <Modal
      title="Register machines for a client"
      submitText="Register"
      success={false}
      onClose={onClose}
      onSubmit={async (f) =>
        setDone(
          await api("/admin/registrations", {
            method: "POST",
            body: {
              companyId: f.companyId,
              catalogId: f.catalogId,
              qty: Number(f.qty) || 1,
              ...(f.code && { code: f.code }),
              ...(f.serial && { serial: f.serial }),
            },
          }),
        )
      }
    >
      {models.length === 0 && (
        <p className="muted">
          No machines yet. Add them in the <b>Machines</b> screen first.
        </p>
      )}
      <Field label="Client">
        <select name="companyId" required>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Machine">
        <select name="catalogId" required>
          {models.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} {m.model}
            </option>
          ))}
        </select>
      </Field>
      <Field label="How many pieces (each gets its own unique code)">
        <input name="qty" type="number" min="1" max="50" defaultValue="1" />
      </Field>
      <Field label="Serial number (optional)">
        <input name="serial" maxLength="40" />
      </Field>
      <Field label="Machine code (optional, single piece only; blank = auto SKYLYF-001...)">
        <input name="code" maxLength="30" />
      </Field>
    </Modal>
  );
}
