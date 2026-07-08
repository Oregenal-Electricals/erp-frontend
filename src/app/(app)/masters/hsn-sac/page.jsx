'use client';
import { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/layout/AppLayout';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() {
  if (typeof window !== 'undefined') return localStorage.getItem('erp_token');
}

const GST_RATES = [0, 5, 12, 18, 28];

export default function HsnSacPage() {
  const [codes, setCodes] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [codeType, setCodeType] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editCode, setEditCode] = useState(null);
  const [form, setForm] = useState({ code: '', codeType: 'HSN', description: '', gstRate: 18, cessRate: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchStats = useCallback(async () => {
    const res = await fetch(`${API}/hsn-sac/stats`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) setStats(await res.json());
  }, []);

  const fetchCodes = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit: 20 });
    if (search) params.set('search', search);
    if (codeType) params.set('codeType', codeType);
    const res = await fetch(`${API}/hsn-sac?${params}`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) {
      const d = await res.json();
      setCodes(d.data);
      setTotalPages(d.totalPages);
      setTotal(d.total);
    }
    setLoading(false);
  }, [page, search, codeType]);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchCodes(); }, [fetchCodes]);

  function openCreate() {
    setEditCode(null);
    setForm({ code: '', codeType: 'HSN', description: '', gstRate: 18, cessRate: '' });
    setError('');
    setShowModal(true);
  }

  function openEdit(c) {
    setEditCode(c);
    setForm({ code: c.code, codeType: c.codeType, description: c.description, gstRate: c.gstRate, cessRate: c.cessRate || '' });
    setError('');
    setShowModal(true);
  }

  async function handleSave() {
    setSaving(true); setError('');
    const body = { ...form, gstRate: parseFloat(form.gstRate) };
    if (body.cessRate !== '') body.cessRate = parseFloat(body.cessRate); else delete body.cessRate;
    const url = editCode ? `${API}/hsn-sac/${editCode.id}` : `${API}/hsn-sac`;
    const method = editCode ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (res.ok) { setShowModal(false); fetchCodes(); fetchStats(); }
    else setError(data.message || 'Save failed');
    setSaving(false);
  }

  async function handleDeactivate(id) {
    if (!confirm('Deactivate this code?')) return;
    await fetch(`${API}/hsn-sac/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${getToken()}` } });
    fetchCodes(); fetchStats();
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">HSN / SAC Master</h1>
            <p className="text-gray-500 text-sm mt-1">GST tax codes for goods (HSN) and services (SAC)</p>
          </div>
          <button onClick={openCreate} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium">+ Add Code</button>
        </div>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            {[
              { label: 'Total', value: stats.total, color: 'bg-gray-50' },
              { label: 'Active', value: stats.active, color: 'bg-green-50' },
              { label: 'HSN Codes', value: stats.hsn, color: 'bg-blue-50' },
              { label: 'SAC Codes', value: stats.sac, color: 'bg-purple-50' },
              { label: 'Zero Rated', value: stats.zeroRated, color: 'bg-yellow-50' },
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
            <input
              className="border rounded-lg px-3 py-2 text-sm flex-1 min-w-48"
              placeholder="Search code or description..."
              value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
            <select className="border rounded-lg px-3 py-2 text-sm" value={codeType} onChange={e => { setCodeType(e.target.value); setPage(1); }}>
              <option value="">All Types</option>
              <option value="HSN">HSN</option>
              <option value="SAC">SAC</option>
            </select>
            <span className="text-sm text-gray-500 self-center">{total} codes</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
                <tr>
                  {['Code', 'Type', 'Description', 'GST%', 'IGST%', 'CGST%', 'SGST%', 'CESS%', 'Status', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={10} className="text-center py-10 text-gray-400">Loading...</td></tr>
                ) : codes.length === 0 ? (
                  <tr><td colSpan={10} className="text-center py-10 text-gray-400">No codes found</td></tr>
                ) : codes.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono font-medium text-blue-600">{c.code}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${c.codeType === 'HSN' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                        {c.codeType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700 max-w-xs truncate">{c.description}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">{c.gstRate}%</td>
                    <td className="px-4 py-3 text-gray-600">{c.igstRate}%</td>
                    <td className="px-4 py-3 text-gray-600">{c.cgstRate}%</td>
                    <td className="px-4 py-3 text-gray-600">{c.sgstRate}%</td>
                    <td className="px-4 py-3 text-gray-600">{c.cessRate ? `${c.cessRate}%` : '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${c.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {c.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(c)} className="text-blue-600 hover:underline text-xs">Edit</button>
                        {c.isActive && <button onClick={() => handleDeactivate(c.id)} className="text-red-500 hover:underline text-xs">Deactivate</button>}
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
                <h2 className="text-lg font-bold">{editCode ? 'Edit HSN/SAC Code' : 'Add HSN/SAC Code'}</h2>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
              </div>
              <div className="p-6 space-y-4">
                {error && <div className="bg-red-50 text-red-600 px-4 py-2 rounded text-sm">{error}</div>}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Code *</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm font-mono" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} disabled={!!editCode} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Type</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.codeType} onChange={e => setForm(f => ({ ...f, codeType: e.target.value }))} disabled={!!editCode}>
                      <option value="HSN">HSN (Goods)</option>
                      <option value="SAC">SAC (Services)</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-600 mb-1">Description *</label>
                    <textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">GST Rate (%)</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.gstRate} onChange={e => setForm(f => ({ ...f, gstRate: e.target.value }))}>
                      {GST_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">CESS Rate (%) optional</label>
                    <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.cessRate} onChange={e => setForm(f => ({ ...f, cessRate: e.target.value }))} />
                  </div>
                </div>
                {form.gstRate > 0 && (
                  <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-700 grid grid-cols-3 gap-2 text-center">
                    <div><div className="font-bold">{form.gstRate}%</div><div>IGST</div></div>
                    <div><div className="font-bold">{form.gstRate/2}%</div><div>CGST</div></div>
                    <div><div className="font-bold">{form.gstRate/2}%</div><div>SGST</div></div>
                  </div>
                )}
              </div>
              <div className="p-6 border-t flex justify-end gap-3">
                <button onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                  {saving ? 'Saving...' : editCode ? 'Update Code' : 'Create Code'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
