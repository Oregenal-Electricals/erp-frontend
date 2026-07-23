'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() {
  if (typeof window !== 'undefined') return localStorage.getItem('erp_token');
}

const STATUS_COLORS = {
  DRAFT: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-green-100 text-green-700',
  OBSOLETE: 'bg-gray-100 text-gray-500',
};

export default function BomListPage() {
  const [boms, setBoms] = useState([]);
  const [stats, setStats] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ productId: '', version: 'v1', description: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchStats = useCallback(async () => {
    const res = await fetch(`${API}/boms/stats`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) setStats(await res.json());
  }, []);

  const fetchProducts = useCallback(async () => {
    const res = await fetch(`${API}/products?limit=200&isActive=true`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) { const d = await res.json(); setProducts(d.data || []); }
  }, []);

  const fetchBoms = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit: 20 });
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    const res = await fetch(`${API}/boms?${params}`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) {
      const d = await res.json();
      setBoms(d.data); setTotalPages(d.totalPages); setTotal(d.total);
    }
    setLoading(false);
  }, [page, search, status]);

  useEffect(() => { fetchStats(); fetchProducts(); }, [fetchStats, fetchProducts]);
  useEffect(() => { fetchBoms(); }, [fetchBoms]);

  async function handleCreate() {
    setSaving(true); setError('');
    const res = await fetch(`${API}/boms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (res.ok) { setShowModal(false); fetchBoms(); fetchStats(); }
    else setError(data.message || 'Failed');
    setSaving(false);
  }

  async function handleObsolete(id) {
    if (!confirm('Mark this BOM as obsolete?')) return;
    await fetch(`${API}/boms/${id}/obsolete`, { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` } });
    fetchBoms(); fetchStats();
  }

  async function handleClone(id) {
    await fetch(`${API}/boms/${id}/clone`, { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` } });
    fetchBoms(); fetchStats();
  }
  async function handleDelete(id) {
    if (!confirm('Delete this BOM? This cannot be undone.')) return;
    const res = await fetch(`${API}/boms/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) { fetchBoms(); fetchStats(); }
    else { const d = await res.json(); alert(d.message || 'Failed to delete'); }
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">BOM Management</h1>
            <p className="text-gray-500 text-sm mt-1">Bill of Materials — define component requirements per product</p>
          </div>
          <button onClick={() => { setForm({ productId: '', version: 'v1', description: '' }); setError(''); setShowModal(true); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium">+ Create BOM</button>
          <a href="/inventory/bom/upload" className="ml-2 border border-indigo-300 text-indigo-700 px-4 py-2 rounded-lg hover:bg-indigo-50 font-medium inline-block">Upload BOM</a>
        </div>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            {[
              { label: 'Total BOMs', value: stats.total, color: 'bg-gray-50' },
              { label: 'Draft', value: stats.draft, color: 'bg-yellow-50' },
              { label: 'Approved', value: stats.approved, color: 'bg-green-50' },
              { label: 'Obsolete', value: stats.obsolete, color: 'bg-gray-100' },
              { label: 'Total Items', value: stats.totalItems, color: 'bg-blue-50' },
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
            <input className="border rounded-lg px-3 py-2 text-sm flex-1 min-w-48" placeholder="Search BOM number or product..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
            <select className="border rounded-lg px-3 py-2 text-sm" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
              <option value="">All Status</option>
              <option value="DRAFT">Draft</option>
              <option value="APPROVED">Approved</option>
              <option value="OBSOLETE">Obsolete</option>
            </select>
            <span className="text-sm text-gray-500 self-center">{total} BOMs</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
                <tr>{['BOM No.', 'Product', 'Version', 'Items', 'Total Cost', 'Effective From', 'Approved At', 'Status', 'Actions'].map(h => <th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={9} className="text-center py-10 text-gray-400">Loading...</td></tr>
                ) : boms.length === 0 ? (
                  <tr><td colSpan={9} className="text-center py-10 text-gray-400">No BOMs found</td></tr>
                ) : boms.map(b => (
                  <tr key={b.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono font-medium text-blue-600">{b.bomNumber}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{b.product?.name}</div>
                      <div className="text-xs text-gray-400">{b.product?.code}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{b.version}</td>
                    <td className="px-4 py-3 text-gray-600">{b._count?.items || 0}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">{b.totalCost ? `₹${b.totalCost.toFixed(2)}` : '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{b.effectiveFrom ? new Date(b.effectiveFrom).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{b.approvedAt ? new Date(b.approvedAt).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[b.status] || 'bg-gray-100'}`}>{b.status}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 flex-wrap">
                        <Link href={`/inventory/bom/${b.id}`} className="text-blue-600 hover:underline text-xs">View</Link>
                        <button onClick={() => handleClone(b.id)} className="text-purple-600 hover:underline text-xs">Clone</button>
                        {b.status === 'DRAFT' && <button onClick={() => handleDelete(b.id)} className="text-red-500 hover:underline text-xs">Delete</button>}
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
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
              <div className="p-6 border-b flex justify-between items-center">
                <h2 className="text-lg font-bold">Create BOM</h2>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
              </div>
              <div className="p-6 space-y-4">
                {error && <div className="bg-red-50 text-red-600 px-4 py-2 rounded text-sm">{error}</div>}
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Product *</label>
                  <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.productId} onChange={e => setForm(f => ({ ...f, productId: e.target.value }))}>
                    <option value="">— Select Product —</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Version</label>
                  <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.version} onChange={e => setForm(f => ({ ...f, version: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Description</label>
                  <textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                </div>
              </div>
              <div className="p-6 border-t flex justify-end gap-3">
                <button onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                <button onClick={handleCreate} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">{saving ? 'Creating...' : 'Create BOM'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
