import { Download } from "lucide-react";
import { useState } from "react";
import { readSheet } from "read-excel-file/browser";
import { api } from "../api/client.js";
import { download } from "../api/exporter.js";
import Modal, { Field } from "./Modal.jsx";

const COLS = ["Client", "Code", "Type", "Model", "Daily target"];
const sample = {
  title: "Machine import template",
  name: "skylyf-machine-import-template",
  cols: COLS,
  rows: [["ABC INDUSTRIES", "PC-11", "paper_cup", "SKY-PC 180", 5000]],
};

// Bulk-register machines from an .xlsx (Client name, Code, Type key, Model, Daily target).
// Device keys are only ever shown once, so the result offers them as a download.
export default function ImportMachines({ onClose, onDone }) {
  const [result, setResult] = useState(null);

  async function run({ file }) {
    if (!file?.size) throw new Error("Choose an .xlsx file");
    const [head, ...body] = await readSheet(file);
    const at = Object.fromEntries(
      (head ?? []).map((h, i) => [String(h).trim().toLowerCase(), i]),
    );
    if (COLS.slice(0, 3).some((c) => at[c.toLowerCase()] == null))
      throw new Error(`First row must have columns: ${COLS.join(", ")}`);
    const clients = await api("/admin/clients");
    const out = [];
    for (const r of body.filter((r) => r.some((v) => v != null))) {
      const get = (c) => r[at[c.toLowerCase()]] ?? "";
      const client = clients.find(
        (c) =>
          c.name.toLowerCase() === String(get("Client")).trim().toLowerCase(),
      );
      try {
        if (!client) throw new Error(`Unknown client "${get("Client")}"`);
        const m = await api("/admin/machines", {
          method: "POST",
          body: {
            companyId: client.id,
            code: String(get("Code")),
            typeKey: String(get("Type")),
            name: String(get("Model")) || String(get("Code")),
            model: String(get("Model")) || undefined,
            todayTarget: Number(get("Daily target")) || 0,
          },
        });
        out.push([get("Client"), m.code, "Registered", m.deviceKey]);
      } catch (e) {
        out.push([get("Client"), get("Code"), `Failed: ${e.message}`, ""]);
      }
    }
    setResult(out);
  }

  if (result) {
    const ok = result.filter((r) => r[2] === "Registered").length;
    return (
      <Modal
        title="Import finished"
        submitText="Done"
        onSubmit={async () => onDone()}
        onClose={onDone}
      >
        <p>
          {ok} registered, {result.length - ok} failed.
        </p>
        <ul className="log">
          {result
            .filter((r) => r[2] !== "Registered")
            .map((r, i) => (
              <li key={i}>
                {r[1]} <small>{r[2]}</small>
              </li>
            ))}
        </ul>
        {ok > 0 && (
          <button
            type="button"
            className="alt"
            onClick={() =>
              download(
                {
                  title: "Device keys",
                  name: "skylyf-device-keys",
                  cols: ["Client", "Code", "Result", "Device key"],
                  rows: result,
                },
                "xlsx",
              )
            }
          >
            <Download size={15} /> Download device keys (shown only once)
          </button>
        )}
      </Modal>
    );
  }
  return (
    <Modal
      title="Import machines"
      submitText="Import"
      success={false}
      onSubmit={run}
      onClose={onClose}
    >
      <p className="muted">
        Excel file with columns: {COLS.join(", ")}. The client must already
        exist; Type is the type key (e.g. paper_cup).
      </p>
      <button
        type="button"
        className="alt"
        onClick={() => download(sample, "xlsx")}
      >
        <Download size={15} /> Download template
      </button>
      <Field label="File">
        <input type="file" name="file" accept=".xlsx" required />
      </Field>
    </Modal>
  );
}
