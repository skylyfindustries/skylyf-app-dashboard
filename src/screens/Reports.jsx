import { FileSpreadsheet, FileText } from "lucide-react";
import { useState } from "react";
import { exportReport } from "../api/exporter.js";
import { REPORTS } from "../api/reports.js";
import { useApi } from "../api/useApi.js";

// One card per report; each downloads as Excel or PDF.
export default function Reports() {
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [client, setClient] = useState("");
  const clients = useApi("/admin/clients").data ?? [];
  const run = async (id, fmt) => {
    setBusy(id + fmt);
    setError("");
    try {
      await exportReport(id, fmt, client);
    } catch (e) {
      setError(e.message);
    }
    setBusy("");
  };
  return (
    <>
      <h1>Reports</h1>
      <label className="muted">
        Client (company owner)
        <select value={client} onChange={(e) => setClient(e.target.value)}>
          <option value="">All clients</option>
          {clients.map((c) => (
            <option key={c.id} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <p className="err">{error}</p>
      <div className="three reveal">
        {REPORTS.map(({ id, label, desc, icon: Icon }) => (
          <div key={id} className="card report">
            <div className="chip">
              <Icon size={20} />
            </div>
            <div>
              <h2>{label}</h2>
              <p className="muted">{desc}</p>
            </div>
            <div className="row tight">
              <button
                className="alt"
                disabled={!!busy}
                onClick={() => run(id, "xlsx")}
              >
                <FileSpreadsheet size={15} />{" "}
                {busy === `${id}xlsx` ? "Preparing…" : "Excel"}
              </button>
              <button
                className="alt"
                disabled={!!busy}
                onClick={() => run(id, "pdf")}
              >
                <FileText size={15} />{" "}
                {busy === `${id}pdf` ? "Preparing…" : "PDF"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
