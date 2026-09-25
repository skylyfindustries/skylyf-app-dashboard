import { Building2, CalendarClock, CheckCircle2, CircleAlert, Clock, Hash, Timer, WifiOff } from 'lucide-react';
import { date, hours } from '../api/format.js';
import { useApi } from '../api/useApi.js';
import ExportMenu from '../components/ExportMenu.jsx';
import { Async, Ic, Stat, Tag } from '../components/ui.jsx';

// Machine health (last 7 days) and the crash / recovery log.
export default function System() {
  const state = useApi('/admin/system');
  return (
    <>
      <div className="row"><h1>System</h1><ExportMenu id="uptime" /><ExportMenu id="crashes" /></div>
      <Async state={state}>{(d) => (
        <>
          <div className="grid reveal">
            <Stat icon={Clock} value={hours(d.runSeconds)} text="Machine running time, 7 days" />
            <Stat icon={CircleAlert} value={d.crashes} text="Crashes, 7 days" tone={d.crashes ? 'stopped' : undefined} />
            <Stat icon={WifiOff} value={d.offline} text="Stopped / offline now" tone={d.offline ? 'stopped' : undefined} />
          </div>
          <div className="two reveal">
            <div className="card tablewrap">
              <h2>Machine health, last 7 days</h2>
              <table>
                <thead><tr><th>Machine</th><th>Status</th><th className="num">Running</th><th className="num">Down</th><th>Uptime</th><th className="num">Crashes</th><th>Last seen</th></tr></thead>
                <tbody>
                  {d.machines.map((m) => (
                    <tr key={m.id}>
                      <td><Ic icon={Hash}>{m.code}</Ic><br /><small><Ic icon={Building2}>{m.client}</Ic></small></td><td><Tag status={m.status} /></td>
                      <td className="num"><Ic icon={Timer} tone="running">{hours(m.runSeconds)}</Ic></td><td className="num"><Ic icon={Timer} tone="stopped">{hours(m.downSeconds)}</Ic></td>
                      <td>{m.uptime == null ? '—' : <><span className="uptime"><i style={{ width: `${m.uptime}%` }} /></span>{m.uptime}%</>}</td>
                      <td className={`num ${m.crashes ? 'stopped' : ''}`}>{m.crashes}</td><td><Ic icon={CalendarClock}>{date(m.lastSeenAt)}</Ic></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="card">
              <h2>Event log</h2>
              {d.events.length ? (
                <ul className="log">
                  {d.events.map((e) => (
                    <li key={e.id}>
                      <time>{date(e.at)}</time>
                      <span className={`k ${e.kind}`}>{e.kind === 'crashed' ? <CircleAlert size={14} /> : <CheckCircle2 size={14} />} {e.kind}</span>
                      <span>{e.machine} <small>{e.client}</small></span>
                    </li>
                  ))}
                </ul>
              ) : <p className="muted">No crashes recorded.</p>}
            </div>
          </div>
        </>
      )}</Async>
    </>
  );
}
