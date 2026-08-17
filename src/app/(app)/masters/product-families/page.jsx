'use client';
import { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/layout/AppLayout';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() {
  if (typeof window !== 'undefined') return localStorage.getItem('erp_token');
}

export default function ProductFamiliesPage() {
  const [families, setFamilies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [showModal, setShowModal] = useState(false);
  const [editFamily, setEditFamily] = useState(null);
  const [form, setForm] = useState({ code: '', name: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [manageFamily, setManageFamily] = useState(null);
  const [productSearch, setProductSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [selectedToAdd, setSelectedToAdd] = useState([]);

  const fetchFamilies = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit: 20 });
    if (search) params.set('search', search);
    const res = await fetch(`${API}/product-families?${params}`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) {
      const d = await res.json();
      setFamilies(d.data);
      setTotalPages(d.totalPages);
      setTotal(d.total);
    }
    setLoading(false);
  }, [page, search]);

  useEffect(() => { fetchFamilies(); }, [fetchFamilies]);

  function openCreate() {
    setEditFamily(null);
    setForm({ code: '', name: '', description: '' });
    setError('');
    setShowModal(true);
  }

  function openEdit(f) {
    setEditFamily(f);
    setForm({ code: f.code, name: f.name, description: f.description || '' });
    setError('');
    setShowModal(true);
  }

  async function handleSave() {
    setSaving(true); setError('');
    const body = { ...form };
    if (editFamily) delete body.code;

    const url = editFamily ? `${API}/product-families/${editFamily.id}` : `${API}/product-families`;
    const method = editFamily ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (res.ok) { setShowModal(false); fetchFamilies(); }
    else setError(data.message || 'Save failed');
    setSaving(false);
  }

  async function handleDeactivate(id) {
    if (!confirm('Deactivate this Product Family? Member products stay linked but the family itself becomes inactive.')) return;
    await fetch(`${API}/product-families/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${getToken()}` } });
    fetchFamilies();
  }

  async function openManageProducts(f) {
    const res = await fetch(`${API}/product-families/${f.id}`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) setManageFamily(await res.json());
    setProductSearch('');
    setSearchResults([]);
    setSelectedToAdd([]);
  }

  async function refreshManageFamily() {
    if (!manageFamily) return;
    const res = await fetch(`${API}/product-families/${manageFamily.id}`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) setManageFamily(await res.json());
  }

  async function searchProducts(term) {
    setProductSearch(term);
    setSelectedToAdd([]);
    if (!term || term.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    const params = new URLSearchParams({ limit: 15, search: term });
    const res = await fetch(`${API}/products?${params}`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) {
      const d = await res.json();
      const assignedIds = new Set((manageFamily?.products || []).map(p => p.id));
      setSearchResults((d.data || []).filter(p => !assignedIds.has(p.id)));
    }
    setSearching(false);
  }

  function toggleSelect(id) {
    setSelectedToAdd(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  async function handleAssignSelected() {
    if (selectedToAdd.length === 0 || !manageFamily) return;
    setAssigning(true);
    const res = await fetch(`${API}/product-families/${manageFamily.id}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ productIds: selectedToAdd }),
    });
    if (res.ok) {
      setSelectedToAdd([]);
      setProductSearch('');
      setSearchResults([]);
      await refreshManageFamily();
      fetchFamilies();
    }
    setAssigning(false);
  }

  async function handleRemoveProduct(productId) {
    await fetch(`${API}/product-families/products/${productId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${getToken()}` } });
    await refreshManageFamily();
    fetchFamilies();
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Product Families</h1>
            <p className="text-sm text-gray-500 mt-1">
              Group Products that share the same upstream build (through Assembly) across different customers - the
              only real difference between them is the final Packaging stage.
            </p>
          </div>
          <button onClick={openCreate} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
            + New Family
          </button>
        </div>

        <div className="bg-white rounded-xl border shadow-sm">
          <div className="p-4 border-b flex items-center gap-3">
            <input
              className="flex-1 max-w-sm border rounded-lg px-3 py-2 text-sm"
              placeholder="Search by code or name..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
            <span className="text-sm text-gray-400">{total} famil{total === 1 ? 'y' : 'ies'}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Products</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr><td colSpan={6} className="text-center py-10 text-gray-400">Loading...</td></tr>
                ) : families.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-10 text-gray-400">No Product Families found</td></tr>
                ) : families.map(f => (
                  <tr key={f.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono font-medium text-blue-600">{f.code}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{f.name}</td>
                    <td className="px-4 py-3 text-gray-600">{f.description || '—'}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => openManageProducts(f)} className="text-blue-600 hover:underline text-xs font-medium">
                        {(f.products || []).length} product{(f.products || []).length === 1 ? '' : 's'} · Manage
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${f.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {f.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(f)} className="text-blue-600 hover:underline text-xs">Edit</button>
                        {f.isActive && <button onClick={() => handleDeactivate(f.id)} className="text-red-500 hover:underline text-xs">Deactivate</button>}
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
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-white">
                <h2 className="text-lg font-bold">{editFamily ? 'Edit Product Family' : 'New Product Family'}</h2>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
              </div>
              <div className="p-6 space-y-5">
                {error && <div className="bg-red-50 text-red-600 px-4 py-2 rounded text-sm">{error}</div>}
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Code *</label>
                  <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} disabled={!!editFamily} />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Name *</label>
                  <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Description</label>
                  <textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                </div>
              </div>
              <div className="p-6 border-t flex justify-end gap-3 sticky bottom-0 bg-white">
                <button onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                <button onClick={handleSave} disabled={saving || !form.code || !form.name} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                  {saving ? 'Saving...' : editFamily ? 'Update Family' : 'Create Family'}
                </button>
              </div>
            </div>
          </div>
        )}

        {manageFamily && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col">
              <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-white">
                <div>
                  <h2 className="text-lg font-bold">Manage Products - {manageFamily.name}</h2>
                  <p className="text-xs text-gray-400 font-mono">{manageFamily.code}</p>
                </div>
                <button onClick={() => setManageFamily(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
              </div>

              <div className="p-6 space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Currently in this family ({(manageFamily.products || []).length})</h3>
                  {(manageFamily.products || []).length === 0 ? (
                    <p className="text-sm text-gray-400">No products assigned yet.</p>
                  ) : (
                    <div className="border rounded-lg divide-y">
                      {manageFamily.products.map(p => (
                        <div key={p.id} className="flex items-center justify-between px-3 py-2">
                          <div>
                            <span className="font-mono text-sm text-blue-600">{p.code}</span>
                            <span className="text-sm text-gray-700 ml-2">{p.name}</span>
                          </div>
                          <button onClick={() => handleRemoveProduct(p.id)} className="text-red-500 hover:underline text-xs">Remove</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Add products</h3>
                  <input
                    className="w-full border rounded-lg px-3 py-2 text-sm mb-2"
                    placeholder="Search products by code or name (min 2 characters)..."
                    value={productSearch}
                    onChange={e => searchProducts(e.target.value)}
                  />
                  {searching && <p className="text-xs text-gray-400">Searching...</p>}
                  {!searching && productSearch.length >= 2 && searchResults.length === 0 && (
                    <p className="text-xs text-gray-400">No unassigned products match &quot;{productSearch}&quot;.</p>
                  )}
                  {searchResults.length > 0 && (
                    <div className="border rounded-lg divide-y max-h-56 overflow-y-auto">
                      {searchResults.map(p => (
                        <label key={p.id} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                          <input type="checkbox" checked={selectedToAdd.includes(p.id)} onChange={() => toggleSelect(p.id)} />
                          <span className="font-mono text-sm text-blue-600">{p.code}</span>
                          <span className="text-sm text-gray-700">{p.name}</span>
                        </label>
                      ))}
                    </div>
                  )}
                  {selectedToAdd.length > 0 && (
                    <button
                      onClick={handleAssignSelected}
                      disabled={assigning}
                      className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
                    >
                      {assigning ? 'Adding...' : `Add ${selectedToAdd.length} selected`}
                    </button>
                  )}
                </div>
              </div>

              <div className="p-6 border-t flex justify-end sticky bottom-0 bg-white">
                <button onClick={() => setManageFamily(null)} className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">Done</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
