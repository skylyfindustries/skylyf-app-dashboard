import {
  Boxes,
  CirclePause,
  CirclePlay,
  Factory,
  Gauge,
  OctagonX,
  Users,
} from "lucide-react";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useApi } from "../api/useApi.js";
import ExportMenu from "../components/ExportMenu.jsx";
import ImportMachines from "../components/ImportMachines.jsx";
import MachineTable from "../components/MachineTable.jsx";
import { useMachineActions } from "../components/useMachineActions.jsx";
import { fmt } from "../api/format.js";
import { Stats } from "../components/pageStats.jsx";
import { Async } from "../components/ui.jsx";

export default function Machines() {
  const [params, setParams] = useSearchParams();
  const [importing, setImporting] = useState(false);
  const clients = useApi("/admin/clients").data ?? [];
  const state = useApi(`/admin/machines${params.size ? `?${params}` : ""}`);
  // the summary always covers the whole fleet, whatever the filters below are set to
  const fleet = useApi("/admin/machines");
  const reload = () => {
    state.reload();
    fleet.reload();
  };
  const machines = useMachineActions(reload);

  const filter = (key) => (e) => {
    const next = new URLSearchParams(params);
    e.target.value ? next.set(key, e.target.value) : next.delete(key);
    setParams(next);
  };

  return (
    <>
      <div className="row">
        <h1>Client machines</h1>
        <select
          value={params.get("companyId") ?? ""}
          onChange={filter("companyId")}
        >
          <option value="">All clients</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select value={params.get("status") ?? ""} onChange={filter("status")}>
          <option value="">Any status</option>
          {["running", "stopped", "idle"].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <ExportMenu id="machines" />
        <button className="alt" onClick={() => setImporting(true)}>
          Import
        </button>
      </div>
      <Summary machines={fleet.data ?? []} />
      <Async state={state}>
        {(list) => (
          <div className="card">
            <MachineTable machines={list} actions={machines.actions} />
          </div>
        )}
      </Async>
      {importing && (
        <ImportMachines
          onClose={() => setImporting(false)}
          onDone={() => {
            setImporting(false);
            reload();
          }}
        />
      )}
      {machines.element}
    </>
  );
}

// Fleet summary cards: machines at clients (by status) and today's numbers.
function Summary({ machines }) {
  const placed = machines;
  const count = (status) => placed.filter((m) => m.status === status).length;
  const produced = placed.reduce((n, m) => n + (m.todayProduction ?? 0), 0);
  const live = placed.filter((m) => m.status === "running" && m.efficiency > 0);
  const eff = live.length
    ? Math.round(live.reduce((n, m) => n + m.efficiency, 0) / live.length)
    : 0;
  const clients = new Set(placed.map((m) => String(m.companyId))).size;
  return (
    <Stats
      items={[
        [Factory, placed.length, "Machines at clients"],
        [CirclePlay, count("running"), "Running", "running"],
        [OctagonX, count("stopped"), "Stopped", "stopped"],
        [CirclePause, count("idle"), "Idle", "idle"],
        [Users, clients, "Clients with machines"],
        [Boxes, fmt(produced), "Produced today"],
        [Gauge, `${eff}%`, "Avg efficiency (running)"],
      ]}
    />
  );
}
