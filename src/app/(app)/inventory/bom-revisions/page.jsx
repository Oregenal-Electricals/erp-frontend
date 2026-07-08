'use client';
import { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/layout/AppLayout';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() {
  if (typeof window !== 'undefined') return localStorage.getItem('erp_token');
}

const CHANGE_TYPES = ['MAJOR', 'MINOR', 'PATCH'];
const TYPE_COLORS = {
  MAJOR: 'bg-red-100 text-red-700',
  MINOR: 'bg-blue-100 text-blue-700',
  PATCH: 'bg-gray-100 text-gray-600',
};

export default function BomRevisionsPage() {
  const [revisions, setRevisions] = useState([]);
  const [stats, setStats] = useState(null);
  const [products, setProducts] = useState([]);
  const [boms, setBoms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [changeType, setChangeType] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    productId: '', bomId: '', previousBomId: '',
    revisionNumber: '', changeType: 'MINOR',
    changeDescription: '', ecnNumber: '', effectiveDate: new Date().toISOString().split('T')[0]
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchStats = useCallback(async () => {
    const res = await fetch(`${API}/bom-revisions/stats`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) setStats(await res.json());
  }, []);

  const fetchProducts = useCallback(async () => {
    const res = await fetch(`${API}/products?limit=200&isActive=true`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) { const d = await res.json(); setProducts(d.data || []); }
  }, []);

  const fetchBomsForProduct = async (productId) => {
    if (!productId) { setBoms([]); return; }
    const res = await fetch(`${API}/boms/product/${productId}`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) setBoms(await res.json());
  };

  const fetchRevisions = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit: 20 });
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    if (changeType) params.set('changeType', changeType);
    const res = await fetch(`${API}/bom-revisions?${params}`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) {
      const d = await res.json();
      setRevisions(d.data); setTotalPages(d.totalPages); setTotal(d.total);
    }
    setLoading(false);
  }, [page, search, status, changeType]);

  useEffect(() => { fetchStats(); fetchProducts(); }, [fetchStats, fetchProducts]);
  useEffect(() => { fetchRevisions(); }, [fetchRevisions]);

  async function handleCreate() {
    setSaving(true); setError('');
    const body = { ...form };
    if (!body.previousBomId) delete body.previousBomId;
    if (!body.ecnNumber) delete body.ecnNumber;
    const res = await fetch(`${API}/bom-revisions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (res.ok) { setShowModal(false); fetchRevisions(); fetchStats(); }
    else setError(data.message || 'Failed');
    setSaving(false);
  }

  async function handleApprove(id) {
    if (!confirm('Approve this BOM revision?')) return;
    await fetch(`${API}/bom-revisions/${id}/approve`, { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` } });
    fetchRevisions(); fetchStats();
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">BOM Revision Control</h1>
            <p className="text-gray-500 text-sm mt-1">Engineering change history for Bills of Materials</p>
          </div>
          <button onClick={() => { setForm({ productId: '', bomId: '', previousBomId: '', revisionNumber: '', changeType: 'MINOR', changeDescription: '', ecnNumber: '', effectiveDate: new Date().toISOString().split('T')[0] }); setBoms([]); setError(''); setShowModal(true); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium">+ New Revision</button>
        </div>

        {stats && (
          <div className="grid grid-cols-3 md:grid-cols-6 gap-4 mb-6">
            {[
              { label: 'Total', value: stats.total, color: 'bg-gray-50' },
              { label: 'Draft', value: stats.draft, color: 'bg-yellow-50' },
              { label: 'Approved', value: stats.approved, color: 'bg-green-50' },
              { label: 'Major', value: stats.major, color: 'bg-red-50' },
              { label: 'Minor', value: stats.minor, color: 'bg-blue-50' },
              { label: 'Patch', value: stats.patch, color: 'bg-gray-100' },
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
            <input className="border rounded-lg px-3 py-2 text-sm flex-1 min-w-48" placeholder="Search revision, ECN, product, description..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
            <select className="border rounded-lg px-3 py-2 text-sm" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
              <option value="">All Status</option>
              <option value="DRAFT">Draft</option>
              <option value="APPROVED">Approved</option>
            </select>
            <select className="border rounded-lg px-3 py-2 text-sm" value={changeType} onChange={e => { setChangeType(e.target.value); setPage(1); }}>
              <option value="">All Types</option>
              {CHANGE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <span className="text-sm text-gray-500 self-center">{total} revisions</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
                <tr>{['Revision No.', 'Product', 'Change Type', 'ECN No.', 'New BOM', 'Previous BOM', 'Description', 'Effective Date', 'Status', 'Actions'].map(h => <th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={10} className="text-center py-10 text-gray-400">Loading...</td></tr>
                ) : revisions.length === 0 ? (
                  <tr><td colSpan={10} className="text-center py-10 text-gray-400">No BOM revisions found</td></tr>
                ) : revisions.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono font-medium text-blue-600">{r.revisionNumber}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{r.product?.name}</div>
                      <div className="text-xs text-gray-400">{r.product?.code}</div>
                    </td>
                    <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${TYPE_COLORS[r.changeType] || 'bg-gray-100'}`}>{r.changeType}</span></td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{r.ecnNumber || '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs text-blue-600">{r.bom?.bomNumber} <span className="text-gray-400">({r.bom?.version})</span></td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{r.previousBom ? `${r.previousBom.bomNumber} (${r.previousBom.version})` : '—'}</td>
                    <td className="px-4 py-3 text-gray-700 max-w-xs truncate">{r.changeDescription}</td>
                    <td className="px-4 py-3 text-gray-600">{r.effectiveDate ? new Date(r.effectiveDate).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${r.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{r.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      {r.status === 'DRAFT' && <button onClick={() => handleApprove(r.id)} className="text-green-600 hover:underline text-xs">Approve</button>}
                      {r.status === 'APPROVED' && <span className="text-xs text-gray-400">Locked</span>}
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
                <h2 className="text-lg font-bold">New BOM Revision</h2>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
              </div>
              <div className="p-6 space-y-4">
                {error && <div className="bg-red-50 text-red-600 px-4 py-2 rounded text-sm">{error}</div>}
                <div className="bg-blue-50 rounded p-3 text-xs text-blue-700">
                  Select a product, then choose the new BOM and the previous BOM it replaces.
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-600 mb-1">Product *</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.productId} onChange={e => { setForm(f => ({ ...f, productId: e.target.value, bomId: '', previousBomId: '' })); fetchBomsForProduct(e.target.value); }}>
                      <option value="">— Select Product —</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">New BOM *</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.bomId} onChange={e => setForm(f => ({ ...f, bomId: e.target.value }))}>
                      <option value="">— Select —</option>
                      {boms.map(b => <option key={b.id} value={b.id}>{b.bomNumber} ({b.version}) — {b.status}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Previous BOM</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.previousBomId} onChange={e => setForm(f => ({ ...f, previousBomId: e.target.value }))}>
                      <option value="">— None (first revision) —</option>
                      {boms.filter(b => b.id !== form.bomId).map(b => <option key={b.id} value={b.id}>{b.bomNumber} ({b.version}) — {b.status}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Revision Number *</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm font-mono" placeholder="REV-001" value={form.revisionNumber} onChange={e => setForm(f => ({ ...f, revisionNumber: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Change Type</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.changeType} onChange={e => setForm(f => ({ ...f, changeType: e.target.value }))}>
                      {CHANGE_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">ECN Number</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm font-mono" placeholder="ECN-2026-001" value={form.ecnNumber} onChange={e => setForm(f => ({ ...f, ecnNumber: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Effective Date</label>
                    <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.effectiveDate} onChange={e => setForm(f => ({ ...f, effectiveDate: e.target.value }))} />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-600 mb-1">Change Description *</label>
                    <textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={3} placeholder="Describe what changed in this revision..." value={form.changeDescription} onChange={e => setForm(f => ({ ...f, changeDescription: e.target.value }))} />
                  </div>
                </div>
              </div>
              <div className="p-6 border-t flex justify-end gap-3">
                <button onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                <button onClick={handleCreate} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">{saving ? 'Saving...' : 'Create Revision'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
