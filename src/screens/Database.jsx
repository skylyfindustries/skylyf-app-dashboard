import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client.js";
import { useApi } from "../api/useApi.js";
import Modal, { Confirm, Field } from "../components/Modal.jsx";
import { Async } from "../components/ui.jsx";

// Raw editor for every collection of both databases (Skylyf + factory CRM).
// Documents are Extended JSON: {"$oid": "..."} for ids, {"$date": "..."} for dates. Password hashes show as ••••••
// and are kept unless you type a new password.
const short = (v) => {
  if (v && typeof v === "object") {
    if (v.$oid) return v.$oid;
    if (v.$date) return String(v.$date).slice(0, 19).replace("T", " ");
    return JSON.stringify(v).slice(0, 40);
  }
  return String(v ?? "");
};
const idOf = (d) => d._id?.$oid ?? String(d._id);

export default function Database() {
  const meta = useApi("/admin/db");
  const [sel, setSel] = useState({ db: "skylyf", col: "users" });
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState("");
  const [applied, setApplied] = useState("");
  const [dialog, setDialog] = useState(null); // { kind: 'edit' | 'new' | 'delete', doc? }

  useEffect(() => setPage(1), [sel, applied]);
  const q = `?page=${page}${applied ? `&filter=${encodeURIComponent(applied)}` : ""}`;
  const rows = useApi(`/admin/db/${sel.db}/${sel.col}${q}`);
  const base = `/admin/db/${sel.db}/${sel.col}`;
  const done = () => {
    setDialog(null);
    rows.reload();
    meta.reload();
  };

  const parse = (text) => {
    try {
      return JSON.parse(text);
    } catch {
      throw new Error("That is not valid JSON");
    }
  };

  return (
    <>
      <div className="row">
        <h1>Database</h1>
        <button onClick={() => setDialog({ kind: "new" })}>+ New document</button>
      </div>
      <p className="muted">
        Every collection can be edited here. Changes apply immediately. Dates and ids use Extended JSON (<code>{'{"$oid":"…"}'}</code>,{" "}
        <code>{'{"$date":"…"}'}</code>).
      </p>
      <Async state={meta}>
        {(dbs) => (
          <div className="row">
            <select
              value={`${sel.db}/${sel.col}`}
              onChange={(e) => {
                const [db, col] = e.target.value.split("/");
                setSel({ db, col });
                setFilter("");
                setApplied("");
              }}
            >
              {dbs.map((d) => (
                <optgroup key={d.key} label={d.label}>
                  {d.collections.map((c) => (
                    <option key={c.name} value={`${d.key}/${c.name}`}>
                      {c.name} ({c.count})
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <input
              style={{ flex: 1, minWidth: 220 }}
              placeholder={'Filter (JSON), e.g. {"role":"admin"}'}
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && setApplied(filter.trim())}
            />
            <button className="alt" onClick={() => setApplied(filter.trim())}>
              Apply
            </button>
          </div>
        )}
      </Async>
      <Async state={rows}>
        {({ docs, total, pageSize }) => (
          <Table
            docs={docs}
            total={total}
            page={page}
            pageSize={pageSize}
            setPage={setPage}
            onEdit={(doc) => setDialog({ kind: "edit", doc })}
            onDelete={(doc) => setDialog({ kind: "delete", doc })}
          />
        )}
      </Async>

      {(dialog?.kind === "edit" || dialog?.kind === "new") && (
        <Modal
          wide
          title={dialog.kind === "new" ? `New ${sel.col} document` : `Edit ${sel.col} document`}
          onClose={() => setDialog(null)}
          onSubmit={async (v) => {
            const body = { doc: parse(v.doc), newPassword: v.newPassword || undefined };
            if (dialog.kind === "new") await api(base, { method: "POST", body });
            else await api(`${base}/${idOf(dialog.doc)}`, { method: "PUT", body });
            done();
          }}
        >
          <Field label="Document (JSON)">
            <textarea
              name="doc"
              rows={18}
              spellCheck={false}
              style={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 13, width: "100%" }}
              defaultValue={JSON.stringify(dialog.doc ?? {}, null, 2)}
            />
          </Field>
          {sel.col === "users" && (
            <Field label="New password (leave empty to keep the current one)">
              <input name="newPassword" type="text" autoComplete="off" />
            </Field>
          )}
        </Modal>
      )}
      {dialog?.kind === "delete" && (
        <Confirm
          title="Delete document"
          text={`Permanently delete ${idOf(dialog.doc)} from ${sel.col}? This cannot be undone.`}
          onClose={() => setDialog(null)}
          onConfirm={async () => {
            await api(`${base}/${idOf(dialog.doc)}`, { method: "DELETE" });
            done();
          }}
        />
      )}
    </>
  );
}

function Table({ docs, total, page, pageSize, setPage, onEdit, onDelete }) {
  // first few scalar-ish keys seen across the page become columns
  const cols = useMemo(() => {
    const seen = [];
    for (const d of docs)
      for (const k of Object.keys(d))
        if (k !== "_id" && !seen.includes(k) && !/^(__v|createdAt|updatedAt)$/.test(k)) seen.push(k);
    return seen.slice(0, 5);
  }, [docs]);
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="card tablewrap">
      <table>
        <thead>
          <tr>
            <th>_id</th>
            {cols.map((c) => (
              <th key={c}>{c}</th>
            ))}
            <th />
          </tr>
        </thead>
        <tbody>
          {docs.map((d) => (
            <tr key={idOf(d)}>
              <td>{idOf(d)}</td>
              {cols.map((c) => (
                <td key={c} style={{ maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {short(d[c])}
                </td>
              ))}
              <td style={{ whiteSpace: "nowrap" }}>
                <button className="alt" onClick={() => onEdit(d)}>
                  Edit
                </button>{" "}
                <button className="danger" onClick={() => onDelete(d)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
          {!docs.length && (
            <tr>
              <td colSpan={cols.length + 2}>No documents.</td>
            </tr>
          )}
        </tbody>
      </table>
      <div className="row">
        <span className="muted">
          {total} documents · page {page} of {pages}
        </span>
        <button className="alt" disabled={page <= 1} onClick={() => setPage(page - 1)}>
          Prev
        </button>
        <button className="alt" disabled={page >= pages} onClick={() => setPage(page + 1)}>
          Next
        </button>
      </div>
    </div>
  );
}
