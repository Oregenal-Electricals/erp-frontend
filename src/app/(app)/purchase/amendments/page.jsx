'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import DocumentAttachments from '@/components/shared/DocumentAttachments';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('erp_token'); }

const STATUS_COLORS = {
  DRAFT: 'bg-gray-100 text-gray-600',
  SUBMITTED: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-600',
};

const TYPE_COLORS = {
  QUANTITY_CHANGE: 'bg-blue-100 text-blue-700',
  DATE_CHANGE: 'bg-purple-100 text-purple-700',
  ITEM_ADDITION: 'bg-green-100 text-green-700',
  ITEM_CANCELLATION: 'bg-red-100 text-red-600',
  PRICE_CORRECTION: 'bg-orange-100 text-orange-700',
  GENERAL: 'bg-gray-100 text-gray-600',
};

const AMENDMENT_TYPES = ['QUANTITY_CHANGE', 'DATE_CHANGE', 'ITEM_ADDITION', 'ITEM_CANCELLATION', 'PRICE_CORRECTION', 'GENERAL'];

export default function PoAmendmentsPage() {
  const [amendments, setAmendments] = useState([]);
  const [stats, setStats] = useState(null);
  const [pos, setPos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(null);
  const [form, setForm] = useState({ poId: '', amendmentType: 'GENERAL', reason: '', changes: '' });
  const [rejectReason, setRejectReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit: 20 });
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    const [amdRes, statsRes, posRes] = await Promise.all([
      fetch(`${API}/po-amendments?${params}`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/po-amendments/stats`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/purchase-orders?limit=200`, { headers: { Authorization: `Bearer ${getToken()}` } }),
    ]);
    if (amdRes.ok) { const d = await amdRes.json(); setAmendments(d.data); setTotalPages(d.totalPages); setTotal(d.total); }
    if (statsRes.ok) setStats(await statsRes.json());
    if (posRes.ok) { const d = await posRes.json(); setPos(d.data.filter(p => ['APPROVED','SENT','PARTIALLY_RECEIVED'].includes(p.status))); }
    setLoading(false);
  }, [page, search, status]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  async function handleCreate() {
    setSaving(true); setError('');
    const body = { poId: form.poId, amendmentType: form.amendmentType, reason: form.reason };
    if (form.changes.trim()) {
      try { body.changes = JSON.parse(form.changes); } catch { body.changes = { description: form.changes }; }
    }
    const res = await fetch(`${API}/po-amendments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (res.ok) { setShowModal(false); fetchAll(); }
    else setError(data.message || 'Failed');
    setSaving(false);
  }

  async function handleAction(id, action) {
    await fetch(`${API}/po-amendments/${id}/${action}`, { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` } });
    fetchAll();
  }

  async function handleReject() {
    if (!rejectReason.trim()) { setError('Rejection reason required'); return; }
    setSaving(true);
    await fetch(`${API}/po-amendments/${showRejectModal}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ rejectionReason: rejectReason }),
    });
    setShowRejectModal(null); setRejectReason(''); fetchAll(); setSaving(false);
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">PO Amendments</h1>
            <p className="text-gray-500 text-sm mt-1">Formal change requests for approved purchase orders</p>
          </div>
          <button onClick={() => { setForm({ poId: '', amendmentType: 'GENERAL', reason: '', changes: '' }); setError(''); setShowModal(true); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium">+ New Amendment</button>
        </div>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            {[
              { label: 'Total', value: stats.total, color: 'bg-gray-50' },
              { label: 'Draft', value: stats.draft, color: 'bg-gray-100' },
              { label: 'Submitted', value: stats.submitted, color: 'bg-yellow-50' },
              { label: 'Approved', value: stats.approved, color: 'bg-green-50' },
              { label: 'Rejected', value: stats.rejected, color: 'bg-red-50' },
            ].map(s => (
              <div key={s.label} className={`${s.color} rounded-lg p-4 text-center`}>
                <div className="text-2xl font-bold text-gray-800">{s.value}</div>
                <div className="text-xs text-gray-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {stats?.byType?.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
            <div className="text-xs font-semibold text-gray-500 mb-3 uppercase">By Amendment Type</div>
            <div className="flex gap-3 flex-wrap">
              {stats.byType.map(t => (
                <div key={t.amendmentType} className={`px-3 py-1.5 rounded-full text-xs font-medium ${TYPE_COLORS[t.amendmentType]}`}>
                  {t.amendmentType.replace(/_/g,' ')} ({t._count})
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-4 border-b flex gap-3 flex-wrap">
            <input className="border rounded-lg px-3 py-2 text-sm flex-1 min-w-48" placeholder="Search amendment number, reason..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
            <select className="border rounded-lg px-3 py-2 text-sm" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
              <option value="">All Status</option>
              {['DRAFT','SUBMITTED','APPROVED','REJECTED'].map(s => <option key={s}>{s}</option>)}
            </select>
            <span className="text-sm text-gray-500 self-center">{total} amendments</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
                <tr>{['Amendment No.', 'PO Reference', 'Vendor', 'Type', 'Reason', 'Requested', 'Status', 'Actions'].map(h => <th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={8} className="text-center py-10 text-gray-400">Loading...</td></tr>
                ) : amendments.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-10 text-gray-400">No amendments found</td></tr>
                ) : amendments.map(a => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono font-medium text-blue-600 text-xs">{a.amendmentNumber}</td>
                    <td className="px-4 py-3">
                      <Link href={`/purchase/orders/${a.poId}`} className="font-mono text-xs text-blue-500 hover:underline">{a.po?.poNumber}</Link>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{a.po?.vendor?.name}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${TYPE_COLORS[a.amendmentType]}`}>{a.amendmentType?.replace(/_/g,' ')}</span></td>
                    <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{a.reason}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{new Date(a.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[a.status]}`}>{a.status}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {a.status === 'DRAFT' && <button onClick={() => handleAction(a.id, 'submit')} className="text-yellow-600 hover:underline text-xs">Submit</button>}
                        {a.status === 'SUBMITTED' && <button onClick={() => handleAction(a.id, 'approve')} className="text-green-600 hover:underline text-xs">Approve</button>}
                        {a.status === 'SUBMITTED' && <button onClick={() => { setShowRejectModal(a.id); setRejectReason(''); setError(''); }} className="text-red-500 hover:underline text-xs">Reject</button>}
                        {a.status === 'APPROVED' && <span className="text-xs text-gray-400">Locked</span>}
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
                <h2 className="text-lg font-bold">New PO Amendment</h2>
                <button onClick={() => setShowModal(false)} className="text-gray-400 text-xl">✕</button>
              </div>
              <div className="p-6 space-y-4">
                {error && <div className="bg-red-50 text-red-600 px-3 py-2 rounded text-sm">{error}</div>}
                <div className="bg-yellow-50 rounded p-3 text-xs text-yellow-700">
                  ⚠️ Amendment is a formal change request. Original PO remains unchanged until amendment is approved.
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-600 mb-1">Purchase Order *</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.poId} onChange={e => setForm(f => ({ ...f, poId: e.target.value }))}>
                      <option value="">— Select PO (Approved/Sent) —</option>
                      {pos.map(p => <option key={p.id} value={p.id}>{p.poNumber} — {p.vendor?.name} ({p.status})</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-600 mb-1">Amendment Type</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.amendmentType} onChange={e => setForm(f => ({ ...f, amendmentType: e.target.value }))}>
                      {AMENDMENT_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g,' ')}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-600 mb-1">Reason *</label>
                    <textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={3} placeholder="Explain why this amendment is needed..." value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-600 mb-1">Changes Description (optional)</label>
                    <textarea className="w-full border rounded-lg px-3 py-2 text-sm font-mono text-xs" rows={3} placeholder="e.g. Delivery date: Aug 15 → Aug 29, Qty RM001: 1000 → 1200" value={form.changes} onChange={e => setForm(f => ({ ...f, changes: e.target.value }))} />
                  </div>
                </div>

              <DocumentAttachments referenceType="PURCHASE_AMENDMENT" referenceId={viewDetail?.id} referenceNumber={viewDetail?.amendmentNumber} title="Amendment Attachments" />
              </div>
              <div className="p-6 border-t flex justify-end gap-3">
                <button onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg text-sm text-gray-600">Cancel</button>
                <button onClick={handleCreate} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">{saving ? 'Creating...' : 'Create Amendment'}</button>
              </div>
            </div>
          </div>
        )}

        {showRejectModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
              <div className="p-6 border-b">
                <h2 className="text-lg font-bold text-red-600">Reject Amendment</h2>
              </div>
              <div className="p-6">
                {error && <div className="bg-red-50 text-red-600 px-3 py-2 rounded text-sm mb-3">{error}</div>}
                <label className="block text-sm text-gray-600 mb-2">Rejection Reason *</label>
                <textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={3} value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
              </div>
              <div className="p-6 border-t flex justify-end gap-3">
                <button onClick={() => setShowRejectModal(null)} className="px-4 py-2 border rounded-lg text-sm text-gray-600">Cancel</button>
                <button onClick={handleReject} disabled={saving} className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 disabled:opacity-50">{saving ? 'Rejecting...' : 'Reject'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
