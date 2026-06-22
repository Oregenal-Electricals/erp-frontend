'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() {
  if (typeof window !== 'undefined') return localStorage.getItem('accessToken');
}

const STATUS_COLORS = {
  DRAFT: 'bg-gray-100 text-gray-600',
  SUBMITTED: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  PO_RAISED: 'bg-blue-100 text-blue-700',
  CLOSED: 'bg-gray-100 text-gray-500',
};

const PRIORITY_COLORS = {
  LOW: 'bg-gray-100 text-gray-500',
  NORMAL: 'bg-blue-100 text-blue-600',
  HIGH: 'bg-orange-100 text-orange-700',
  URGENT: 'bg-red-100 text-red-700',
};

export default function PurchaseRequisitionsPage() {
  const [prs, setPrs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', requiredDate: '', department: '', priority: 'NORMAL', notes: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchStats = useCallback(async () => {
    const res = await fetch(`${API}/purchase-requisitions/stats`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) setStats(await res.json());
  }, []);

  const fetchPRs = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit: 20 });
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    if (priority) params.set('priority', priority);
    const res = await fetch(`${API}/purchase-requisitions?${params}`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) {
      const d = await res.json();
      setPrs(d.data); setTotalPages(d.totalPages); setTotal(d.total);
    }
    setLoading(false);
  }, [page, search, status, priority]);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchPRs(); }, [fetchPRs]);

  async function handleCreate() {
    setSaving(true); setError('');
    const body = { ...form, requiredDate: new Date(form.requiredDate).toISOString() };
    if (!body.description) delete body.description;
    if (!body.department) delete body.department;
    if (!body.notes) delete body.notes;
    const res = await fetch(`${API}/purchase-requisitions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (res.ok) { setShowModal(false); fetchPRs(); fetchStats(); }
    else setError(data.message || 'Failed');
    setSaving(false);
  }

  async function handleAction(id, action) {
    await fetch(`${API}/purchase-requisitions/${id}/${action}`, { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` } });
    fetchPRs(); fetchStats();
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Purchase Requisitions</h1>
            <p className="text-gray-500 text-sm mt-1">Internal material requests — Phase 4 Purchase Management</p>
          </div>
          <button onClick={() => { setForm({ title: '', description: '', requiredDate: '', department: '', priority: 'NORMAL', notes: '' }); setError(''); setShowModal(true); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium">+ New PR</button>
        </div>

        {stats && (
          <div className="grid grid-cols-3 md:grid-cols-6 gap-4 mb-6">
            {[
              { label: 'Total', value: stats.total, color: 'bg-gray-50' },
              { label: 'Draft', value: stats.draft, color: 'bg-gray-100' },
              { label: 'Submitted', value: stats.submitted, color: 'bg-yellow-50' },
              { label: 'Approved', value: stats.approved, color: 'bg-green-50' },
              { label: 'Rejected', value: stats.rejected, color: 'bg-red-50' },
              { label: 'PO Raised', value: stats.poRaised, color: 'bg-blue-50' },
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
            <input className="border rounded-lg px-3 py-2 text-sm flex-1 min-w-48" placeholder="Search PR number, title..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
            <select className="border rounded-lg px-3 py-2 text-sm" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
              <option value="">All Status</option>
              {['DRAFT','SUBMITTED','APPROVED','REJECTED','PO_RAISED','CLOSED'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select className="border rounded-lg px-3 py-2 text-sm" value={priority} onChange={e => { setPriority(e.target.value); setPage(1); }}>
              <option value="">All Priority</option>
              {['LOW','NORMAL','HIGH','URGENT'].map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <span className="text-sm text-gray-500 self-center">{total} PRs</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
                <tr>{['PR No.', 'Title', 'Department', 'Priority', 'Required Date', 'Items', 'Est. Value', 'Status', 'Actions'].map(h => <th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={9} className="text-center py-10 text-gray-400">Loading...</td></tr>
                ) : prs.length === 0 ? (
                  <tr><td colSpan={9} className="text-center py-10 text-gray-400">No purchase requisitions found</td></tr>
                ) : prs.map(pr => (
                  <tr key={pr.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono font-medium text-blue-600">{pr.prNumber}</td>
                    <td className="px-4 py-3 font-medium text-gray-900 max-w-xs truncate">{pr.title}</td>
                    <td className="px-4 py-3 text-gray-600">{pr.department || '—'}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${PRIORITY_COLORS[pr.priority]}`}>{pr.priority}</span></td>
                    <td className="px-4 py-3 text-gray-600">{pr.requiredDate ? new Date(pr.requiredDate).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{pr._count?.items || 0}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">{pr.totalAmount ? `₹${pr.totalAmount.toLocaleString()}` : '—'}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[pr.status]}`}>{pr.status}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 flex-wrap">
                        <Link href={`/purchase/requisitions/${pr.id}`} className="text-blue-600 hover:underline text-xs">View</Link>
                        {pr.status === 'DRAFT' && <button onClick={() => handleAction(pr.id, 'submit')} className="text-yellow-600 hover:underline text-xs">Submit</button>}
                        {pr.status === 'SUBMITTED' && <button onClick={() => handleAction(pr.id, 'approve')} className="text-green-600 hover:underline text-xs">Approve</button>}
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
              <span className="px-3 py-1 text-sm text-gray-600">Page {page} of {totalPages}</span>
              <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1 rounded border text-sm disabled:opacity-40">Next</button>
            </div>
          )}
        </div>

        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
              <div className="p-6 border-b flex justify-between items-center">
                <h2 className="text-lg font-bold">New Purchase Requisition</h2>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
              </div>
              <div className="p-6 space-y-4">
                {error && <div className="bg-red-50 text-red-600 px-4 py-2 rounded text-sm">{error}</div>}
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-600 mb-1">Title *</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="e.g. Q3 Electronic Components" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Required Date *</label>
                    <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.requiredDate} onChange={e => setForm(f => ({ ...f, requiredDate: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Priority</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                      {['LOW','NORMAL','HIGH','URGENT'].map(p => <option key={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Department</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Production, R&D..." value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-600 mb-1">Description</label>
                    <textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                  </div>
                </div>
                <div className="bg-blue-50 rounded p-3 text-xs text-blue-700">
                  💡 After creating, open the PR to add items before submitting for approval.
                </div>
              </div>
              <div className="p-6 border-t flex justify-end gap-3">
                <button onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                <button onClick={handleCreate} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">{saving ? 'Creating...' : 'Create PR'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
