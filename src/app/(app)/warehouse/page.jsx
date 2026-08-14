'use client';
import { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/layout/AppLayout';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() { if (typeof window !== 'undefined') return localStorage.getItem('erp_token'); }

const TYPES = ['RAW_MATERIAL', 'FINISHED_GOOD', 'WIP', 'SPARE_PART', 'SCRAP', 'GENERAL'];
const BLANK_FORM = { plantId: '', code: '', name: '', type: 'GENERAL', description: '', address: '', capacity: '', isDefault: false };

export default function WarehousePage() {
  const [data, setData] = useState([]);
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(BLANK_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [wRes, pRes] = await Promise.all([
      fetch(`${API}/warehouses?page=${page}&limit=20`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/masters/plants?limit=100`, { headers: { Authorization: `Bearer ${getToken()}` } }),
    ]);
    if (wRes.ok) { const d = await wRes.json(); const list = Array.isArray(d) ? d : (d.data || []); setData(list); setTotal(d.total ?? list.length); }
    if (pRes.ok) { const d = await pRes.json(); setPlants(Array.isArray(d) ? d : (d.data || [])); }
    setLoading(false);
  }, [page]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  function openCreate() {
    setEditId(null);
    setForm({ ...BLANK_FORM, plantId: plants[0]?.id || '' });
    setError('');
    setShowModal(true);
  }

  function openEdit(w) {
    setEditId(w.id);
    setForm({
      plantId: w.plantId || '', code: w.code || '', name: w.name || '',
      type: w.type || 'GENERAL', description: w.description || '', address: w.address || '',
      capacity: w.capacity ?? '', isDefault: !!w.isDefault,
    });
    setError('');
    setShowModal(true);
  }

  async function handleSave() {
    setSaving(true); setError('');
    const body = {
      plantId: form.plantId, code: form.code, name: form.name, type: form.type,
      description: form.description || undefined, address: form.address || undefined,
      capacity: form.capacity !== '' ? parseFloat(form.capacity) : undefined,
      isDefault: form.isDefault,
    };
    if (editId) { delete body.plantId; delete body.code; } // UpdateWarehouseDto doesn't accept plantId/code (immutable)
    const url = editId ? `${API}/warehouses/${editId}` : `${API}/warehouses`;
    const method = editId ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(body),
    });
    const respData = await res.json();
    if (res.ok) { setShowModal(false); fetchAll(); }
    else setError(Array.isArray(respData.message) ? respData.message.join(', ') : respData.message || 'Failed');
    setSaving(false);
  }

  const filtered = data.filter(item => JSON.stringify(item).toLowerCase().includes(search.toLowerCase()));

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Warehouse Management</h1>
            <p className="text-gray-500 text-sm mt-1">{total} warehouses</p>
          </div>
          <button onClick={openCreate} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium">+ New Warehouse</button>
        </div>
        <div className="mb-4"><input className="border rounded-lg px-3 py-2 text-sm w-80" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} /></div>
        <div className="bg-white rounded-xl border shadow-sm overflow-x-auto">
          {loading ? <div className="text-center py-16 text-gray-400">Loading...</div>
          : filtered.length === 0 ? <div className="text-center py-16"><div className="text-5xl mb-3">🏗️</div><div className="text-gray-400">No warehouses yet</div></div>
          : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Sr.</th>
                  {['Code', 'Name', 'Type', 'Plant', 'Address', 'Capacity', 'Default', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((w, i) => (
                  <tr key={w.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-400">{(page - 1) * 20 + i + 1}</td>
                    <td className="px-4 py-3 font-mono font-medium text-blue-600">{w.code}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{w.name}</td>
                    <td className="px-4 py-3 text-gray-600">{w.type}</td>
                    <td className="px-4 py-3 text-gray-600">{w.plant?.name || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{w.address || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{w.capacity ?? '—'}</td>
                    <td className="px-4 py-3">{w.isDefault ? <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Default</span> : '—'}</td>
                    <td className="px-4 py-3"><button onClick={() => openEdit(w)} className="text-blue-600 hover:underline text-xs">Edit</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-screen overflow-y-auto">
              <div className="p-6 border-b flex justify-between sticky top-0 bg-white">
                <h2 className="text-lg font-bold">{editId ? 'Edit Warehouse' : 'New Warehouse'}</h2>
                <button onClick={() => setShowModal(false)} className="text-gray-400 text-xl">✕</button>
              </div>
              <div className="p-6 space-y-4">
                {error && <div className="bg-red-50 text-red-600 px-3 py-2 rounded text-sm">{error}</div>}
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Plant *</label>
                  <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.plantId} onChange={e => setForm(f => ({ ...f, plantId: e.target.value }))} disabled={!!editId}>
                    <option value="">— Select Plant —</option>
                    {plants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Code *</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} disabled={!!editId} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Name *</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Type *</label>
                  <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                    {TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Address</label>
                  <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Capacity</label>
                    <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))} />
                  </div>
                  <div className="flex items-center gap-2 mt-6">
                    <input type="checkbox" id="isDefault" checked={form.isDefault} onChange={e => setForm(f => ({ ...f, isDefault: e.target.checked }))} />
                    <label htmlFor="isDefault" className="text-sm text-gray-600">Set as default warehouse</label>
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Description</label>
                  <textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                </div>
              </div>
              <div className="p-6 border-t flex justify-end gap-3 sticky bottom-0 bg-white">
                <button onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                <button onClick={handleSave} disabled={saving || !form.plantId || !form.code || !form.name} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50">{saving ? 'Saving...' : 'Save Warehouse'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
