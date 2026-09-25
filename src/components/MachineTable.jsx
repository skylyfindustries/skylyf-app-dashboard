import { Building2, Calendar, CalendarRange, Clock, Gauge, Hash, KeyRound, Package, Pencil, Tag as TagIcon, Target, Trash2 } from 'lucide-react';
import { date, day, fmt } from '../api/format.js';
import { Actions, IconBtn } from './Actions.jsx';
import { Ic, MachineImg, Tag } from './ui.jsx';

// Pass `actions` (from useMachineActions) to show the Edit / Rotate key / Delete column.
export default function MachineTable({ machines, actions }) {
  return (
    <div className="tablewrap">
      <table>
        <thead><tr><th>Machine</th><th>Client</th><th>Type / model</th><th>Status</th><th className="num">Speed</th><th className="num">Today</th><th className="num">Target</th><th className="num">7 days</th><th>Registered</th><th>Last seen</th>{actions && <th />}</tr></thead>
        <tbody>
          {machines.map((m) => (
            <tr key={m._id}>
              <td><div className="mcell"><MachineImg typeKey={m.typeKey} status={m.status} /><b><Hash size={13} />{m.code}</b></div></td>
              <td><Ic icon={Building2}>{m.client}</Ic></td><td><Ic icon={TagIcon}>{m.typeKey} {m.model}</Ic></td><td><Tag status={m.status} /></td>
              <td className="num"><Ic icon={Gauge}>{fmt(m.speed)}</Ic></td><td className="num"><Ic icon={Package}>{fmt(m.todayProduction)} {m.outputUnit}</Ic></td>
              <td className="num"><Ic icon={Target}>{fmt(m.todayTarget)}</Ic></td><td className="num"><Ic icon={CalendarRange}>{fmt(m.weekProduction)}</Ic></td>
              <td><Ic icon={Calendar}>{day(m.createdAt)}</Ic></td><td><Ic icon={Clock}>{date(m.lastSeenAt)}</Ic></td>
              {actions && (
                <td>
                  <Actions>
                    <IconBtn icon={Pencil} title="Edit machine" onClick={() => actions.onEdit(m)} />
                    <IconBtn icon={KeyRound} title="Rotate device key" onClick={() => actions.onKey(m)} />
                    <IconBtn icon={Trash2} title="Delete machine" onClick={() => actions.onDelete(m)} danger />
                  </Actions>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
