import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApi } from '../api/useApi.js';
import ExportMenu from '../components/ExportMenu.jsx';
import ImportMachines from '../components/ImportMachines.jsx';
import MachineTable from '../components/MachineTable.jsx';
import RegisterMachine from '../components/RegisterMachine.jsx';
import { useMachineActions } from '../components/useMachineActions.jsx';
import { Async } from '../components/ui.jsx';

export default function Machines() {
  const [params, setParams] = useSearchParams();
  const [adding, setAdding] = useState(false);
  const [importing, setImporting] = useState(false);
  const clients = useApi('/admin/clients').data ?? [];
  const state = useApi(`/admin/machines${params.size ? `?${params}` : ''}`);
  const machines = useMachineActions(state.reload);

  const filter = (key) => (e) => {
    const next = new URLSearchParams(params);
    e.target.value ? next.set(key, e.target.value) : next.delete(key);
    setParams(next);
  };

  return (
    <>
      <div className="row">
        <h1>Machines</h1>
        <select value={params.get('companyId') ?? ''} onChange={filter('companyId')}>
          <option value="">All clients</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={params.get('status') ?? ''} onChange={filter('status')}>
          <option value="">Any status</option>
          {['running', 'stopped', 'idle'].map((s) => <option key={s}>{s}</option>)}
        </select>
        <ExportMenu id="machines" />
        <button className="alt" onClick={() => setImporting(true)}>Import</button>
        <button onClick={() => setAdding(true)}>+ Register machine</button>
      </div>
      <Async state={state}>{(list) => <div className="card"><MachineTable machines={list} actions={machines.actions} /></div>}</Async>
      {adding && <RegisterMachine onClose={() => setAdding(false)} onDone={() => { setAdding(false); state.reload(); }} />}
      {importing && <ImportMachines onClose={() => setImporting(false)} onDone={() => { setImporting(false); state.reload(); }} />}
      {machines.element}
    </>
  );
}
