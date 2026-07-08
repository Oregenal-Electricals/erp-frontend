'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import DocumentAttachments from '@/components/shared/DocumentAttachments';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('erp_token'); }

const STATUS_COLORS = {
  DRAFT: 'bg-gray-100 text-gray-600',
  SENT: 'bg-blue-100 text-blue-700',
  CLOSED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-600',
};

export default function RfqListPage() {
  const [rfqs, setRfqs] = useState([]);
  const [stats, setStats] = useState(null);
  const [prs, setPrs] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ prId: '', title: '', responseDeadline: '', deliveryLocation: '', paymentTerms: '', notes: '', vendorIds: [] });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchStats = useCallback(async () => {
    const res = await fetch(`${API}/rfqs/stats`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) setStats(await res.json());
  }, []);

  const fetchRfqs = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit: 20 });
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    const res = await fetch(`${API}/rfqs?${params}`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) { const d = await res.json(); setRfqs(d.data); setTotalPages(d.totalPages); setTotal(d.total); }
    setLoading(false);
  }, [page, search, status]);

  const fetchPrs = useCallback(async () => {
    const res = await fetch(`${API}/purchase-requisitions?status=APPROVED&limit=100`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) { const d = await res.json(); setPrs(d.data || []); }
  }, []);

  const fetchVendors = useCallback(async () => {
    const res = await fetch(`${API}/vendors?limit=200&isActive=true`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) { const d = await res.json(); setVendors(d.data || []); }
  }, []);

  useEffect(() => { fetchStats(); fetchPrs(); fetchVendors(); }, [fetchStats, fetchPrs, fetchVendors]);
  useEffect(() => { fetchRfqs(); }, [fetchRfqs]);

  function toggleVendor(id) {
    setForm(f => ({
      ...f,
      vendorIds: f.vendorIds.includes(id) ? f.vendorIds.filter(v => v !== id) : [...f.vendorIds, id]
    }));
  }

  async function handleCreate() {
    setSaving(true); setError('');
    const body = { ...form, responseDeadline: new Date(form.responseDeadline).toISOString() };
    if (!body.deliveryLocation) delete body.deliveryLocation;
    if (!body.paymentTerms) delete body.paymentTerms;
    if (!body.notes) delete body.notes;
    const res = await fetch(`${API}/rfqs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (res.ok) { setShowModal(false); fetchRfqs(); fetchStats(); }
    else setError(data.message || 'Failed');
    setSaving(false);
  }

  async function handleAction(id, action) {
    await fetch(`${API}/rfqs/${id}/${action}`, { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` } });
    fetchRfqs(); fetchStats();
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">RFQ Management</h1>
            <p className="text-gray-500 text-sm mt-1">Request for Quotation — send to multiple vendors</p>
          </div>
          <button onClick={() => { setForm({ prId: '', title: '', responseDeadline: '', deliveryLocation: '', paymentTerms: '', notes: '', vendorIds: [] }); setError(''); setShowModal(true); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium">+ Create RFQ</button>
        </div>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            {[
              { label: 'Total', value: stats.total, color: 'bg-gray-50' },
              { label: 'Draft', value: stats.draft, color: 'bg-gray-100' },
              { label: 'Sent', value: stats.sent, color: 'bg-blue-50' },
              { label: 'Closed', value: stats.closed, color: 'bg-green-50' },
              { label: 'Cancelled', value: stats.cancelled, color: 'bg-red-50' },
            ].map(s => (
              <div key={s.label} className={`${s.color} rounded-lg p-4 text-center`}>
                <div className="text-2xl font-bold text-gray-800">{s.value}</div>
                <div className="text-xs text-gray-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-4 border-b flex gap-3 flex-wrap">
            <input className="border rounded-lg px-3 py-2 text-sm flex-1 min-w-48" placeholder="Search RFQ number, title..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
            <select className="border rounded-lg px-3 py-2 text-sm" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
              <option value="">All Status</option>
              {['DRAFT','SENT','CLOSED','CANCELLED'].map(s => <option key={s}>{s}</option>)}
            </select>
            <span className="text-sm text-gray-500 self-center">{total} RFQs</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
                <tr>{['RFQ No.', 'Title', 'PR Ref', 'Vendors', 'Items', 'Deadline', 'Status', 'Actions'].map(h => <th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={8} className="text-center py-10 text-gray-400">Loading...</td></tr>
                ) : rfqs.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-10 text-gray-400">No RFQs found</td></tr>
                ) : rfqs.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono font-medium text-blue-600">{r.rfqNumber}</td>
                    <td className="px-4 py-3 font-medium text-gray-900 max-w-xs truncate">{r.title}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{r.pr?.prNumber}</td>
                    <td className="px-4 py-3 text-gray-600">{r._count?.vendors || 0}</td>
                    <td className="px-4 py-3 text-gray-600">{r._count?.items || 0}</td>
                    <td className="px-4 py-3 text-gray-600">{r.responseDeadline ? new Date(r.responseDeadline).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[r.status]}`}>{r.status}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Link href={`/purchase/rfqs/${r.id}`} className="text-blue-600 hover:underline text-xs">View</Link>
                        {r.status === 'DRAFT' && <button onClick={() => handleAction(r.id, 'send')} className="text-blue-600 hover:underline text-xs">Send</button>}
                        {r.status === 'SENT' && <button onClick={() => handleAction(r.id, 'close')} className="text-green-600 hover:underline text-xs">Close</button>}
                        {['DRAFT','SENT'].includes(r.status) && <button onClick={() => handleAction(r.id, 'cancel')} className="text-red-500 hover:underline text-xs">Cancel</button>}
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
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-screen overflow-y-auto">
              <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-white">
                <h2 className="text-lg font-bold">Create RFQ</h2>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
              </div>
              <div className="p-6 space-y-4">
                {error && <div className="bg-red-50 text-red-600 px-4 py-2 rounded text-sm">{error}</div>}
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-600 mb-1">Approved PR *</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.prId} onChange={e => {
                      const pr = prs.find(p => p.id === e.target.value);
                      setForm(f => ({ ...f, prId: e.target.value, title: pr ? `RFQ - ${pr.title}` : f.title }));
                    }}>
                      <option value="">— Select Approved PR —</option>
                      {prs.map(p => <option key={p.id} value={p.id}>{p.prNumber} — {p.title}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-600 mb-1">RFQ Title *</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Response Deadline *</label>
                    <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.responseDeadline} onChange={e => setForm(f => ({ ...f, responseDeadline: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Payment Terms</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.paymentTerms} onChange={e => setForm(f => ({ ...f, paymentTerms: e.target.value }))}>
                      <option value="">— Select —</option>
                      {['NET_30','NET_45','NET_60','ADVANCE','COD'].map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-600 mb-1">Delivery Location</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.deliveryLocation} onChange={e => setForm(f => ({ ...f, deliveryLocation: e.target.value }))} />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-600 mb-2">Select Vendors *</label>
                    <div className="border rounded-lg max-h-40 overflow-y-auto divide-y">
                      {vendors.map(v => (
                        <label key={v.id} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                          <input type="checkbox" checked={form.vendorIds.includes(v.id)} onChange={() => toggleVendor(v.id)} />
                          <span className="text-sm">{v.code} — {v.name}</span>
                        </label>
                      ))}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{form.vendorIds.length} vendor(s) selected</div>
                  </div>
                </div>

              <DocumentAttachments referenceType="RFQ" referenceId={viewDetail?.id} referenceNumber={viewDetail?.rfqNumber} title="RFQ Attachments" />
              </div>
              <div className="p-6 border-t flex justify-end gap-3 sticky bottom-0 bg-white">
                <button onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg text-sm text-gray-600">Cancel</button>
                <button onClick={handleCreate} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">{saving ? 'Creating...' : 'Create RFQ'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
