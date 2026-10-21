import {
  Building2,
  Calendar,
  Clock,
  Factory,
  Package,
  PlayCircle,
  Users,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client.js";
import { date, day, fmt } from "../api/format.js";
import { useApi } from "../api/useApi.js";
import { EditDelete } from "../components/Actions.jsx";
import Modal, { Confirm, Field } from "../components/Modal.jsx";
import ExportMenu from "../components/ExportMenu.jsx";
import { Stats, clientsStats } from "../components/pageStats.jsx";
import { Async, Ic } from "../components/ui.jsx";

export default function Clients() {
  const state = useApi("/admin/clients");
  const [dialog, setDialog] = useState(null); // { kind: 'add' | 'edit' | 'delete', c? }
  const go = useNavigate();
  const close = () => setDialog(null);
  const done = () => {
    close();
    state.reload();
  };

  const register = async (f) => {
    await api("/admin/clients", {
      method: "POST",
      body: {
        name: f.name,
        city: f.city || undefined,
        user: {
          name: f.uname,
          email: f.email,
          phone: f.phone || undefined,
          password: f.password,
        },
      },
    });
    done();
  };

  return (
    <>
      <div className="row">
        <h1>Clients</h1>
        <ExportMenu id="clients" />
        <button onClick={() => setDialog({ kind: "add" })}>
          + Register client
        </button>
      </div>
      <Async state={state}>
        {(list) => (
          <>
            <Stats items={clientsStats(list)} />
            <div className="card tablewrap">
              <table>
                <thead>
                  <tr>
                    <th>Client</th>
                    <th>Registered</th>
                    <th className="num">Machines</th>
                    <th className="num">Running</th>
                    <th className="num">Users</th>
                    <th className="num">Today</th>
                    <th className="num">7 days</th>
                    <th>Last login</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {list.map((c) => (
                    <tr
                      key={c.id}
                      className="click"
                      onClick={() => go(`/clients/${c.id}`)}
                    >
                      <td>
                        <Ic icon={Building2}>{c.name}</Ic>
                      </td>
                      <td>
                        <Ic icon={Calendar}>{day(c.registeredAt)}</Ic>
                      </td>
                      <td className="num">
                        <Ic icon={Factory}>{c.machines}</Ic>
                      </td>
                      <td className="num">
                        <Ic icon={PlayCircle} tone="running">
                          {c.running}
                        </Ic>
                      </td>
                      <td className="num">
                        <Ic icon={Users}>{c.users}</Ic>
                      </td>
                      <td className="num">
                        <Ic icon={Package}>{fmt(c.todayProduction)}</Ic>
                      </td>
                      <td className="num">{fmt(c.weekProduction)}</td>
                      <td>
                        <Ic icon={Clock}>{date(c.lastLoginAt)}</Ic>
                      </td>
                      <td>
                        <EditDelete
                          onEdit={() => setDialog({ kind: "edit", c })}
                          onDelete={() => setDialog({ kind: "delete", c })}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Async>

      {dialog?.kind === "add" && (
        <Modal
          title="Register client"
          submitText="Register"
          onSubmit={register}
          onClose={close}
        >
          <Field label="Company name">
            <input name="name" required minLength="2" />
          </Field>
          <Field label="City">
            <input name="city" />
          </Field>
          <Field label="Contact name">
            <input name="uname" required minLength="2" />
          </Field>
          <Field label="Login email">
            <input name="email" type="email" required />
          </Field>
          <Field label="Phone">
            <input name="phone" />
          </Field>
          <Field label="Initial password (min 8)">
            <input name="password" type="password" required minLength="8" />
          </Field>
        </Modal>
      )}
      {dialog?.kind === "edit" && (
        <Modal
          title="Edit client"
          onClose={close}
          onSubmit={async (f) => {
            await api(`/admin/clients/${dialog.c.id}`, {
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
              defaultValue={dialog.c.name}
            />
          </Field>
        </Modal>
      )}
      {dialog?.kind === "delete" && (
        <Confirm
          title={`Delete ${dialog.c.name}?`}
          onClose={close}
          text={`This permanently removes the client with its ${dialog.c.machines} machines, ${dialog.c.users} users, production history, alerts and support tickets.`}
          onConfirm={async () => {
            await api(`/admin/clients/${dialog.c.id}`, { method: "DELETE" });
            done();
          }}
        />
      )}
    </>
  );
}
