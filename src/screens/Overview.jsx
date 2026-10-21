import { AlertTriangle, Boxes, CirclePause, CirclePlay, Factory, LifeBuoy, MessageSquare, OctagonX, PackageCheck, PackageOpen, Users } from 'lucide-react';
import { useState } from 'react';
import { fmt } from '../api/format.js';
import { useApi } from '../api/useApi.js';
import { Donut, HBars, LineChart, Ring, SoldAvailable } from '../components/charts.jsx';
import { Async, BarChart, Stat } from '../components/ui.jsx';

const RANGES = [['today', 'Today'], [7, '1w'], [14, '2w'], [21, '3w']];

// Napkin production graph: hour by hour for today, day by day for 1/2/3 weeks.
function ProductionGraph({ d }) {
  const [range, setRange] = useState('today');
  const data = range === 'today'
    ? d.hourly.map((h) => ({ label: `${h.hour}h`, value: h.produced }))
    : d.daily.slice(-range).map((x) => ({ label: x.date.slice(5), value: x.produced }));
  return (
    <div className="card reveal">
      <div className="row-actions">
        <h2>Paper napkin production, {range === 'today' ? 'today by hour' : `last ${range / 7} week${range > 7 ? 's' : ''}`}</h2>
        <div className="range">{RANGES.map(([k, l]) => <button key={k} className={range === k ? 'on' : ''} onClick={() => setRange(k)}>{l}</button>)}</div>
      </div>
      <LineChart key={range} data={data} />
    </div>
  );
}

function TechnicianCarousel({ list }) {
  if (!list.length) return null;
  return (
    <div className="card reveal">
      <h2>Technicians today</h2>
      <div className="carousel">
        {list.map((t) => (
          <div key={t.id} className="card tech">
            <b>{t.name}</b>
            <small>{t.company}{t.shift && ` · ${t.shift}`}</small>
            <span className={`pill ${t.status}`}>{t.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const bars = (list, key = 'value') => list.map((x) => ({ label: x.date, value: x[key] }));

export default function Overview() {
  const state = useApi('/admin/overview');

  return (
    <>
      <h1>Overview</h1>
      <Async state={state}>{(d) => {
        const machines = d.machines.running + d.machines.stopped + d.machines.idle;
        return (
          <>
            <div className="grid reveal">
              <Stat icon={MessageSquare} value={d.support.today} text="Support queries today" />
              <Stat icon={LifeBuoy} value={d.support.open + d.support.inProgress} text="Open support queries" />
              <Stat icon={PackageCheck} value={d.sold} text="Machines sold" />
              <Stat icon={PackageOpen} value={d.available} text="Machines available" />
              <Stat icon={Users} value={d.clients} text="Clients" />
              <Stat icon={Factory} value={machines} text="Machines in service" />
              <Stat icon={CirclePlay} value={d.machines.running} text="Running" tone="running" />
              <Stat icon={OctagonX} value={d.machines.stopped} text="Stopped" tone="stopped" />
              <Stat icon={CirclePause} value={d.machines.idle} text="Idle" tone="idle" />
              <Stat icon={Boxes} value={fmt(d.todayProduction)} text="Produced today" />
              <Stat icon={AlertTriangle} value={d.openAlerts} text="Open alerts" />
              <Stat icon={MessageSquare} value={d.support.resolvedToday} text="Resolved today" tone="running" />
            </div>

            <ProductionGraph d={d} />
            <TechnicianCarousel list={d.technicians} />

            <div className="two reveal">
              <div className="card">
                <h2>Production, last 14 days (all clients)</h2>
                <BarChart data={bars(d.daily.map((x) => ({ date: x.date, value: x.produced })))} />
              </div>
              <div className="card">
                <h2>Today vs target</h2>
                <Ring percent={d.todayTarget ? (d.todayProduction / d.todayTarget) * 100 : 0} caption={`${fmt(d.todayProduction)} of ${fmt(d.todayTarget)}`} />
                <HBars data={['A', 'B', 'C'].map((s) => ({ name: `Shift ${s}`, value: d.shifts[s] }))} />
              </div>
            </div>

            <div className="three reveal">
              <div className="card">
                <h2>Machine status</h2>
                <Donut center={machines} data={[
                  { label: 'Running', value: d.machines.running, color: 'var(--running)' },
                  { label: 'Stopped', value: d.machines.stopped, color: 'var(--stopped)' },
                  { label: 'Idle', value: d.machines.idle, color: 'var(--idle)' },
                ]} />
              </div>
              <div className="card">
                <h2>Production by client, 7 days</h2>
                <HBars data={d.byClient.slice(0, 6)} />
              </div>
              <div className="card">
                <h2>Machines sold, by type</h2>
                <SoldAvailable data={d.inventory} />
              </div>
            </div>

            <div className="three reveal">
              <div className="card"><h2>Support queries, last 7 days</h2><BarChart data={bars(d.ticketsDaily)} /></div>
              <div className="card"><h2>Client logins, last 7 days</h2><BarChart data={bars(d.logins)} /></div>
              <div className="card">
                <h2>Top machines today</h2>
                <table><tbody>
                  {d.topMachines.map((m) => <tr key={m.id}><td>{m.code}<br /><small>{m.client}</small></td><td className="num">{fmt(m.todayProduction)}</td></tr>)}
                </tbody></table>
              </div>
            </div>
          </>
        );
      }}</Async>
    </>
  );
}
