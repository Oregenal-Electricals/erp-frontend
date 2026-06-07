'use client';
import { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/layout/AppLayout';

const API = process.env.NEXT_PUBLIC_API_URL;
function getToken() {
  if (typeof window !== 'undefined') return localStorage.getItem('accessToken');
}

const MATERIAL_TYPES = ['ELECTRONIC', 'MECHANICAL', 'ELECTRICAL', 'CHEMICAL', 'PACKAGING', 'OTHER'];
const GST_RATES = [0, 5, 12, 18, 28];

export default function RawMaterialsPage() {
  const [materials, setMaterials] = useState([]);
  const [stats, setStats] = useState(null);
  const [categories, setCategories] = useState([]);
  const [uoms, setUoms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [materialType, setMaterialType] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({
    code: '', name: '', description: '', materialType: 'ELECTRONIC',
    categoryId: '', uomId: '', hsnCode: '', gstRate: 18,
    brand: '', partNumber: '', minStockLevel: '', maxStockLevel: '',
    reorderQty: '', leadTimeDays: '', specifications: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchStats = useCallback(async () => {
    const res = await fetch(`${API}/raw-materials/stats`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) setStats(await res.json());
  }, []);

  const fetchDropdowns = useCallback(async () => {
    const [catRes, uomRes] = await Promise.all([
      fetch(`${API}/items/categories?limit=100`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch(`${API}/items/uom?limit=100`, { headers: { Authorization: `Bearer ${getToken()}` } }),
    ]);
    if (catRes.ok) { const d = await catRes.json(); setCategories(d.data || []); }
    if (uomRes.ok) { const d = await uomRes.json(); setUoms(d.data || []); }
  }, []);

  const fetchMaterials = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit: 20 });
    if (search) params.set('search', search);
    if (materialType) params.set('materialType', materialType);
    const res = await fetch(`${API}/raw-materials?${params}`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) {
      const d = await res.json();
      setMaterials(d.data);
      setTotalPages(d.totalPages);
      setTotal(d.total);
    }
    setLoading(false);
  }, [page, search, materialType]);

  useEffect(() => { fetchStats(); fetchDropdowns(); }, [fetchStats, fetchDropdowns]);
  useEffect(() => { fetchMaterials(); }, [fetchMaterials]);

  function resetForm() {
    return {
      code: '', name: '', description: '', materialType: 'ELECTRONIC',
      categoryId: '', uomId: '', hsnCode: '', gstRate: 18,
      brand: '', partNumber: '', minStockLevel: '', maxStockLevel: '',
      reorderQty: '', leadTimeDays: '', specifications: '',
    };
  }

  function openCreate() {
    setEditItem(null);
    setForm(resetForm());
    setError('');
    setShowModal(true);
  }

  function openEdit(m) {
    setEditItem(m);
    setForm({
      code: m.code, name: m.name, description: m.description || '',
      materialType: m.materialType, categoryId: m.categoryId || '',
      uomId: m.uomId || '', hsnCode: m.hsnCode || '', gstRate: m.gstRate ?? 18,
      brand: m.brand || '', partNumber: m.partNumber || '',
      minStockLevel: m.minStockLevel || '', maxStockLevel: m.maxStockLevel || '',
      reorderQty: m.reorderQty || '', leadTimeDays: m.leadTimeDays || '',
      specifications: m.specifications ? JSON.stringify(m.specifications, null, 2) : '',
    });
    setError('');
    setShowModal(true);
  }

  async function handleSave() {
    setSaving(true); setError('');
    const body = { ...form };
    ['minStockLevel', 'maxStockLevel', 'reorderQty'].forEach(k => {
      if (body[k] !== '') body[k] = parseFloat(body[k]); else delete body[k];
    });
    if (body.leadTimeDays !== '') body.leadTimeDays = parseInt(body.leadTimeDays); else delete body.leadTimeDays;
    if (body.gstRate !== '') body.gstRate = parseFloat(body.gstRate);
    if (body.specifications) {
      try { body.specifications = JSON.parse(body.specifications); } catch { body.specifications = {}; }
    } else delete body.specifications;
    if (!body.categoryId) delete body.categoryId;
    if (!body.uomId) delete body.uomId;

    const url = editItem ? `${API}/raw-materials/${editItem.id}` : `${API}/raw-materials`;
    const method = editItem ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (res.ok) { setShowModal(false); fetchMaterials(); fetchStats(); }
    else setError(data.message || 'Save failed');
    setSaving(false);
  }

  async function handleDeactivate(id) {
    if (!confirm('Deactivate this raw material?')) return;
    await fetch(`${API}/raw-materials/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${getToken()}` } });
    fetchMaterials(); fetchStats();
  }

  const typeColor = {
    ELECTRONIC: 'bg-blue-100 text-blue-700',
    MECHANICAL: 'bg-gray-100 text-gray-700',
    ELECTRICAL: 'bg-yellow-100 text-yellow-700',
    CHEMICAL: 'bg-red-100 text-red-700',
    PACKAGING: 'bg-green-100 text-green-700',
    OTHER: 'bg-purple-100 text-purple-700',
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Raw Material Master</h1>
            <p className="text-gray-500 text-sm mt-1">Electronic, mechanical and other input materials</p>
          </div>
          <button onClick={openCreate} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium">+ Add Material</button>
        </div>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
            {[
              { label: 'Total', value: stats.total, color: 'bg-gray-50' },
              { label: 'Active', value: stats.active, color: 'bg-green-50' },
              { label: 'Electronic', value: stats.electronic, color: 'bg-blue-50' },
              { label: 'Mechanical', value: stats.mechanical, color: 'bg-gray-100' },
              { label: 'Electrical', value: stats.electrical, color: 'bg-yellow-50' },
              { label: 'Packaging', value: stats.packaging, color: 'bg-emerald-50' },
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
              placeholder="Search name, code, part number, brand..."
              value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
            <select className="border rounded-lg px-3 py-2 text-sm" value={materialType} onChange={e => { setMaterialType(e.target.value); setPage(1); }}>
              <option value="">All Types</option>
              {MATERIAL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <span className="text-sm text-gray-500 self-center">{total} materials</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
                <tr>
                  {['Code', 'Name', 'Type', 'Part No.', 'Brand', 'HSN', 'Min Stock', 'Lead Time', 'UOM', 'Status', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={11} className="text-center py-10 text-gray-400">Loading...</td></tr>
                ) : materials.length === 0 ? (
                  <tr><td colSpan={11} className="text-center py-10 text-gray-400">No materials found</td></tr>
                ) : materials.map(m => (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono font-medium text-blue-600">{m.code}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{m.name}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${typeColor[m.materialType] || 'bg-gray-100'}`}>{m.materialType}</span></td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{m.partNumber || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{m.brand || '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{m.hsnCode || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{m.minStockLevel ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{m.leadTimeDays ? `${m.leadTimeDays}d` : '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{m.uom?.code || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${m.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {m.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(m)} className="text-blue-600 hover:underline text-xs">Edit</button>
                        {m.isActive && <button onClick={() => handleDeactivate(m.id)} className="text-red-500 hover:underline text-xs">Deactivate</button>}
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
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-white">
                <h2 className="text-lg font-bold">{editItem ? 'Edit Raw Material' : 'Add Raw Material'}</h2>
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
                    <label className="block text-sm text-gray-600 mb-1">Material Type</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.materialType} onChange={e => setForm(f => ({ ...f, materialType: e.target.value }))}>
                      {MATERIAL_TYPES.map(t => <option key={t}>{t}</option>)}
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
                    <label className="block text-sm text-gray-600 mb-1">Brand</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Part Number</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm font-mono" value={form.partNumber} onChange={e => setForm(f => ({ ...f, partNumber: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Category</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.categoryId} onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))}>
                      <option value="">— Select —</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">UOM</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.uomId} onChange={e => setForm(f => ({ ...f, uomId: e.target.value }))}>
                      <option value="">— Select —</option>
                      {uoms.map(u => <option key={u.id} value={u.id}>{u.code} - {u.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">HSN Code</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm font-mono" value={form.hsnCode} onChange={e => setForm(f => ({ ...f, hsnCode: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">GST Rate (%)</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.gstRate} onChange={e => setForm(f => ({ ...f, gstRate: e.target.value }))}>
                      {GST_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Min Stock Level</label>
                    <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.minStockLevel} onChange={e => setForm(f => ({ ...f, minStockLevel: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Max Stock Level</label>
                    <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.maxStockLevel} onChange={e => setForm(f => ({ ...f, maxStockLevel: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Reorder Qty</label>
                    <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.reorderQty} onChange={e => setForm(f => ({ ...f, reorderQty: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Lead Time (days)</label>
                    <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.leadTimeDays} onChange={e => setForm(f => ({ ...f, leadTimeDays: e.target.value }))} />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-600 mb-1">Specifications (JSON)</label>
                    <textarea className="w-full border rounded-lg px-3 py-2 text-sm font-mono" rows={3} placeholder='{"voltage":"5V","package":"DIP-8"}' value={form.specifications} onChange={e => setForm(f => ({ ...f, specifications: e.target.value }))} />
                  </div>
                </div>
              </div>
              <div className="p-6 border-t flex justify-end gap-3 sticky bottom-0 bg-white">
                <button onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                  {saving ? 'Saving...' : editItem ? 'Update Material' : 'Create Material'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
