import { CircleAlert, CircleCheck, TriangleAlert } from 'lucide-react';
import { useEffect, useState } from 'react';

// One place for the "are you sure?" and the success / failure dialogs of every add, edit and delete.
// <Modal> and <Confirm> call ask() before running and tell() after; <FeedbackHost /> (mounted once in the Layout) draws them.
let show = () => {};

/** Resolves true when the user confirms, false when they cancel. */
export const ask = ({ title, message, action = 'Yes, continue', danger = false }) => new Promise((resolve) => show({ kind: 'ask', title, message, action, danger, resolve }));

/** Success or failure result, closed with OK. */
export const tell = ({ ok, title, message }) => show({ kind: 'tell', ok, title, message });

export function FeedbackHost() {
  const [queue, setQueue] = useState([]);
  useEffect(() => {
    show = (d) => setQueue((q) => [...q, d]);
    return () => { show = () => {}; };
  }, []);
  const d = queue[0];
  const next = () => setQueue((q) => q.slice(1));
  const answer = (yes) => { d.resolve?.(yes); next(); };
  useEffect(() => {
    if (!d) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') d.kind === 'ask' ? answer(false) : next();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [d]);
  if (!d) return null;

  if (d.kind === 'ask') {
    return (
      <div className="backdrop top" onMouseDown={(e) => e.target === e.currentTarget && answer(false)}>
        <div className="modal card result" role="alertdialog" aria-modal="true" aria-labelledby="feedback-title">
          <TriangleAlert size={40} className={d.danger ? 'stopped' : 'idle'} />
          <h2 id="feedback-title">{d.title}</h2>
          <p>{d.message}</p>
          <div className="row">
            <button className={d.danger ? 'danger' : ''} autoFocus onClick={() => answer(true)}>{d.action}</button>
            <button className="alt" onClick={() => answer(false)}>Cancel</button>
          </div>
        </div>
      </div>
    );
  }
  const Icon = d.ok ? CircleCheck : CircleAlert;
  return (
    <div className="backdrop top" onMouseDown={(e) => e.target === e.currentTarget && next()}>
      <div className="modal card result" role="alertdialog" aria-modal="true" aria-labelledby="feedback-title">
        <Icon size={40} className={d.ok ? 'running' : 'stopped'} />
        <h2 id="feedback-title">{d.ok ? 'Success' : 'Failed'}</h2>
        <p><b>{d.title}</b></p>
        <p>{d.message}</p>
        <div className="row"><button autoFocus onClick={next}>OK</button></div>
      </div>
    </div>
  );
}
