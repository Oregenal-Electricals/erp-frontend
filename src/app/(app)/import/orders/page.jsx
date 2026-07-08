'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('erp_token'); }

const STATUS_COLORS = {
  DRAFT: 'bg-gray-100 text-gray-600',
  APPROVED: 'bg-blue-100 text-blue-700',
  SENT: 'bg-purple-100 text-purple-700',
  PROFORMA_RECEIVED: 'bg-yellow-100 text-yellow-700',
  LC_OPENED: 'bg-orange-100 text-orange-700',
  SHIPPED: 'bg-indigo-100 text-indigo-700',
  CUSTOMS_CLEARED: 'bg-teal-100 text-teal-700',
  CLOSED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-600',
};

const STATUS_FLOW = {
  APPROVED: 'SENT',
  SENT: 'PROFORMA_RECEIVED',
  PROFORMA_RECEIVED: 'LC_OPENED',
  LC_OPENED: 'SHIPPED',
  SHIPPED: 'CUSTOMS_CLEARED',
  CUSTOMS_CLEARED: 'CLOSED',
};

const CURRENCIES = ['USD', 'EUR', 'CNY', 'GBP', 'JPY', 'SGD'];
const INCOTERMS = ['FOB', 'CIF', 'EXW', 'CFR', 'DDP', 'FCA'];
const PAYMENT_MODES = ['LC', 'TT', 'DP', 'DA'];

export default function ImportOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [currency, setCurrency] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ vendorId: '', deliveryDate: '', currency: 'USD', exchangeRate: '', incoterms: 'CIF', portOfLoading: '', portOfDischarge: 'Chennai', paymentMode: 'LC', paymentTerms: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit: 20 });
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    if (currency) params.set('currency', currency);
    const [ordRes, statsRes, vendRes] = await Promise.all([
      fetch(`${API}/import-orders?${params}`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/import-orders/stats`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/vendors?limit=200&isActive=true`, { headers: { Authorization: `Bearer ${getToken()}` } }),
    ]);
    if (ordRes.ok) { const d = await ordRes.json(); setOrders(d.data); setTotalPages(d.totalPages); setTotal(d.total); }
    if (statsRes.ok) setStats(await statsRes.json());
    if (vendRes.ok) { const d = await vendRes.json(); setVendors(d.data || []); }
    setLoading(false);
  }, [page, search, status, currency]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  async function handleCreate() {
    setSaving(true); setError('');
    const body = { ...form, exchangeRate: parseFloat(form.exchangeRate), deliveryDate: new Date(form.deliveryDate).toISOString() };
    if (!body.portOfLoading) delete body.portOfLoading;
    if (!body.notes) delete body.notes;
    const res = await fetch(`${API}/import-orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (res.ok) { setShowModal(false); window.location.href = `/import/orders/${data.id}`; }
    else setError(data.message || 'Failed');
    setSaving(false);
  }

  async function handleNextStatus(id, currentStatus) {
    const nextStatus = STATUS_FLOW[currentStatus];
    if (!nextStatus) return;
    await fetch(`${API}/import-orders/${id}/status/${nextStatus}`, { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` } });
    fetchAll();
  }

  async function handleApprove(id) {
    await fetch(`${API}/import-orders/${id}/approve`, { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` } });
    fetchAll();
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Import Purchase Orders</h1>
            <p className="text-gray-500 text-sm mt-1">International procurement with multi-currency support</p>
          </div>
          <button onClick={() => { setForm({ vendorId: '', deliveryDate: '', currency: 'USD', exchangeRate: '', incoterms: 'CIF', portOfLoading: '', portOfDischarge: 'Chennai', paymentMode: 'LC', paymentTerms: '', notes: '' }); setError(''); setShowModal(true); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium">+ New Import PO</button>
        </div>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            {[
              { label: 'Total IPOs', value: stats.total, color: 'bg-gray-50' },
              { label: 'In Progress', value: stats.approved + (stats.shipped || 0), color: 'bg-blue-50' },
              { label: 'Total Value (INR)', value: `₹${(stats.totalValueInr || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, color: 'bg-green-50' },
              { label: 'Closed', value: stats.closed, color: 'bg-gray-100' },
            ].map(s => (
              <div key={s.label} className={`${s.color} rounded-lg p-4 text-center`}>
                <div className="text-xl font-bold text-gray-800">{s.value}</div>
                <div className="text-xs text-gray-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {stats?.byCurrency?.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 flex gap-4 flex-wrap">
            <span className="text-xs font-semibold text-gray-500 self-center">BY CURRENCY:</span>
            {stats.byCurrency.map(c => (
              <div key={c.currency} className="bg-gray-50 rounded-lg px-3 py-2 text-xs">
                <span className="font-bold text-gray-700">{c.currency}</span>
                <span className="text-gray-500 ml-2">{c._count} orders · ${(c._sum.subtotalForeign || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
              </div>
            ))}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-4 border-b flex gap-3 flex-wrap">
            <input className="border rounded-lg px-3 py-2 text-sm flex-1 min-w-48" placeholder="Search IPO number, vendor..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
            <select className="border rounded-lg px-3 py-2 text-sm" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
              <option value="">All Status</option>
              {Object.keys(STATUS_COLORS).map(s => <option key={s}>{s}</option>)}
            </select>
            <select className="border rounded-lg px-3 py-2 text-sm" value={currency} onChange={e => { setCurrency(e.target.value); setPage(1); }}>
              <option value="">All Currencies</option>
              {CURRENCIES.map(c => <option key={c}>{c}</option>)}
            </select>
            <span className="text-sm text-gray-500 self-center">{total} IPOs</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
                <tr>{['IPO No.', 'Vendor', 'Currency', 'Exchange Rate', 'Incoterms', 'Port', 'Items', 'Foreign Value', 'INR Value', 'Status', 'Actions'].map(h => <th key={h} className="px-3 py-3 text-left">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={11} className="text-center py-10 text-gray-400">Loading...</td></tr>
                ) : orders.length === 0 ? (
                  <tr><td colSpan={11} className="text-center py-10 text-gray-400">No import orders found</td></tr>
                ) : orders.map(o => (
                  <tr key={o.id} className="hover:bg-gray-50">
                    <td className="px-3 py-3 font-mono font-medium text-blue-600 text-xs">{o.ipoNumber}</td>
                    <td className="px-3 py-3">
                      <div className="font-medium text-gray-900 text-xs">{o.vendor?.name}</div>
                      <div className="text-xs text-gray-400">{o.vendor?.code}</div>
                    </td>
                    <td className="px-3 py-3 font-bold text-gray-700">{o.currency}</td>
                    <td className="px-3 py-3 text-gray-600">₹{o.exchangeRate}</td>
                    <td className="px-3 py-3"><span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs font-medium">{o.incoterms}</span></td>
                    <td className="px-3 py-3 text-gray-500 text-xs">{o.portOfDischarge || '—'}</td>
                    <td className="px-3 py-3 text-gray-600">{o._count?.items || 0}</td>
                    <td className="px-3 py-3 font-medium text-gray-800">${o.subtotalForeign?.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                    <td className="px-3 py-3 font-bold text-gray-900">₹{o.totalAmount?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                    <td className="px-3 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[o.status]}`}>{o.status?.replace(/_/g, ' ')}</span></td>
                    <td className="px-3 py-3">
                      <div className="flex gap-2">
                        <Link href={`/import/orders/${o.id}`} className="text-blue-600 hover:underline text-xs">View</Link>
                        {o.status === 'DRAFT' && <button onClick={() => handleApprove(o.id)} className="text-green-600 hover:underline text-xs">Approve</button>}
                        {STATUS_FLOW[o.status] && <button onClick={() => handleNextStatus(o.id, o.status)} className="text-purple-600 hover:underline text-xs">→ {STATUS_FLOW[o.status]?.replace(/_/g, ' ')}</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="p-4 border-t flex justify-center gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 rounded border text-sm disabled:opacity-40">Prev</button>
              <span className="px-3 py-1 text-sm">{page} of {totalPages}</span>
              <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1 rounded border text-sm disabled:opacity-40">Next</button>
            </div>
          )}
        </div>

        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
              <div className="p-6 border-b flex justify-between">
                <h2 className="text-lg font-bold">New Import Purchase Order</h2>
                <button onClick={() => setShowModal(false)} className="text-gray-400 text-xl">✕</button>
              </div>
              <div className="p-6 space-y-4">
                {error && <div className="bg-red-50 text-red-600 px-3 py-2 rounded text-sm">{error}</div>}
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-600 mb-1">Vendor *</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.vendorId} onChange={e => setForm(f => ({ ...f, vendorId: e.target.value }))}>
                      <option value="">— Select Vendor —</option>
                      {vendors.map(v => <option key={v.id} value={v.id}>{v.code} — {v.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Currency *</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}>
                      {CURRENCIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Exchange Rate (₹) *</label>
                    <input type="number" step="0.01" className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="e.g. 83.50" value={form.exchangeRate} onChange={e => setForm(f => ({ ...f, exchangeRate: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Incoterms</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.incoterms} onChange={e => setForm(f => ({ ...f, incoterms: e.target.value }))}>
                      {INCOTERMS.map(i => <option key={i}>{i}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Payment Mode</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.paymentMode} onChange={e => setForm(f => ({ ...f, paymentMode: e.target.value }))}>
                      {PAYMENT_MODES.map(m => <option key={m}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Port of Loading</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Shanghai, Shenzhen..." value={form.portOfLoading} onChange={e => setForm(f => ({ ...f, portOfLoading: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Port of Discharge</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Chennai, Mumbai..." value={form.portOfDischarge} onChange={e => setForm(f => ({ ...f, portOfDischarge: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Expected Delivery *</label>
                    <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.deliveryDate} onChange={e => setForm(f => ({ ...f, deliveryDate: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Payment Terms</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="e.g. LC 90 days" value={form.paymentTerms} onChange={e => setForm(f => ({ ...f, paymentTerms: e.target.value }))} />
                  </div>
                </div>
                <div className="bg-blue-50 rounded p-3 text-xs text-blue-700">
                  ℹ️ After creating, add items in the IPO detail page. Costs include BCD (Basic Customs Duty) + IGST.
                </div>
              </div>
              <div className="p-6 border-t flex justify-end gap-3">
                <button onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg text-sm text-gray-600">Cancel</button>
                <button onClick={handleCreate} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">{saving ? 'Creating...' : 'Create Import PO'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
