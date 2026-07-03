'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import DocumentAttachments from '@/components/shared/DocumentAttachments';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('accessToken'); }

  async function downloadExcel(endpoint, filename) {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${endpoint}`, {headers:{Authorization:`Bearer ${getToken()}`}});
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href=url; a.download=filename+'.xlsx'; a.click();
      URL.revokeObjectURL(url);
    }
  }


const STATUS_COLORS = {
  DRAFT: 'bg-gray-100 text-gray-600',
  APPROVED: 'bg-blue-100 text-blue-700',
  SENT: 'bg-purple-100 text-purple-700',
  PARTIALLY_RECEIVED: 'bg-yellow-100 text-yellow-700',
  CLOSED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-600',
};

export default function PurchaseOrdersPage() {
  const [pos, setPos] = useState([]);
  const [stats, setStats] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ vendorId: '', deliveryDate: '', deliveryAddress: '', paymentTerms: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchStats = useCallback(async () => {
    const res = await fetch(`${API}/purchase-orders/stats`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) setStats(await res.json());
  }, []);

  const fetchPos = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit: 20 });
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    const res = await fetch(`${API}/purchase-orders?${params}`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) { const d = await res.json(); setPos(d.data); setTotalPages(d.totalPages); setTotal(d.total); }
    setLoading(false);
  }, [page, search, status]);

  const fetchVendors = useCallback(async () => {
    const res = await fetch(`${API}/vendors?limit=200&isActive=true`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) { const d = await res.json(); setVendors(d.data || []); }
  }, []);

  useEffect(() => { fetchStats(); fetchVendors(); }, [fetchStats, fetchVendors]);
  useEffect(() => { fetchPos(); }, [fetchPos]);

  async function handleCreate() {
    setSaving(true); setError('');
    const body = { ...form, deliveryDate: new Date(form.deliveryDate).toISOString() };
    if (!body.deliveryAddress) delete body.deliveryAddress;
    if (!body.paymentTerms) delete body.paymentTerms;
    if (!body.notes) delete body.notes;
    const res = await fetch(`${API}/purchase-orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (res.ok) { setShowModal(false); window.location.href = `/purchase/orders/${data.id}`; }
    else setError(data.message || 'Failed');
    setSaving(false);
  }

  async function handleAction(id, action) {
    await fetch(`${API}/purchase-orders/${id}/${action}`, { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` } });
    fetchPos(); fetchStats();
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Purchase Orders</h1>
            <p className="text-gray-500 text-sm mt-1">Legally binding purchase documents — prices frozen after approval</p>
          </div>
          <button onClick={() => { setForm({ vendorId: '', deliveryDate: '', deliveryAddress: '', paymentTerms: '', notes: '' }); setError(''); setShowModal(true); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium">+ New PO</button>
          <button onClick={()=>downloadExcel('/excel/purchase-orders','Purchase Orders')} className="px-3 py-2 text-sm border border-green-300 text-green-700 rounded-lg hover:bg-green-50">⬇ Excel</button>
        </div>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            {[
              { label: 'Total POs', value: stats.total, color: 'bg-gray-50' },
              { label: 'Draft', value: stats.draft, color: 'bg-gray-100' },
              { label: 'Approved', value: stats.approved, color: 'bg-blue-50' },
              { label: 'Sent', value: stats.sent, color: 'bg-purple-50' },
            ].map(s => (
              <div key={s.label} className={`${s.color} rounded-lg p-4 text-center`}>
                <div className="text-2xl font-bold text-gray-800">{s.value}</div>
                <div className="text-xs text-gray-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {stats && (
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl p-4 mb-6 text-white flex justify-between items-center">
            <div>
              <div className="text-sm opacity-80">Total PO Value</div>
              <div className="text-3xl font-bold">₹{stats.totalValue?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
            </div>
            <div className="text-right text-sm opacity-80">
              <div>{stats.partiallyReceived} partially received</div>
              <div>{stats.closed} closed</div>
              <div>{stats.cancelled} cancelled</div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-4 border-b flex gap-3 flex-wrap">
            <input className="border rounded-lg px-3 py-2 text-sm flex-1 min-w-48" placeholder="Search PO number, vendor..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
            <select className="border rounded-lg px-3 py-2 text-sm" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
              <option value="">All Status</option>
              {['DRAFT','APPROVED','SENT','PARTIALLY_RECEIVED','CLOSED','CANCELLED'].map(s => <option key={s}>{s}</option>)}
            </select>
            <span className="text-sm text-gray-500 self-center">{total} POs</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
                <tr>{['PO No.', 'Vendor', 'PO Date', 'Delivery Date', 'Items', 'Subtotal', 'Tax', 'Total', 'Status', 'Actions'].map(h => <th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={10} className="text-center py-10 text-gray-400">Loading...</td></tr>
                ) : pos.length === 0 ? (
                  <tr><td colSpan={10} className="text-center py-10 text-gray-400">No purchase orders found</td></tr>
                ) : pos.map(po => (
                  <tr key={po.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono font-medium text-blue-600">{po.poNumber}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{po.vendor?.name}</div>
                      <div className="text-xs text-gray-400 font-mono">{po.vendor?.code}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{new Date(po.poDate).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-gray-600">{new Date(po.deliveryDate).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-gray-600">{po._count?.items || 0}</td>
                    <td className="px-4 py-3 text-gray-700">₹{po.subtotal?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                    <td className="px-4 py-3 text-gray-600">₹{po.totalTax?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                    <td className="px-4 py-3 font-bold text-gray-900">₹{po.totalAmount?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[po.status]}`}>{po.status}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Link href={`/purchase/orders/${po.id}`} className="text-blue-600 hover:underline text-xs">View</Link>
                        {po.status === 'DRAFT' && <button onClick={() => handleAction(po.id, 'approve')} className="text-blue-600 hover:underline text-xs">Approve</button>}
                        {po.status === 'APPROVED' && <button onClick={() => handleAction(po.id, 'send')} className="text-purple-600 hover:underline text-xs">Send</button>}
                        {['DRAFT','APPROVED'].includes(po.status) && <button onClick={() => handleAction(po.id, 'cancel')} className="text-red-500 hover:underline text-xs">Cancel</button>}
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
              <div className="p-6 border-b flex justify-between items-center">
                <h2 className="text-lg font-bold">New Purchase Order</h2>
                <button onClick={() => setShowModal(false)} className="text-gray-400 text-xl">✕</button>
              </div>
              <div className="p-6 space-y-4">
                {error && <div className="bg-red-50 text-red-600 px-4 py-2 rounded text-sm">{error}</div>}
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-600 mb-1">Vendor *</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.vendorId} onChange={e => setForm(f => ({ ...f, vendorId: e.target.value }))}>
                      <option value="">— Select Vendor —</option>
                      {vendors.map(v => <option key={v.id} value={v.id}>{v.code} — {v.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Delivery Date *</label>
                    <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.deliveryDate} onChange={e => setForm(f => ({ ...f, deliveryDate: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Payment Terms</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.paymentTerms} onChange={e => setForm(f => ({ ...f, paymentTerms: e.target.value }))}>
                      <option value="">— Select —</option>
                      {['NET_30','NET_45','NET_60','ADVANCE','COD'].map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-600 mb-1">Delivery Address</label>
                    <textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} value={form.deliveryAddress} onChange={e => setForm(f => ({ ...f, deliveryAddress: e.target.value }))} />
                  </div>
                </div>
                <div className="bg-yellow-50 rounded p-3 text-xs text-yellow-700">
                  ⚠️ After creating, add items in the PO detail page before approving. Prices are frozen after approval.
                </div>
              </div>
              <div className="p-6 border-t flex justify-end gap-3">
                <button onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg text-sm text-gray-600">Cancel</button>
                <button onClick={handleCreate} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">{saving ? 'Creating...' : 'Create PO'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
