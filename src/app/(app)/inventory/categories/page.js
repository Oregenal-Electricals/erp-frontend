'use client';
import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import api from '@/lib/api';
import { Plus, ChevronRight } from 'lucide-react';

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [form, setForm] = useState({ code: '', name: '', description: '', parentId: '' });
  const [error, setError]   = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');

  const fetchCategories = async () => {
    setLoading(true);
    const { data } = await api.get('/items/categories');
    setCategories(data); setLoading(false);
  };

  useEffect(() => { fetchCategories(); }, []);

  const handleSubmit = async () => {
    if (!form.code || !form.name) { setError('Code and name required'); return; }
    setError(''); setSaving(true);
    try {
      const payload = { ...form };
      if (!payload.parentId) delete payload.parentId;
      await api.post('/items/categories', payload);
      setSuccess(`✅ Category ${form.code} created`);
      setForm({ code: '', name: '', description: '', parentId: '' });
      fetchCategories();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed');
    } finally { setSaving(false); }
  };

  const inputClass = "border-2 border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500";
  const rootCats = categories.filter(c => !c.parentId);

  return (
    <AppLayout>
      <PageHeader title="Item Categories" subtitle="Manage item classification tree" />
      <div className="grid grid-cols-3 gap-6">
        {/* Form */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-bold text-gray-700 mb-4">Add Category</h3>
          {error   && <div className="mb-3 p-2 bg-red-50 border border-red-300 rounded text-red-700 text-xs">{error}</div>}
          {success && <div className="mb-3 p-2 bg-green-50 border border-green-300 rounded text-green-700 text-xs">{success}</div>}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Code <span className="text-red-500">*</span></label>
              <input type="text" value={form.code} onChange={(e) => setForm(p => ({ ...p, code: e.target.value }))}
                placeholder="ELEC-PCB" style={{ color: '#111827', backgroundColor: '#ffffff' }} className={`w-full ${inputClass}`} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Name <span className="text-red-500">*</span></label>
              <input type="text" value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="PCB Components" style={{ color: '#111827', backgroundColor: '#ffffff' }} className={`w-full ${inputClass}`} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Description</label>
              <input type="text" value={form.description} onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))}
                placeholder="Optional description" style={{ color: '#111827', backgroundColor: '#ffffff' }} className={`w-full ${inputClass}`} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Parent Category</label>
              <select value={form.parentId} onChange={(e) => setForm(p => ({ ...p, parentId: e.target.value }))}
                style={{ color: '#111827', backgroundColor: '#ffffff' }} className={`w-full ${inputClass}`}>
                <option value="">Root Category</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <button onClick={handleSubmit} disabled={saving}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2 rounded-lg text-sm font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors">
              <Plus size={14} />{saving ? 'Adding...' : 'Add Category'}
            </button>
          </div>
        </div>

        {/* Category Tree */}
        <div className="col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-700">Category Tree ({categories.length})</h3>
          </div>
          {loading ? (
            <div className="p-12 text-center"><div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" /></div>
          ) : (
            <div className="p-4 space-y-2">
              {rootCats.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-8">No categories yet</p>
              ) : rootCats.map((cat) => (
                <div key={cat.id}>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold font-mono text-blue-600">{cat.code}</span>
                      <span className="text-sm font-medium text-gray-800">{cat.name}</span>
                      {cat._count?.items > 0 && <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">{cat._count.items} items</span>}
                    </div>
                  </div>
                  {cat.children?.length > 0 && (
                    <div className="ml-6 mt-1 space-y-1 border-l-2 border-gray-200 pl-3">
                      {cat.children.map((child) => (
                        <div key={child.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50">
                          <ChevronRight size={12} className="text-gray-400" />
                          <span className="text-xs font-mono text-blue-500">{child.code}</span>
                          <span className="text-xs text-gray-700">{child.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
