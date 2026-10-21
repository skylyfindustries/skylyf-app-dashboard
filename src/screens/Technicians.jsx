import { Building2, Clock, FileText, Mail, Phone } from "lucide-react";
import { useState } from "react";
import { api, download, photoUrl } from "../api/client.js";
import { useApi } from "../api/useApi.js";
import { EditDelete } from "../components/Actions.jsx";
import Modal, { Confirm, Field } from "../components/Modal.jsx";
import { ask, tell } from "../components/Feedback.jsx";
import { Stats, techniciansStats } from "../components/pageStats.jsx";
import { Async, Ic } from "../components/ui.jsx";

const DIALS = [
  ["+91", "India"],
  ["+1", "USA / Canada"],
  ["+44", "UK"],
  ["+971", "UAE"],
  ["+966", "Saudi Arabia"],
  ["+65", "Singapore"],
  ["+61", "Australia"],
  ["+92", "Pakistan"],
  ["+880", "Bangladesh"],
  ["+977", "Nepal"],
  ["+94", "Sri Lanka"],
];
const MAX_DOCS = 5;
const PHOTO_BYTES = 2 * 1024 * 1024;
const DOC_BYTES = 5 * 1024 * 1024;
const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
const DOC_TYPES = ["application/pdf", "image/jpeg", "image/png"];

const initials = (t) =>
  `${t.firstName?.[0] ?? ""}${t.lastName?.[0] ?? ""}`.toUpperCase() || "?";
const Avatar = ({ t }) =>
  t.photo ? (
    <img className="avatar" src={photoUrl(t.photo)} alt="" />
  ) : (
    <span className="avatar">{initials(t)}</span>
  );

// national digits from a stored +E.164 number, split by the known dial codes (longest first)
const splitPhone = (p = "") => {
  const d =
    [...DIALS]
      .sort((a, b) => b[0].length - a[0].length)
      .find(([c]) => p.startsWith(c))?.[0] ?? "+91";
  return [d, p.startsWith(d) ? p.slice(d.length) : p.replace(/\D/g, "")];
};

// Skylyf service technicians: full profile, photo and (private) documents. Each technician works for one client.
export default function Technicians() {
  const state = useApi("/admin/technicians");
  const clients = useApi("/admin/clients").data ?? [];
  const [dialog, setDialog] = useState(null); // { kind: 'add' | 'edit' | 'delete', t? }
  const close = () => setDialog(null);
  const done = () => {
    close();
    state.reload();
  };

  return (
    <>
      <div className="row">
        <h1>Technicians</h1>
        <button onClick={() => setDialog({ kind: "add" })}>
          + Add technician
        </button>
      </div>
      <Async state={state}>
        {(list) => (
          <>
            <Stats items={techniciansStats(list)} />
            <div className="card tablewrap">
              <table>
                <thead>
                  <tr>
                    <th>Technician</th>
                    <th>Client</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Shift</th>
                    <th>Documents</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {list.map((t) => (
                    <tr key={t.id}>
                      <td>
                        <div className="mcell">
                          <Avatar t={t} />
                          <div>
                            <b>{t.name}</b>
                            <br />
                            <small>
                              {t.address.city}
                              {t.address.state ? `, ${t.address.state}` : ""}
                            </small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <Ic icon={Building2}>{t.company}</Ic>
                      </td>
                      <td>
                        <Ic icon={Mail}>{t.email}</Ic>
                      </td>
                      <td>
                        <Ic icon={Phone}>{t.phone}</Ic>
                      </td>
                      <td>
                        <Ic icon={Clock}>
                          {t.shift.start && `${t.shift.start} – ${t.shift.end}`}
                        </Ic>
                      </td>
                      <td>
                        <Ic icon={FileText}>{t.documents.length}</Ic>
                      </td>
                      <td>
                        <EditDelete
                          onEdit={() => setDialog({ kind: "edit", t })}
                          onDelete={() => setDialog({ kind: "delete", t })}
                        />
                      </td>
                    </tr>
                  ))}
                  {!list.length && (
                    <tr>
                      <td colSpan="7">No technicians yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Async>

      {(dialog?.kind === "add" || dialog?.kind === "edit") && (
        <TechnicianForm
          t={dialog.t}
          clients={clients}
          onClose={close}
          onDone={done}
        />
      )}
      {dialog?.kind === "delete" && (
        <Confirm
          title={`Delete ${dialog.t.name}?`}
          text="Their login, photo and uploaded documents are removed. Open tickets assigned to them become unassigned."
          onClose={close}
          onConfirm={async () => {
            await api(`/admin/technicians/${dialog.t.id}`, {
              method: "DELETE",
            });
            done();
          }}
        />
      )}
    </>
  );
}

function TechnicianForm({ t, clients, onClose, onDone }) {
  const editing = !!t;
  const [docs, setDocs] = useState(t?.documents ?? []);
  const [dial, national] = splitPhone(t?.phone);
  const drop = async (file) => {
    const title = "Delete document";
    if (
      !(await ask({
        title,
        message: "This document will be removed. Do you want to continue?",
        action: "Yes, delete",
        danger: true,
      }))
    )
      return;
    try {
      await api(`/admin/technicians/${t.id}/documents/${file}`, {
        method: "DELETE",
      });
      setDocs(docs.filter((d) => d.file !== file));
      tell({ ok: true, title, message: "Document deleted." });
    } catch (err) {
      tell({ ok: false, title, message: err.message });
    }
  };

  return (
    <Modal
      title={editing ? `Edit ${t.name}` : "Add technician"}
      submitText={editing ? "Save" : "Add"}
      wide
      onClose={onClose}
      onSubmit={async (_f, fd) => {
        // files: check here so the error shows before anything is uploaded
        const photo = fd.get("photo");
        if (photo?.size) {
          if (!PHOTO_TYPES.includes(photo.type) || photo.size > PHOTO_BYTES)
            throw new Error("Photo must be JPG, PNG or WebP and at most 2 MB");
        } else fd.delete("photo");
        const picked = fd.getAll("documents").filter((d) => d.size);
        fd.delete("documents");
        if (picked.length + docs.length > MAX_DOCS)
          throw new Error(`At most ${MAX_DOCS} documents in total`);
        const bad = picked.find(
          (d) => !DOC_TYPES.includes(d.type) || d.size > DOC_BYTES,
        );
        if (bad)
          throw new Error(
            `${bad.name}: documents must be PDF, JPG or PNG and at most 5 MB`,
          );
        picked.forEach((d) => fd.append("documents", d));
        if (editing)
          for (const [k, v] of [...fd.entries()]) if (v === "") fd.delete(k); // blank = leave unchanged (e.g. password)
        await api(
          editing ? `/admin/technicians/${t.id}` : "/admin/technicians",
          { method: editing ? "PATCH" : "POST", body: fd },
        );
        onDone();
      }}
    >
      <Field label="Photo (JPG, PNG or WebP, max 2 MB)">
        <div className="row">
          {t && <Avatar t={t} />}
          <input
            name="photo"
            type="file"
            accept="image/jpeg,image/png,image/webp"
          />
        </div>
      </Field>
      <div className="grid2">
        <Field label="First name">
          <input
            name="firstName"
            required
            maxLength="40"
            defaultValue={t?.firstName}
          />
        </Field>
        <Field label="Last name">
          <input
            name="lastName"
            required
            maxLength="40"
            defaultValue={t?.lastName}
          />
        </Field>
        <Field label="Email">
          <input
            name="email"
            type="email"
            required
            maxLength="254"
            defaultValue={t?.email}
          />
        </Field>
        <Field
          label={editing ? "New password (leave blank to keep)" : "Password"}
        >
          <input
            name="password"
            type="password"
            required={!editing}
            minLength="8"
            maxLength="64"
            autoComplete="new-password"
            pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])\S{8,64}"
            title="8–64 characters with upper and lower case, a number and a symbol, no spaces"
          />
        </Field>
        <Field label="Phone">
          <div className="phonerow">
            <select name="countryCode" defaultValue={dial}>
              {DIALS.map(([c, n]) => (
                <option key={c + n} value={c}>
                  {c} {n}
                </option>
              ))}
            </select>
            <input
              name="phone"
              type="tel"
              required
              inputMode="numeric"
              pattern="[0-9 ]{4,16}"
              maxLength="16"
              defaultValue={national}
              placeholder="98100 22222"
            />
          </div>
        </Field>
        <Field label="Date of birth">
          <input
            name="dob"
            type="date"
            required
            defaultValue={t?.dob}
            max={new Date(Date.now() - 18 * 365.25 * 864e5)
              .toISOString()
              .slice(0, 10)}
          />
        </Field>
      </div>
      <Field label="Client">
        <select name="companyId" required defaultValue={t?.companyId}>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Street address">
        <input
          name="street"
          required
          minLength="3"
          maxLength="120"
          defaultValue={t?.address.street}
        />
      </Field>
      <div className="grid2">
        <Field label="City">
          <input
            name="city"
            required
            maxLength="60"
            defaultValue={t?.address.city}
          />
        </Field>
        <Field label="State">
          <input
            name="state"
            required
            maxLength="60"
            defaultValue={t?.address.state}
          />
        </Field>
        <Field label="Zip code">
          <input
            name="zip"
            required
            maxLength="11"
            defaultValue={t?.address.zip}
          />
        </Field>
        <Field label="Shift starts">
          <input
            name="shiftStart"
            type="time"
            required
            defaultValue={t?.shift.start || "09:00"}
          />
        </Field>
        <Field label="Shift ends">
          <input
            name="shiftEnd"
            type="time"
            required
            defaultValue={t?.shift.end || "18:00"}
          />
        </Field>
      </div>
      <Field
        label={`Documents (optional, up to ${MAX_DOCS}: PDF, JPG or PNG, max 5 MB each)`}
      >
        <input
          name="documents"
          type="file"
          multiple
          accept="application/pdf,image/jpeg,image/png"
        />
      </Field>
      {docs.length > 0 && (
        <ul className="doclist">
          {docs.map((d) => (
            <li key={d.file}>
              <button
                type="button"
                className="link"
                onClick={() =>
                  download(
                    `/admin/technicians/${t.id}/documents/${d.file}`,
                    d.name,
                  ).catch((e) => alert(e.message))
                }
              >
                {d.name}
              </button>
              <button
                type="button"
                className="link danger"
                onClick={() => drop(d.file).catch((e) => alert(e.message))}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
