import {
  Building2,
  Calendar,
  CircleCheck,
  Hash,
  Hourglass,
  LifeBuoy,
  Wallet,
  Wrench,
} from "lucide-react";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api, photoUrl } from "../api/client.js";
import { date, fmt, label } from "../api/format.js";
import { useApi } from "../api/useApi.js";
import Modal, { Confirm, Field } from "../components/Modal.jsx";
import { Stats } from "../components/pageStats.jsx";
import { Async, Ic } from "../components/ui.jsx";

const STATUSES = [
  "submitted",
  "assigned",
  "on_site",
  "awaiting_payment",
  "paid",
  "in_service",
  "completed",
  "cancelled",
];
// status -> tag colour (the shared .tag styles key off these classes)
const TONE = {
  submitted: "stopped",
  assigned: "idle",
  on_site: "idle",
  awaiting_payment: "idle",
  paid: "running",
  in_service: "running",
  completed: "running",
  cancelled: "",
};
const money = (n) => `₹${fmt(n)}`;
const Status = ({ s }) => (
  <span className={`tag ${TONE[s]}`}>{label(s).replace("_", " ")}</span>
);

export default function ServiceRequests() {
  const [params, setParams] = useSearchParams();
  const status = params.get("status") ?? "";
  const state = useApi(`/service-requests${status ? `?status=${status}` : ""}`);
  const every = useApi("/service-requests");
  const [open, setOpen] = useState(null); // request id
  const [dialog, setDialog] = useState(null); // { kind, sr }
  const all = every.data ?? [];
  const n = (...s) => all.filter((r) => s.includes(r.status)).length;
  const refresh = () => {
    state.reload();
    every.reload();
  };

  return (
    <>
      <div className="row">
        <h1>Service requests</h1>
        <select
          value={status}
          onChange={(e) =>
            setParams(e.target.value ? { status: e.target.value } : {})
          }
        >
          <option value="">All</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {label(s).replace("_", " ")}
            </option>
          ))}
        </select>
      </div>
      <Stats
        items={[
          [LifeBuoy, n("submitted"), "New, needs a technician", "stopped"],
          [Wrench, n("assigned", "on_site", "in_service", "paid"), "In progress", "idle"],
          [Wallet, n("awaiting_payment"), "Waiting for payment", "idle"],
          [CircleCheck, n("completed"), "Completed", "running"],
        ]}
      />
      <Async state={state}>
        {(list) => (
          <div className="card tablewrap">
            <table>
              <thead>
                <tr>
                  <th>Raised</th>
                  <th>No.</th>
                  <th>Client</th>
                  <th>Machines</th>
                  <th>Problem</th>
                  <th>Technician</th>
                  <th>Parts / payment</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {list.length === 0 && (
                  <tr>
                    <td colSpan="9">No service requests yet.</td>
                  </tr>
                )}
                {list.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <Ic icon={Calendar}>{date(r.createdAt)}</Ic>
                    </td>
                    <td>
                      <Ic icon={Hash}>{r.number}</Ic>
                    </td>
                    <td>
                      <Ic icon={Building2}>{r.company}</Ic>
                    </td>
                    <td>{r.machines.map((m) => m.code).join(", ")}</td>
                    <td className="wrap">
                      {label(r.category).replace("_", " ")}: {r.description}
                    </td>
                    <td>{r.technician ?? "—"}</td>
                    <td>
                      {r.partsTotal
                        ? `${r.partsIssued}/${r.partsTotal} issued · ${r.payment.status === "paid" ? "paid" : money(r.quote?.total)}`
                        : "—"}
                    </td>
                    <td>
                      <Status s={r.status} />
                    </td>
                    <td>
                      <button className="alt" onClick={() => setOpen(r.id)}>
                        Open
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Async>

      {open && (
        <Detail
          id={open}
          onClose={() => {
            setOpen(null);
            refresh();
          }}
          onAction={(kind, sr) => setDialog({ kind, sr })}
        />
      )}
      {dialog?.kind === "assign" && (
        <Assign
          sr={dialog.sr}
          onClose={() => setDialog(null)}
          onDone={() => {
            setDialog(null);
            refresh();
          }}
        />
      )}
      {dialog?.kind === "paid" && (
        <Modal
          title={`Record payment for ${dialog.sr.number}`}
          submitText="Mark paid"
          onClose={() => setDialog(null)}
          onSubmit={async (f) => {
            await api(`/service-requests/${dialog.sr.id}/mark-paid`, { method: "POST", body: f });
            setDialog(null);
            refresh();
          }}
        >
          <p>
            Client paid {money(dialog.sr.quote?.total)} outside the app (cash / bank transfer)?
          </p>
          <Field label="Reference (optional)">
            <input name="note" maxLength="200" placeholder="UTR / receipt no." />
          </Field>
        </Modal>
      )}
      {dialog?.kind === "cancel" && (
        <Confirm
          title={`Cancel ${dialog.sr.number}?`}
          text="The client and technician are told. This cannot be undone."
          action="Cancel request"
          onConfirm={async () => {
            await api(`/service-requests/${dialog.sr.id}/cancel`, { method: "POST", body: {} });
            setDialog(null);
            refresh();
          }}
          onClose={() => setDialog(null)}
        />
      )}
    </>
  );
}

function Assign({ sr, onClose, onDone }) {
  const techs = useApi(`/service-requests/${sr.id}/technicians`);
  return (
    <Modal
      title={`Assign technician for ${sr.number}`}
      submitText="Assign"
      onClose={onClose}
      onSubmit={async (f) => {
        await api(`/service-requests/${sr.id}/assign`, { method: "POST", body: f });
        onDone();
      }}
    >
      <p>
        Technicians of <b>{sr.company}</b>:
      </p>
      <Field label="Technician">
        <select name="technicianId" required defaultValue={sr.technicianId ?? ""}>
          <option value="" disabled>
            Select
          </option>
          {(techs.data ?? []).map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} {t.phone ? `· ${t.phone}` : ""}
            </option>
          ))}
        </select>
      </Field>
      {techs.data?.length === 0 && (
        <p className="err">This client has no technicians yet. Add one in Technicians first.</p>
      )}
    </Modal>
  );
}

function Detail({ id, onClose, onAction }) {
  const state = useApi(`/service-requests/${id}`);
  const sr = state.data;
  return (
    <div className="backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal card wide" style={{ maxHeight: "90vh", overflowY: "auto" }}>
        {!sr ? (
          <p>Loading…</p>
        ) : (
          <>
            <div className="row">
              <h2 style={{ margin: 0 }}>
                {sr.number} <Status s={sr.status} />
              </h2>
            </div>
            <p>
              <b>{sr.company}</b> · raised by {sr.requestedBy} on {date(sr.createdAt)}
              <br />
              Machines: {sr.machines.map((m) => `${m.code} ${m.name ?? ""}`).join(", ")}
              <br />
              Problem started: {date(sr.startedAt)} · {label(sr.category).replace("_", " ")} · urgency {sr.urgency}
            </p>
            <p style={{ whiteSpace: "pre-wrap" }}>{sr.description}</p>
            {(sr.photos.length > 0 || sr.videos.length > 0) && (
              <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>
                {sr.photos.map((p) => (
                  <a key={p} href={photoUrl(p)} target="_blank" rel="noreferrer">
                    <img src={photoUrl(p)} alt="" style={{ height: 110, borderRadius: 10 }} />
                  </a>
                ))}
                {sr.videos.map((v) => (
                  <video key={v} src={photoUrl(v)} controls style={{ height: 110, borderRadius: 10 }} />
                ))}
              </div>
            )}
            <h3>Technician</h3>
            <p>
              {sr.technician ? `${sr.technician} ${sr.technicianPhone ?? ""}` : "Not assigned yet"}
              {sr.reachedAt && ` · reached ${date(sr.reachedAt)}`}
            </p>
            {sr.parts.length > 0 && (
              <>
                <h3>Spare parts needed</h3>
                <table>
                  <thead>
                    <tr>
                      <th>Part</th>
                      <th>Qty</th>
                      <th>Issued at rack</th>
                      <th>Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sr.parts.map((p) => (
                      <tr key={p.partId}>
                        <td>
                          {p.name} <small>{p.sku}</small>
                        </td>
                        <td>{p.qty}</td>
                        <td>
                          {p.issuedQty}/{p.qty}
                        </td>
                        <td>{money(p.price * p.qty)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {sr.quote && (
                  <p>
                    Subtotal {money(sr.quote.subtotal)} + GST {money(sr.quote.gst)} = <b>{money(sr.quote.total)}</b> ·{" "}
                    {sr.payment.status === "paid" ? `paid (${sr.payment.method}) ${date(sr.payment.paidAt)}` : "unpaid"}
                  </p>
                )}
                {sr.partsNote && <p>Note: {sr.partsNote}</p>}
                {sr.status === "paid" && (
                  <p>
                    <Hourglass size={14} /> Issue these parts in <b>Factory → Rack scan</b> by choosing this service request. The
                    service starts when all parts are issued.
                  </p>
                )}
              </>
            )}
            {sr.report && (
              <>
                <h3>Technician's report</h3>
                <p style={{ whiteSpace: "pre-wrap" }}>
                  {sr.report.workDone}
                  {sr.report.findings && `\n\nFindings: ${sr.report.findings}`}
                  {sr.report.hours != null && `\n\nTime spent: ${sr.report.hours} h`}
                </p>
                <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>
                  {sr.report.photos.map((p) => (
                    <a key={p} href={photoUrl(p)} target="_blank" rel="noreferrer">
                      <img src={photoUrl(p)} alt="" style={{ height: 110, borderRadius: 10 }} />
                    </a>
                  ))}
                </div>
              </>
            )}
            <h3>History</h3>
            <ul>
              {sr.history.map((h, i) => (
                <li key={i}>
                  {date(h.at)} · <b>{label(h.status).replace("_", " ")}</b>
                  {h.byName ? ` · ${h.byName}` : ""}
                  {h.note ? ` · ${h.note}` : ""}
                </li>
              ))}
            </ul>
            <div className="row">
              {["submitted", "assigned"].includes(sr.status) && (
                <button onClick={() => onAction("assign", sr)}>
                  {sr.technician ? "Change technician" : "Assign technician"}
                </button>
              )}
              {sr.status === "awaiting_payment" && (
                <button onClick={() => onAction("paid", sr)}>Record offline payment</button>
              )}
              {["submitted", "assigned", "on_site", "awaiting_payment"].includes(sr.status) && (
                <button className="danger" onClick={() => onAction("cancel", sr)}>
                  Cancel request
                </button>
              )}
              <button className="alt" onClick={onClose}>
                Close
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
