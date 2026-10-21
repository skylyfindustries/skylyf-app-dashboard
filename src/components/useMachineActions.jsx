import { useState } from "react";
import { api } from "../api/client.js";
import EditMachine from "./EditMachine.jsx";
import Modal, { Confirm } from "./Modal.jsx";

// Edit / rotate key / delete for machines. Render `element` once; pass `actions` to <MachineTable>.
export function useMachineActions(reload) {
  const [dialog, setDialog] = useState(null);
  const close = () => setDialog(null);
  const done = () => {
    close();
    reload();
  };

  const actions = {
    onEdit: (m) => setDialog({ kind: "edit", m }),
    onKey: (m) => setDialog({ kind: "confirmKey", m }),
    onDelete: (m) => setDialog({ kind: "delete", m }),
  };

  let element = null;
  if (dialog?.kind === "edit") {
    const { m } = dialog;
    element = <EditMachine machine={m} onClose={close} onDone={done} />;
  } else if (dialog?.kind === "delete") {
    const { m } = dialog;
    element = (
      <Confirm
        title={`Delete ${m.code}?`}
        text={`This removes ${m.code}${m.client ? ` (${m.client})` : ""} with its production history, alerts and support tickets. It can't be undone.`}
        onClose={close}
        onConfirm={async () => {
          await api(`/admin/machines/${m._id}`, { method: "DELETE" });
          done();
        }}
      />
    );
  } else if (dialog?.kind === "confirmKey") {
    const { m } = dialog;
    element = (
      <Confirm
        title={`Rotate key for ${m.code}?`}
        action="Rotate"
        success={false}
        text="The current device key stops working immediately. The gateway must be given the new key."
        onClose={close}
        onConfirm={async () => {
          const r = await api(`/admin/machines/${m._id}/rotate-key`, {
            method: "POST",
          });
          setDialog({ kind: "newKey", r });
        }}
      />
    );
  } else if (dialog?.kind === "newKey") {
    element = (
      <Modal
        title={`New key for ${dialog.r.code}`}
        submitText="Done"
        onSubmit={async () => done()}
        onClose={done}
      >
        <p>
          Give this to the gateway (header <code>x-api-key</code>). It is shown
          only once.
        </p>
        <div className="key">{dialog.r.deviceKey}</div>
      </Modal>
    );
  }
  return { actions, element };
}
