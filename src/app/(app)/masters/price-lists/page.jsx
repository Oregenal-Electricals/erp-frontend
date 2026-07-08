'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import CustomFields from '@/components/custom-fields/CustomFields';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() {
  if (typeof window !== 'undefined') return localStorage.getItem('erp_token');
}

export default function PriceListsPage() {
  const [lists, setLists] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [listType, setListType] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ code: '', name: '', description: '', listType: 'SALES', currency: 'INR', isDefault: false });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchStats = useCallback(async () => {
    const res = await fetch(`${API}/price-lists/stats`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) setStats(await res.json());
  }, []);

  const fetchLists = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit: 20 });
    if (search) params.set('search', search);
    if (listType) params.set('listType', listType);
    const res = await fetch(`${API}/price-lists?${params}`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) {
      const d = await res.json();
      setLists(d.data);
      setTotalPages(d.totalPages);
      setTotal(d.total);
    }
    setLoading(false);
  }, [page, search, listType]);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchLists(); }, [fetchLists]);

  function openCreate() {
    setEditItem(null);
    setForm({ code: '', name: '', description: '', listType: 'SALES', currency: 'INR', isDefault: false });
    setError(''); setShowModal(true);
  }

  function openEdit(pl) {
    setEditItem(pl);
    setForm({ code: pl.code, name: pl.name, description: pl.description || '', listType: pl.listType, currency: pl.currency, isDefault: pl.isDefault });
    setError(''); setShowModal(true);
  }

  async function handleSave() {
    setSaving(true); setError('');
    const url = editItem ? `${API}/price-lists/${editItem.id}` : `${API}/price-lists`;
    const method = editItem ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (res.ok) { setShowModal(false); fetchLists(); fetchStats(); }
    else setError(data.message || 'Save failed');
    setSaving(false);
  }

  async function handleDeactivate(id) {
    if (!confirm('Deactivate this price list?')) return;
    await fetch(`${API}/price-lists/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${getToken()}` } });
    fetchLists(); fetchStats();
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Price List Management</h1>
            <p className="text-gray-500 text-sm mt-1">Sales and purchase price lists</p>
          </div>
          <button onClick={openCreate} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium">+ Add Price List</button>
        </div>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            {[
              { label: 'Total Lists', value: stats.total, color: 'bg-gray-50' },
              { label: 'Active', value: stats.active, color: 'bg-green-50' },
              { label: 'Sales Lists', value: stats.sales, color: 'bg-blue-50' },
              { label: 'Purchase Lists', value: stats.purchase, color: 'bg-purple-50' },
              { label: 'Total Items', value: stats.totalItems, color: 'bg-yellow-50' },
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
            <input className="border rounded-lg px-3 py-2 text-sm flex-1 min-w-48" placeholder="Search..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
            <select className="border rounded-lg px-3 py-2 text-sm" value={listType} onChange={e => { setListType(e.target.value); setPage(1); }}>
              <option value="">All Types</option>
              <option value="SALES">Sales</option>
              <option value="PURCHASE">Purchase</option>
            </select>
            <span className="text-sm text-gray-500 self-center">{total} lists</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
                <tr>{['Code', 'Name', 'Type', 'Currency', 'Default', 'Items', 'Status', 'Actions'].map(h => <th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={8} className="text-center py-10 text-gray-400">Loading...</td></tr>
                ) : lists.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-10 text-gray-400">No price lists found</td></tr>
                ) : lists.map(pl => (
                  <tr key={pl.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono font-medium text-blue-600">{pl.code}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{pl.name}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${pl.listType === 'SALES' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>{pl.listType}</span></td>
                    <td className="px-4 py-3 text-gray-600">{pl.currency}</td>
                    <td className="px-4 py-3">{pl.isDefault ? <span className="text-green-600 font-medium">✓ Default</span> : '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{pl._count?.items || 0}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${pl.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{pl.isActive ? 'Active' : 'Inactive'}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Link href={`/masters/price-lists/${pl.id}`} className="text-blue-600 hover:underline text-xs">View</Link>
                        <button onClick={() => openEdit(pl)} className="text-gray-600 hover:underline text-xs">Edit</button>
                        {pl.isActive && <button onClick={() => handleDeactivate(pl.id)} className="text-red-500 hover:underline text-xs">Deactivate</button>}
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
                <h2 className="text-lg font-bold">{editItem ? 'Edit Price List' : 'Add Price List'}</h2>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
              </div>
              <div className="p-6 space-y-4">
                {error && <div className="bg-red-50 text-red-600 px-4 py-2 rounded text-sm">{error}</div>}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Code *</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} disabled={!!editItem} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Type</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.listType} onChange={e => setForm(f => ({ ...f, listType: e.target.value }))} disabled={!!editItem}>
                      <option value="SALES">Sales</option>
                      <option value="PURCHASE">Purchase</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-600 mb-1">Name *</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-600 mb-1">Description</label>
                    <textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Currency</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}>
                      {['INR', 'USD', 'EUR', 'GBP', 'AED'].map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="flex items-center gap-2 pt-5">
                    <input type="checkbox" id="isDefault" checked={form.isDefault} onChange={e => setForm(f => ({ ...f, isDefault: e.target.checked }))} />
                    <label htmlFor="isDefault" className="text-sm text-gray-600">Set as Default</label>
                  </div>
                </div>
              </div>
              <div className="p-6 border-t flex justify-end gap-3">
                <button onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                  {saving ? 'Saving...' : editItem ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
