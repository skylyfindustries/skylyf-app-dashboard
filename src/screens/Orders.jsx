import { IndianRupee, Printer, ReceiptText, Search, Truck } from 'lucide-react';
import { useState } from 'react';
import { api, photoUrl } from '../api/client.js';
import { date, day } from '../api/format.js';
import { useApi } from '../api/useApi.js';
import Modal, { Field } from '../components/Modal.jsx';
import { Async, Stat, Tag } from '../components/ui.jsx';
import logo from '../assets/logo.webp';
import { rupees } from './Parts.jsx';

const STATUS = ['placed', 'confirmed', 'shipped', 'delivered', 'cancelled'];
const tone = { placed: 'idle', confirmed: 'running', shipped: 'running', delivered: 'running', cancelled: 'stopped' };

// Tax invoice for one order. Printing hides everything else on the page (see @media print in app.css).
function Invoice({ o, onClose }) {
  return (
    <div className="backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal card wide invoice">
        <div className="row noprint">
          <h2 style={{ margin: 0 }}>Invoice {o.invoiceNo}</h2>
          <button onClick={() => window.print()}><Printer size={15} /> Print / save PDF</button>
          <button className="alt" onClick={onClose}>Close</button>
        </div>
        <div className="inv-head">
          <img src={logo} alt="Skylyf" style={{ height: 44 }} />
          <div style={{ textAlign: 'right' }}>
            <h2 style={{ margin: 0 }}>TAX INVOICE</h2>
            <div>{o.invoiceNo}</div><div>Order {o.number}</div><div>{day(o.createdAt)}</div>
            <div><b>{o.paid ? 'PAID' : 'PAYMENT PENDING'}</b></div>
          </div>
        </div>
        <div className="inv-bill">
          <small>BILL TO</small>
          <b>{o.billTo?.name}</b>
          {o.billTo?.address && <div>{o.billTo.address}</div>}
          {o.billTo?.gstin && <div>GSTIN: {o.billTo.gstin}</div>}
          {[o.billTo?.phone, o.billTo?.email].filter(Boolean).join(' · ')}
        </div>
        <table>
          <thead><tr><th>#</th><th>Item</th><th>SKU</th><th style={{ textAlign: 'right' }}>Price</th><th style={{ textAlign: 'right' }}>Qty</th><th style={{ textAlign: 'right' }}>Amount</th></tr></thead>
          <tbody>
            {o.items.map((i, n) => (
              <tr key={n}><td>{n + 1}</td><td>{i.name}</td><td>{i.sku}</td><td style={{ textAlign: 'right' }}>{rupees(i.price)}</td><td style={{ textAlign: 'right' }}>{i.qty}</td><td style={{ textAlign: 'right' }}>{rupees(i.price * i.qty)}</td></tr>
            ))}
          </tbody>
        </table>
        <div className="inv-total">
          <div><span>Subtotal</span><span>{rupees(o.subtotal)}</span></div>
          <div><span>GST ({Math.round(o.gstRate * 100)}%)</span><span>{rupees(o.gst)}</span></div>
          <div><b>Total</b><b>{rupees(o.total)}</b></div>
        </div>
        <p className="muted" style={{ marginTop: 18 }}>This is a computer generated invoice.</p>
      </div>
    </div>
  );
}

// Every parts order from every client: track status and payment, open the invoice.
export default function Orders() {
  const state = useApi('/admin/orders');
  const [filter, setFilter] = useState('');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(null); // order being managed
  const [invoice, setInvoice] = useState(null);
  const done = () => { setOpen(null); state.reload(); };

  return (
    <>
      <div className="row">
        <h1>Parts orders</h1>
        <label className="search"><Search size={15} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search order or client…" /></label>
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">All statuses</option>
          {STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <Async state={state}>{(list) => {
        const live = list.filter((o) => o.status !== 'cancelled');
        const needle = q.trim().toLowerCase();
        const shown = list.filter((o) => (!filter || o.status === filter) && (!needle || `${o.number} ${o.billTo?.name}`.toLowerCase().includes(needle)));
        return (
          <>
            <div className="grid stats">
              <Stat icon={ReceiptText} value={list.length} text="Orders" />
              <Stat icon={Truck} value={list.filter((o) => ['placed', 'confirmed', 'shipped'].includes(o.status)).length} text="To deliver" tone="idle" />
              <Stat icon={IndianRupee} value={rupees(live.reduce((s, o) => s + o.total, 0))} text="Order value" />
              <Stat icon={IndianRupee} value={rupees(live.filter((o) => !o.paid).reduce((s, o) => s + o.total, 0))} text="Payment pending" tone="stopped" />
            </div>
            <div className="card tablewrap">
              <table>
                <thead><tr><th>Order</th><th>Client</th><th>Placed</th><th>Items</th><th>Total</th><th>Status</th><th>Payment</th><th /></tr></thead>
                <tbody>
                  {shown.map((o) => (
                    <tr key={o.id} style={{ cursor: 'pointer' }} onClick={() => setOpen(o)}>
                      <td><b>{o.number}</b></td>
                      <td>{o.billTo?.name}</td>
                      <td>{date(o.createdAt)}</td>
                      <td>{o.items.reduce((s, i) => s + i.qty, 0)}</td>
                      <td>{rupees(o.total)}</td>
                      <td><Tag status={tone[o.status]} /> {o.status}</td>
                      <td><span className={o.paid ? 'running' : 'idle'}>{o.paid ? 'Paid' : 'Pending'}</span></td>
                      <td><button className="alt" onClick={(e) => { e.stopPropagation(); setInvoice(o); }}>Invoice</button></td>
                    </tr>
                  ))}
                  {!shown.length && <tr><td colSpan="8">{list.length ? 'No order matches.' : 'No orders yet. They appear here when an owner orders parts in the app.'}</td></tr>}
                </tbody>
              </table>
            </div>
          </>
        );
      }}</Async>

      {open && (
        <Modal title={`Order ${open.number}`} wide onClose={() => setOpen(null)}
          onSubmit={async (f) => { await api(`/admin/orders/${open.id}`, { method: 'PATCH', body: { status: f.status, paid: f.paid === 'true' } }); done(); }}>
          <p><b>{open.billTo?.name}</b><br />{open.billTo?.address}<br />{[open.billTo?.phone, open.billTo?.email].filter(Boolean).join(' · ')}</p>
          <div className="tablewrap"><table>
            <tbody>
              {open.items.map((i, n) => (
                <tr key={n}>
                  <td>{i.photo ? <img className="mimg photo" src={photoUrl(i.photo)} alt="" /> : null}</td>
                  <td><b>{i.name}</b><br /><small>{i.sku}</small></td><td>{i.qty} × {rupees(i.price)}</td><td style={{ textAlign: 'right' }}>{rupees(i.qty * i.price)}</td>
                </tr>
              ))}
              <tr><td colSpan="3">GST ({Math.round(open.gstRate * 100)}%)</td><td style={{ textAlign: 'right' }}>{rupees(open.gst)}</td></tr>
              <tr><td colSpan="3"><b>Total</b></td><td style={{ textAlign: 'right' }}><b>{rupees(open.total)}</b></td></tr>
            </tbody>
          </table></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 16 }}>
            <Field label="Status">
              <select name="status" defaultValue={open.status} disabled={open.status === 'cancelled'}>{STATUS.map((s) => <option key={s} value={s}>{s}</option>)}</select>
            </Field>
            <Field label="Payment"><select name="paid" defaultValue={String(open.paid)}><option value="false">Pending</option><option value="true">Paid</option></select></Field>
          </div>
          <p className="muted">History: {open.history.map((h) => `${h.status} (${day(h.at)})`).join(' → ')}. Cancelling puts the stock back.</p>
          <button type="button" className="alt" onClick={() => { setInvoice(open); setOpen(null); }}>View invoice</button>
        </Modal>
      )}
      {invoice && <Invoice o={invoice} onClose={() => setInvoice(null)} />}
    </>
  );
}
