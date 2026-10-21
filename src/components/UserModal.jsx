import { api } from "../api/client.js";
import Modal, { Field } from "./Modal.jsx";

// Add (no `user`) or edit a client login. Blank password on edit = keep the current one.
export default function UserModal({ companyId, user, onClose, onDone }) {
  const save = async (f) => {
    const body = {
      role: f.role,
      name: f.name,
      email: f.email,
      phone: f.phone,
      ...(f.password && { password: f.password }),
    };
    await (user
      ? api(`/admin/users/${user._id}`, { method: "PATCH", body })
      : api(`/admin/clients/${companyId}/users`, { method: "POST", body }));
    onDone();
  };
  return (
    <Modal
      title={user ? `Edit ${user.name}` : "Add user"}
      onSubmit={save}
      onClose={onClose}
    >
      <Field label="Role">
        <select name="role" defaultValue={user?.role ?? "customer"}>
          <option value="customer">Owner</option>
          <option value="technician">Technician</option>
        </select>
      </Field>
      <Field label="Name">
        <input name="name" required minLength="2" defaultValue={user?.name} />
      </Field>
      <Field label="Login email">
        <input name="email" type="email" required defaultValue={user?.email} />
      </Field>
      <Field label="Phone">
        <input name="phone" defaultValue={user?.phone} />
      </Field>
      <Field
        label={user ? "New password (leave blank to keep)" : "Password (min 8)"}
      >
        <input
          name="password"
          type="password"
          minLength="8"
          required={!user}
          autoComplete="new-password"
        />
      </Field>
    </Modal>
  );
}
