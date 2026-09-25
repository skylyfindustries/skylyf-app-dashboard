import { label } from '../api/format.js';

export const Tag = ({ status }) => <span className={`tag ${status}`}>{label(status)}</span>;

export const Stat = ({ value, text, tone, icon: Icon }) => (
  <div className="card stat">
    <div className="chip"><Icon size={20} /></div>
    <div><b className={tone}>{value}</b><span>{text}</span></div>
  </div>
);

// Icon + text for table cells.
export const Ic = ({ icon: Icon, children, tone }) => <span className={`ic ${tone ?? ''}`}><Icon size={15} />{children}</span>;

// Little machine illustration, tinted by type (stands in for a product photo).
export function MachineImg({ typeKey, status }) {
  const top = {
    paper_cup: <path d="M14 8h14l-2 12H16z M13 8h16" fill="#fff" stroke="#14284B" strokeWidth="1.4" strokeLinejoin="round" />,
    tissue: <><rect x="12" y="8" width="18" height="12" rx="6" fill="#fff" stroke="#14284B" strokeWidth="1.4" /><circle cx="21" cy="14" r="2.2" fill="#14284B" /></>,
  }[typeKey] ?? <circle cx="21" cy="14" r="6" fill="#fff" stroke="#14284B" strokeWidth="1.4" strokeDasharray="3 2" />;
  return (
    <svg className="mimg" viewBox="0 0 42 42" aria-hidden="true">
      <rect x="4" y="22" width="34" height="14" rx="4" fill="#C8902E" />
      <rect x="8" y="26" width="10" height="4" rx="1" fill="#F6E7C4" />
      <rect x="4" y="34" width="34" height="3" rx="1.5" fill="#14284B" />
      {top}
      {status && <circle cx="33" cy="28" r="2.6" fill={`var(--${status})`} />}
    </svg>
  );
}

// Loading / error wrapper for useApi results.
export function Async({ state, children }) {
  if (state.error) return <p className="err">{state.error}</p>;
  if (!state.data) return <p className="muted">Loading…</p>;
  return children(state.data);
}

export function BarChart({ data }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <>
      <div className="bars">
        {data.map((d) => <div key={d.label} style={{ height: `${(d.value / max) * 100}%` }} title={`${d.label}: ${d.value.toLocaleString()}`} />)}
      </div>
      <div className="bars-x">{data.map((d) => <span key={d.label}>{d.label.slice(-2)}</span>)}</div>
    </>
  );
}
