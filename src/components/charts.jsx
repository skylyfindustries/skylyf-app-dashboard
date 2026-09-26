import { fmt } from '../api/format.js';

// Donut from [{label, value, color}]; center shows the total.
export function Donut({ data, center }) {
  const total = data.reduce((a, d) => a + d.value, 0) || 1;
  let offset = 25; // start at 12 o'clock
  return (
    <div className="donut">
      <svg viewBox="0 0 36 36" role="img">
        <circle cx="18" cy="18" r="15.9155" fill="none" stroke="rgba(20,33,61,.07)" strokeWidth="4" />
        {data.map((d) => {
          const len = (d.value / total) * 100;
          const el = <circle key={d.label} cx="18" cy="18" r="15.9155" fill="none" stroke={d.color} strokeWidth="4" strokeDasharray={`${len} ${100 - len}`} strokeDashoffset={offset} />;
          offset -= len;
          return el;
        })}
        <text x="18" y="19.5" textAnchor="middle" className="donut-n">{center}</text>
      </svg>
      <ul className="legend">
        {data.map((d) => <li key={d.label}><i style={{ background: d.color }} />{d.label}<span>{fmt(d.value)}</span></li>)}
      </ul>
    </div>
  );
}

// Progress ring 0-100 with a caption.
export function Ring({ percent, caption }) {
  const p = Math.max(0, Math.min(100, percent));
  return (
    <div className="ring">
      <svg viewBox="0 0 36 36">
        <circle cx="18" cy="18" r="15.9155" fill="none" stroke="rgba(20,33,61,.07)" strokeWidth="3.5" />
        <circle cx="18" cy="18" r="15.9155" fill="none" stroke="var(--gold)" strokeWidth="3.5" strokeLinecap="round" strokeDasharray={`${p} ${100 - p}`} strokeDashoffset="25" />
      </svg>
      <div><b>{Math.round(p)}%</b><span>{caption}</span></div>
    </div>
  );
}

// Horizontal bars: [{name, value}]
export function HBars({ data }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="hbars">
      {data.map((d) => (
        <div key={d.name} className="hbar">
          <span>{d.name}</span>
          <div><i style={{ width: `${(d.value / max) * 100}%` }} /></div>
          <em>{fmt(d.value)}</em>
        </div>
      ))}
    </div>
  );
}

// Two-segment bars per row: navy = sold, gold = available.
export function SoldAvailable({ data }) {
  const max = Math.max(1, ...data.map((d) => d.sold));
  return (
    <div className="hbars">
      {data.map((d) => (
        <div key={d.key} className="hbar">
          <span>{d.name}</span>
          <div className="seg"><i style={{ width: `${(d.sold / max) * 100}%`, background: 'var(--navy-2)' }} /></div>
          <em>{d.sold}</em>
        </div>
      ))}
    </div>
  );
}
