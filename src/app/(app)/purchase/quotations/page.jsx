'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('accessToken'); }

const STATUS_COLORS = {
  DRAFT: 'bg-gray-100 text-gray-600',
  SUBMITTED: 'bg-yellow-100 text-yellow-700',
  FINALIZED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-600',
};

export default function VendorQuotationsPage() {
  const [quotations, setQuotations] = useState([]);
  const [stats, setStats] = useState(null);
  const [rfqs, setRfqs] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ rfqId: '', vendorId: '', validUntil: '', deliveryDays: 30, paymentTerms: '', notes: '' });
  const [rfqVendors, setRfqVendors] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchStats = useCallback(async () => {
    const res = await fetch(`${API}/vendor-quotations/stats`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) setStats(await res.json());
  }, []);

  const fetchQuotations = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit: 20 });
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    const res = await fetch(`${API}/vendor-quotations?${params}`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) { const d = await res.json(); setQuotations(d.data); setTotalPages(d.totalPages); setTotal(d.total); }
    setLoading(false);
  }, [page, search, status]);

  const fetchRfqs = useCallback(async () => {
    const res = await fetch(`${API}/rfqs?status=SENT&limit=100`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) { const d = await res.json(); setRfqs(d.data || []); }
  }, []);

  useEffect(() => { fetchStats(); fetchRfqs(); }, [fetchStats, fetchRfqs]);
  useEffect(() => { fetchQuotations(); }, [fetchQuotations]);

  async function handleRfqChange(rfqId) {
    setForm(f => ({ ...f, rfqId, vendorId: '' }));
    if (!rfqId) { setRfqVendors([]); return; }
    const res = await fetch(`${API}/rfqs/${rfqId}`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) {
      const rfq = await res.json();
      setRfqVendors(rfq.vendors?.filter(v => v.status === 'INVITED') || []);
    }
  }

  async function handleCreate() {
    setSaving(true); setError('');
    const body = { ...form, validUntil: new Date(form.validUntil).toISOString(), deliveryDays: parseInt(form.deliveryDays) };
    if (!body.paymentTerms) delete body.paymentTerms;
    if (!body.notes) delete body.notes;
    const res = await fetch(`${API}/vendor-quotations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (res.ok) { setShowModal(false); fetchQuotations(); fetchStats(); }
    else setError(data.message || 'Failed');
    setSaving(false);
  }

  async function handleAction(id, action) {
    const res = await fetch(`${API}/vendor-quotations/${id}/${action}`, { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) { fetchQuotations(); fetchStats(); }
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Vendor Quotations</h1>
            <p className="text-gray-500 text-sm mt-1">Record vendor pricing responses to RFQs</p>
          </div>
          <button onClick={() => { setForm({ rfqId: '', vendorId: '', validUntil: '', deliveryDays: 30, paymentTerms: '', notes: '' }); setRfqVendors([]); setError(''); setShowModal(true); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium">+ New Quotation</button>
        </div>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            {[
              { label: 'Total', value: stats.total, color: 'bg-gray-50' },
              { label: 'Draft', value: stats.draft, color: 'bg-gray-100' },
              { label: 'Submitted', value: stats.submitted, color: 'bg-yellow-50' },
              { label: 'Finalized', value: stats.finalized, color: 'bg-green-50' },
              { label: 'Rejected', value: stats.rejected, color: 'bg-red-50' },
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
            <input className="border rounded-lg px-3 py-2 text-sm flex-1 min-w-48" placeholder="Search quotation number, vendor..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
            <select className="border rounded-lg px-3 py-2 text-sm" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
              <option value="">All Status</option>
              {['DRAFT','SUBMITTED','FINALIZED','REJECTED'].map(s => <option key={s}>{s}</option>)}
            </select>
            <span className="text-sm text-gray-500 self-center">{total} quotations</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
                <tr>{['VQ No.', 'Vendor', 'RFQ Ref', 'Items', 'Total Amount', 'Valid Until', 'Delivery', 'Status', 'Actions'].map(h => <th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={9} className="text-center py-10 text-gray-400">Loading...</td></tr>
                ) : quotations.length === 0 ? (
                  <tr><td colSpan={9} className="text-center py-10 text-gray-400">No vendor quotations found</td></tr>
                ) : quotations.map(q => (
                  <tr key={q.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono font-medium text-blue-600">{q.quotationNumber}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{q.vendor?.name}</div>
                      <div className="text-xs text-gray-400 font-mono">{q.vendor?.code}</div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{q.rfq?.rfqNumber}</td>
                    <td className="px-4 py-3 text-gray-600">{q._count?.items || 0}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">{q.totalAmount ? `₹${q.totalAmount.toLocaleString()}` : '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{q.validUntil ? new Date(q.validUntil).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{q.deliveryDays} days</td>
                    <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[q.status]}`}>{q.status}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Link href={`/purchase/quotations/${q.id}`} className="text-blue-600 hover:underline text-xs">View</Link>
                        {q.status === 'SUBMITTED' && <button onClick={() => handleAction(q.id, 'finalize')} className="text-green-600 hover:underline text-xs">Finalize</button>}
                        {['DRAFT','SUBMITTED'].includes(q.status) && <button onClick={() => handleAction(q.id, 'reject')} className="text-red-500 hover:underline text-xs">Reject</button>}
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
                <h2 className="text-lg font-bold">Record Vendor Quotation</h2>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
              </div>
              <div className="p-6 space-y-4">
                {error && <div className="bg-red-50 text-red-600 px-4 py-2 rounded text-sm">{error}</div>}
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-600 mb-1">RFQ (SENT) *</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.rfqId} onChange={e => handleRfqChange(e.target.value)}>
                      <option value="">— Select RFQ —</option>
                      {rfqs.map(r => <option key={r.id} value={r.id}>{r.rfqNumber} — {r.title}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-600 mb-1">Vendor *</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.vendorId} onChange={e => setForm(f => ({ ...f, vendorId: e.target.value }))} disabled={!form.rfqId}>
                      <option value="">— Select Vendor from RFQ —</option>
                      {rfqVendors.map(rv => <option key={rv.vendorId} value={rv.vendorId}>{rv.vendor?.code} — {rv.vendor?.name}</option>)}
                    </select>
                    {form.rfqId && rfqVendors.length === 0 && <p className="text-xs text-orange-500 mt-1">No uninvited vendors remaining in this RFQ</p>}
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Valid Until *</label>
                    <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.validUntil} onChange={e => setForm(f => ({ ...f, validUntil: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Delivery Days</label>
                    <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.deliveryDays} onChange={e => setForm(f => ({ ...f, deliveryDays: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Payment Terms</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.paymentTerms} onChange={e => setForm(f => ({ ...f, paymentTerms: e.target.value }))}>
                      <option value="">— Select —</option>
                      {['NET_30','NET_45','NET_60','ADVANCE','COD'].map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-600 mb-1">Notes</label>
                    <textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                  </div>
                </div>
                <div className="bg-blue-50 rounded p-3 text-xs text-blue-700">
                  💡 After creating, open the quotation to enter pricing for each item.
                </div>
              </div>
              <div className="p-6 border-t flex justify-end gap-3">
                <button onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg text-sm text-gray-600">Cancel</button>
                <button onClick={handleCreate} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">{saving ? 'Creating...' : 'Create Quotation'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
