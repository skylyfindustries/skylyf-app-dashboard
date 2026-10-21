import { RefreshCw, ShoppingCart, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { api } from '../api/client.js';
import { date } from '../api/format.js';
import { Confirm, Field } from '../components/Modal.jsx';
import Modal from '../components/Modal.jsx';
import { Async, Stat, Tag } from '../components/ui.jsx';
import { rupees } from './Parts.jsx';
import { useApi } from '../api/useApi.js';

const statuses = ['pending', 'processing', 'on-hold', 'completed', 'cancelled', 'refunded', 'failed'];
const tone = { pending: 'idle', processing: 'running', 'on-hold': 'idle', completed: 'running', cancelled: 'stopped', refunded: 'stopped', failed: 'stopped' };

export default function WooCommerce() {
  const state = useApi('/admin/woocommerce/orders');
  const config = useApi('/admin/woocommerce/status');
  const [selected, setSelected] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [syncing, setSyncing] = useState(false);

  const reload = () => state.reload();
  const syncProducts = async () => {
    setSyncing(true);
    try { await api('/admin/woocommerce/products/sync', { method: 'POST' }); }
    finally { setSyncing(false); }
  };

  return (
    <>
      <div className="row">
        <h1>WooCommerce</h1>
        <button className="alt" onClick={reload}><RefreshCw size={15} /> Refresh orders</button>
        <button onClick={syncProducts} disabled={syncing}>{syncing ? 'Syncing…' : 'Sync products'}</button>
      </div>
      <Async state={config}>{(status) => !status.configured && <p className="err">WooCommerce is not configured. Add WOOCOMMERCE_STORE_URL, WOOCOMMERCE_CONSUMER_KEY and WOOCOMMERCE_CONSUMER_SECRET to the backend environment.</p>}</Async>
      <Async state={state}>{(result) => {
        const orders = result.orders ?? [];
        return (
          <>
            <div className="grid stats">
              <Stat icon={ShoppingCart} value={orders.length} text="WooCommerce orders" />
              <Stat icon={ShoppingCart} value={orders.filter((o) => ['pending', 'processing', 'on-hold'].includes(o.status)).length} text="Open orders" tone="idle" />
              <Stat icon={ShoppingCart} value={rupees(orders.reduce((sum, o) => sum + o.total, 0))} text="Page value" />
            </div>
            <div className="card tablewrap">
              <table>
                <thead><tr><th>Order</th><th>Customer</th><th>Placed</th><th>Items</th><th>Total</th><th>Status</th><th /></tr></thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id} style={{ cursor: 'pointer' }} onClick={() => setSelected(o)}>
                      <td><b>#{o.number}</b></td>
                      <td>{o.customer.name}<br /><small>{o.customer.email}</small></td>
                      <td>{date(o.date)}</td>
                      <td>{o.items.reduce((sum, i) => sum + i.quantity, 0)}</td>
                      <td>{o.currency} {o.total.toFixed(2)}</td>
                      <td><Tag status={tone[o.status] ?? 'idle'} /> {o.status}</td>
                      <td><button className="danger" onClick={(e) => { e.stopPropagation(); setDeleting(o); }}><Trash2 size={14} /> Delete</button></td>
                    </tr>
                  ))}
                  {!orders.length && <tr><td colSpan="7">No WooCommerce orders found.</td></tr>}
                </tbody>
              </table>
            </div>
          </>
        );
      }}</Async>

      {selected && (
        <Modal title={`WooCommerce order #${selected.number}`} wide onClose={() => setSelected(null)}
          onSubmit={async (form) => { await api(`/admin/woocommerce/orders/${selected.id}`, { method: 'PATCH', body: { status: form.status, customer_note: form.customer_note } }); setSelected(null); reload(); }}>
          <p><b>{selected.customer.name}</b><br />{selected.customer.email}<br />{selected.customer.phone}<br />{selected.customer.address}</p>
          <div className="tablewrap"><table><tbody>
            {selected.items.map((i) => <tr key={i.id}><td>{i.name}</td><td>{i.sku || '—'}</td><td>{i.quantity}</td><td>{selected.currency} {i.total.toFixed(2)}</td></tr>)}
            <tr><td colSpan="3"><b>Total</b></td><td><b>{selected.currency} {selected.total.toFixed(2)}</b></td></tr>
          </tbody></table></div>
          <Field label="Status"><select name="status" defaultValue={selected.status}>{statuses.map((status) => <option key={status} value={status}>{status}</option>)}</select></Field>
          <Field label="Customer note"><textarea name="customer_note" rows="3" defaultValue={selected.customerNote} maxLength="2000" /></Field>
          <p className="muted">Payment: {selected.paymentMethod || 'Not provided'}{selected.transactionId ? ` · Transaction ${selected.transactionId}` : ''}</p>
        </Modal>
      )}
      {deleting && <Confirm title={`Delete WooCommerce order #${deleting.number}?`} text="This permanently deletes the order in WooCommerce. It cannot be undone." onClose={() => setDeleting(null)}
        onConfirm={async () => { await api(`/admin/woocommerce/orders/${deleting.id}`, { method: 'DELETE' }); setDeleting(null); reload(); }} />}
    </>
  );
}
