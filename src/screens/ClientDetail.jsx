import {
  Calendar,
  Clock,
  Mail,
  Pencil,
  Phone,
  Trash2,
  User,
  Wrench,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client.js";
import { date, day } from "../api/format.js";
import { useApi } from "../api/useApi.js";
import { EditDelete } from "../components/Actions.jsx";
import MachineTable from "../components/MachineTable.jsx";
import Modal, { Confirm, Field } from "../components/Modal.jsx";
import RegisterMachine from "../components/RegisterMachine.jsx";
import UserModal from "../components/UserModal.jsx";
import { useMachineActions } from "../components/useMachineActions.jsx";
import { Stats, clientDetailStats } from "../components/pageStats.jsx";
import { Async, Ic } from "../components/ui.jsx";

export default function ClientDetail() {
  const { id } = useParams();
  const go = useNavigate();
  const state = useApi(`/admin/clients/${id}`);
  const [dialog, setDialog] = useState(null); // addMachine | editClient | deleteClient | addUser | { kind: 'editUser' | 'deleteUser', u }
  const machines = useMachineActions(state.reload);
  const close = () => setDialog(null);
  const done = () => {
    close();
    state.reload();
  };

  return (
    <Async state={state}>
      {(d) => (
        <>
          <div className="row">
            <h1>{d.company.name}</h1>
            <span>
              <Link to="/clients">← All clients</Link> · Registered{" "}
              {day(d.company.createdAt)}
            </span>
            <button
              className="alt"
              onClick={() => setDialog({ kind: "editClient" })}
            >
              <Pencil size={14} /> Edit
            </button>
            <button
              className="alt"
              onClick={() => setDialog({ kind: "deleteClient" })}
            >
              <Trash2 size={14} /> Delete
            </button>
            <button onClick={() => setDialog({ kind: "addMachine" })}>
              + Register machine
            </button>
          </div>

          <Stats items={clientDetailStats(d.machines, d.users)} />
          <div className="card">
            <h2>Company details</h2>
            <div
              className="grid2"
              style={{
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              }}
            >
              {[
                ["Address", d.company.address],
                ["GSTIN", d.company.gstin],
                ["PAN", d.company.pan],
                ["CIN", d.company.cin],
                ["Udyam", d.company.udyam],
              ].map(([k, v]) => (
                <div key={k}>
                  <small className="hint">{k}</small>
                  <br />
                  {v || "—"}
                </div>
              ))}
            </div>
          </div>
          <br />
          <div className="card">
            <h2>Machines</h2>
            <MachineTable
              machines={d.machines.map((m) => ({
                ...m,
                client: d.company.name,
              }))}
              actions={machines.actions}
            />
          </div>
          <br />
          <div className="card tablewrap">
            <div className="row tight">
              <h2>Users</h2>
              <button
                className="alt"
                onClick={() => setDialog({ kind: "addUser" })}
              >
                + Add user
              </button>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Registered</th>
                  <th>Last login</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {d.users.map((u) => (
                  <tr key={u._id}>
                    <td>
                      <Ic icon={User}>{u.name}</Ic>
                    </td>
                    <td>
                      <Ic icon={u.role === "technician" ? Wrench : ShieldCheck}>
                        {u.role === "technician" ? "Technician" : "Owner"}
                      </Ic>
                    </td>
                    <td>{u.email && <Ic icon={Mail}>{u.email}</Ic>}</td>
                    <td>{u.phone && <Ic icon={Phone}>{u.phone}</Ic>}</td>
                    <td>
                      <Ic icon={Calendar}>{day(u.createdAt)}</Ic>
                    </td>
                    <td>
                      <Ic icon={Clock}>{date(u.lastLoginAt)}</Ic>
                    </td>
                    <td>
                      <EditDelete
                        onEdit={() => setDialog({ kind: "editUser", u })}
                        onDelete={() => setDialog({ kind: "deleteUser", u })}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {dialog?.kind === "addMachine" && (
            <RegisterMachine companyId={id} onClose={close} onDone={done} />
          )}
          {dialog?.kind === "addUser" && (
            <UserModal companyId={id} onClose={close} onDone={done} />
          )}
          {dialog?.kind === "editUser" && (
            <UserModal user={dialog.u} onClose={close} onDone={done} />
          )}
          {dialog?.kind === "deleteUser" && (
            <Confirm
              title={`Delete ${dialog.u.name}?`}
              text="They will no longer be able to sign in."
              onClose={close}
              onConfirm={async () => {
                await api(`/admin/users/${dialog.u._id}`, { method: "DELETE" });
                done();
              }}
            />
          )}
          {dialog?.kind === "editClient" && (
            <Modal
              title="Edit client"
              onClose={close}
              onSubmit={async (f) => {
                await api(`/admin/clients/${id}`, {
                  method: "PATCH",
                  body: { name: f.name },
                });
                done();
              }}
            >
              <Field label="Company name">
                <input
                  name="name"
                  required
                  minLength="2"
                  defaultValue={d.company.name}
                />
              </Field>
            </Modal>
          )}
          {dialog?.kind === "deleteClient" && (
            <Confirm
              title={`Delete ${d.company.name}?`}
              onClose={close}
              text={`This permanently removes the client with its ${d.machines.length} machines, ${d.users.length} users, production history, alerts and support tickets.`}
              onConfirm={async () => {
                await api(`/admin/clients/${id}`, { method: "DELETE" });
                go("/clients");
              }}
            />
          )}
          {machines.element}
        </>
      )}
    </Async>
  );
}
