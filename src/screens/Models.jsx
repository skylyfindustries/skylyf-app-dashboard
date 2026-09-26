import { Gauge, Tag as TagIcon } from 'lucide-react';
import { useState } from 'react';
import { api, photoUrl } from '../api/client.js';
import { useApi } from '../api/useApi.js';
import { EditDelete } from '../components/Actions.jsx';
import Modal, { Confirm, Field } from '../components/Modal.jsx';
import { Stats, modelsStats } from '../components/pageStats.jsx';
import SpecFields, { checkSpec } from '../components/SpecFields.jsx';
import { Async, Ic, MachineImg } from '../components/ui.jsx';

const MAX_PHOTOS = 5;
const MAX_BYTES = 2 * 1024 * 1024;
const TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const rupees = (n) => (n || n === 0 ? `₹${Number(n).toLocaleString('en-IN')}` : '—');

// The machines Skylyf sells (no stock: this is the list owners see in the app's "Register new").
// Each model has photos, price and details; when a client registers one, every piece gets its own code.
export default function Models() {
  const state = useApi('/admin/catalog');
  const types = useApi('/admin/machine-types').data ?? [];
  const [dialog, setDialog] = useState(null); // { kind: 'add' | 'edit' | 'delete', m? }
  const [removed, setRemoved] = useState([]); // saved photo file names to drop (edit)
  const [files, setFiles] = useState([]);
  const [type, setType] = useState(null); // the type picked in the form: decides which size / speed / paper inputs show
  const close = () => { setDialog(null); setRemoved([]); setFiles([]); setType(null); };
  const done = () => { close(); state.reload(); };
  const m = dialog?.m;
  const formType = type ?? m?.typeKey ?? types[0]?.key;
  const saved = (m?.photos ?? []).filter((u) => !removed.includes(u.split('/').pop()));

  // pick photos: keep them in state so previews show and limits are checked before uploading
  function pick(e) {
    const chosen = [...e.target.files];
    e.target.value = '';
    const all = [...files, ...chosen];
    if (all.length + saved.length > MAX_PHOTOS) throw new Error(`You can add up to ${MAX_PHOTOS} photos`);
    const bad = chosen.find((f) => !TYPES.includes(f.type) || f.size > MAX_BYTES);
    if (bad) throw new Error(`${bad.name}: photos must be JPG, PNG or WebP and at most 2 MB`);
    setFiles(all);
  }

  const form = (f) => {
    const problem = checkSpec(f, f.typeKey);
    if (problem) throw new Error(problem);
    const body = new FormData();
    // the size / speed / paper text shown in the apps is built by the server from these ranges
    for (const k of ['name', 'model', 'typeKey', 'price', 'description', 'specs', 'active', 'sizeMin', 'sizeMax', 'sizeUnit', 'maxHeightMm', 'speedMin', 'speedMax', 'speedPer', 'gsmMin', 'gsmMax', 'coatingType']) if (k in f) body.append(k, f[k] ?? '');
    files.forEach((p) => body.append('photos', p));
    if (m) body.append('removePhotos', removed.join(','));
    return body;
  };

  const fields = (
    <>
      <Field label="Photos (up to 5, max 2 MB each)">
        <input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={files.length + saved.length >= MAX_PHOTOS} onChange={(e) => { try { pick(e); } catch (err) { alert(err.message); } }} />
      </Field>
      {(saved.length > 0 || files.length > 0) && (
        <div className="photos">
          {saved.map((u) => <span key={u} title="Click to remove"><img src={photoUrl(u)} alt="" onClick={() => setRemoved([...removed, u.split('/').pop()])} style={{ cursor: 'pointer' }} /></span>)}
          {files.map((p, i) => <span key={i} title={`${p.name} - click to remove`}><img src={URL.createObjectURL(p)} alt={p.name} onClick={() => setFiles(files.filter((_, j) => j !== i))} style={{ cursor: 'pointer' }} /></span>)}
          <span className="hint">{files.length + saved.length}/{MAX_PHOTOS} photos. Click one to remove it.</span>
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 16 }}>
        <Field label="Machine name"><input name="name" required minLength="2" maxLength="80" defaultValue={m?.name} placeholder="Paper Cup Machine" /></Field>
        <Field label="Model"><input name="model" required maxLength="40" defaultValue={m?.model} placeholder="SKY-PC 180" /></Field>
        <Field label="Type"><select name="typeKey" required value={formType ?? ''} onChange={(e) => setType(e.target.value)}>{types.map((t) => <option key={t.key} value={t.key}>{t.name}</option>)}</select></Field>
        <Field label="Price (₹)"><input name="price" type="number" min="0" step="0.01" defaultValue={m?.price ?? ''} placeholder="450000" /></Field>
      </div>
      <SpecFields type={formType} spec={m?.typeKey === formType ? m?.spec : null} />
      <Field label="Description"><textarea name="description" rows="3" maxLength="1000" defaultValue={m?.description || m?.tagline} /></Field>
      <Field label="Specifications (one per line)"><textarea name="specs" rows="3" defaultValue={m?.specs?.join('\n')} /></Field>
      <Field label="Shown to owners in the app">
        <select name="active" defaultValue={String(m?.active ?? true)}><option value="true">Yes</option><option value="false">Hidden</option></select>
      </Field>
    </>
  );

  return (
    <>
      <div className="row"><h1>Machines</h1><button onClick={() => setDialog({ kind: 'add' })}>+ Add machine</button></div>
      <p className="muted">The machines we sell. Owners pick theirs from this list in the app when they register a machine they bought.</p>
      <Async state={state}>{(list) => (
        <>
        <Stats items={modelsStats(list)} />
        <div className="card tablewrap">
          <table>
            <thead><tr><th>Machine</th><th>Type</th><th className="num">Price</th><th>Speed</th><th>Size</th><th>In app</th><th /></tr></thead>
            <tbody>
              {list.map((x) => (
                <tr key={x.id}>
                  <td><div className="mcell"><MachineImg typeKey={x.typeKey} photo={x.photos?.[0]} /><div><b>{x.name}</b><br /><small>{x.model}</small></div></div></td>
                  <td><Ic icon={TagIcon}>{x.typeKey}</Ic></td>
                  <td className="num">{rupees(x.price)}</td>
                  <td><Ic icon={Gauge}>{x.speed}</Ic></td>
                  <td className="wrap">{x.cupSize}</td>
                  <td><span className={x.active ? 'running' : 'idle'}>{x.active ? 'Visible' : 'Hidden'}</span></td>
                  <td><EditDelete onEdit={() => setDialog({ kind: 'edit', m: x })} onDelete={() => setDialog({ kind: 'delete', m: x })} /></td>
                </tr>
              ))}
              {!list.length && <tr><td colSpan="7">No machines yet. Add the machines you sell so owners can choose them.</td></tr>}
            </tbody>
          </table>
        </div>
        </>
      )}</Async>

      {dialog?.kind === 'add' && (
        <Modal title="Add machine" submitText="Add" wide onClose={close}
          onSubmit={async (f) => { await api('/admin/catalog', { method: 'POST', body: form(f) }); done(); }}>{fields}</Modal>
      )}
      {dialog?.kind === 'edit' && (
        <Modal title={`Edit ${m.model}`} wide onClose={close}
          onSubmit={async (f) => { await api(`/admin/catalog/${m.id}`, { method: 'PATCH', body: form(f) }); done(); }}>{fields}</Modal>
      )}
      {dialog?.kind === 'delete' && (
        <Confirm title={`Delete ${m.model}?`} text="Owners will no longer see it. Machines already registered are not affected." onClose={close}
          onConfirm={async () => { await api(`/admin/catalog/${m.id}`, { method: 'DELETE' }); done(); }} />
      )}
    </>
  );
}
