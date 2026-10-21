import { Package, Search } from "lucide-react";
import { useState } from "react";
import { api, photoUrl } from "../api/client.js";
import { useApi } from "../api/useApi.js";
import { EditDelete } from "../components/Actions.jsx";
import Modal, { Confirm, Field } from "../components/Modal.jsx";
import { Async, Stat, Tag } from "../components/ui.jsx";

export const rupees = (n) =>
  `₹${Number(n ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Spare parts Skylyf sells. Owners see the visible ones (with photos and stock) in the mobile app's Parts tab and order them there.
export default function Parts() {
  const state = useApi("/admin/parts");
  const types = useApi("/admin/machine-types").data ?? [];
  const [dialog, setDialog] = useState(null); // { kind: 'add' | 'edit' | 'delete', p? }
  const [q, setQ] = useState("");
  const close = () => setDialog(null);
  const done = () => {
    close();
    state.reload();
  };
  const p = dialog?.p;

  // the form is multipart (photos); checkbox groups are sent as comma lists
  const body = (fd) => {
    const out = new FormData();
    for (const [k, v] of fd)
      if (k !== "removePhotos" && k !== "typeKeys") out.append(k, v);
    out.append("typeKeys", fd.getAll("typeKeys").join(","));
    out.append("removePhotos", fd.getAll("removePhotos").join(","));
    return out;
  };

  const fields = (
    <>
      <Field
        label={`Photos (up to 5, max 2 MB each${p?.photos.length ? `; ${p.photos.length} saved` : ""})`}
      >
        <input
          type="file"
          name="photos"
          accept="image/jpeg,image/png,image/webp"
          multiple
        />
      </Field>
      {p?.photos.length > 0 && (
        <div className="photos">
          {p.photos.map((u) => (
            <label key={u} style={{ display: "grid", gap: 2, fontSize: 11 }}>
              <img src={photoUrl(u)} alt="" />
              <span>
                <input
                  type="checkbox"
                  name="removePhotos"
                  value={u.split("/").pop()}
                />{" "}
                remove
              </span>
            </label>
          ))}
        </div>
      )}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          columnGap: 16,
        }}
      >
        <Field label="Part name">
          <input
            name="name"
            required
            minLength="2"
            maxLength="120"
            defaultValue={p?.name}
            placeholder="Cup Forming Die"
          />
        </Field>
        <Field label="SKU">
          <input
            name="sku"
            required
            maxLength="40"
            defaultValue={p?.sku}
            placeholder="PC-DIE-01"
          />
        </Field>
        <Field label="Price (₹, before GST)">
          <input
            name="price"
            type="number"
            min="0"
            step="0.01"
            required
            defaultValue={p?.price}
          />
        </Field>
        <Field label="Stock (units)">
          <input
            name="stock"
            type="number"
            min="0"
            step="1"
            required
            defaultValue={p?.stock ?? 0}
          />
        </Field>
      </div>
      <Field label="Description">
        <textarea
          name="description"
          rows="3"
          maxLength="1000"
          defaultValue={p?.description}
        />
      </Field>
      <Field label="Fits machine types (none ticked = all)">
        <span style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          {types.map((t) => (
            <label
              key={t.key}
              style={{ display: "flex", gap: 6, alignItems: "center" }}
            >
              <input
                type="checkbox"
                name="typeKeys"
                value={t.key}
                defaultChecked={p?.typeKeys.includes(t.key)}
              />
              {t.name}
            </label>
          ))}
        </span>
      </Field>
      <Field label="Shown in the app">
        <select name="active" defaultValue={String(p?.active ?? true)}>
          <option value="true">Yes</option>
          <option value="false">Hidden</option>
        </select>
      </Field>
    </>
  );

  return (
    <>
      <div className="row">
        <h1>Parts</h1>
        <label className="search">
          <Search size={15} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name or SKU…"
          />
        </label>
        <button onClick={() => setDialog({ kind: "add" })}>+ Add part</button>
      </div>
      <Async state={state}>
        {(list) => {
          const needle = q.trim().toLowerCase();
          const shown = list.filter(
            (x) =>
              !needle || `${x.name} ${x.sku}`.toLowerCase().includes(needle),
          );
          return (
            <>
              <div className="grid stats">
                <Stat icon={Package} value={list.length} text="Parts" />
                <Stat
                  icon={Package}
                  value={list.filter((x) => x.stock === 0).length}
                  text="Out of stock"
                  tone="stopped"
                />
                <Stat
                  icon={Package}
                  value={list.filter((x) => x.stock > 0 && x.stock <= 5).length}
                  text="Low stock (5 or fewer)"
                  tone="idle"
                />
              </div>
              <div className="card tablewrap">
                <table>
                  <thead>
                    <tr>
                      <th>Part</th>
                      <th>SKU</th>
                      <th>Price</th>
                      <th>Stock</th>
                      <th>Fits</th>
                      <th>In app</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {shown.map((x) => (
                      <tr key={x.id}>
                        <td>
                          <div className="mcell">
                            {x.image ? (
                              <img
                                className="mimg photo"
                                src={photoUrl(x.image)}
                                alt=""
                                loading="lazy"
                              />
                            ) : (
                              <span className="mimg" />
                            )}
                            <b>{x.name}</b>
                          </div>
                        </td>
                        <td>{x.sku}</td>
                        <td>{rupees(x.price)}</td>
                        <td>
                          <span
                            className={
                              x.stock === 0
                                ? "stopped"
                                : x.stock <= 5
                                  ? "idle"
                                  : "running"
                            }
                          >
                            {x.stock === 0 ? "Out of stock" : x.stock}
                          </span>
                        </td>
                        <td>
                          {x.typeKeys.length
                            ? x.typeKeys.join(", ")
                            : "All machines"}
                        </td>
                        <td>
                          <Tag status={x.active ? "running" : "idle"} />
                        </td>
                        <td>
                          <EditDelete
                            onEdit={() => setDialog({ kind: "edit", p: x })}
                            onDelete={() => setDialog({ kind: "delete", p: x })}
                          />
                        </td>
                      </tr>
                    ))}
                    {!shown.length && (
                      <tr>
                        <td colSpan="7">
                          {list.length
                            ? "No part matches your search."
                            : "No parts yet. Add the parts you sell so owners can order them in the app."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          );
        }}
      </Async>

      {dialog?.kind === "add" && (
        <Modal
          title="Add part"
          submitText="Add"
          wide
          onClose={close}
          onSubmit={async (_f, fd) => {
            await api("/admin/parts", { method: "POST", body: body(fd) });
            done();
          }}
        >
          {fields}
        </Modal>
      )}
      {dialog?.kind === "edit" && (
        <Modal
          title={`Edit ${p.name}`}
          wide
          onClose={close}
          onSubmit={async (_f, fd) => {
            await api(`/admin/parts/${p.id}`, {
              method: "PATCH",
              body: body(fd),
            });
            done();
          }}
        >
          {fields}
        </Modal>
      )}
      {dialog?.kind === "delete" && (
        <Confirm
          title={`Delete ${p.name}?`}
          text="It disappears from the app. Past orders and invoices keep their own copy."
          onClose={close}
          onConfirm={async () => {
            await api(`/admin/parts/${p.id}`, { method: "DELETE" });
            done();
          }}
        />
      )}
    </>
  );
}
