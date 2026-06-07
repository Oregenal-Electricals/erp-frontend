'use client';
import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import api from '@/lib/api';
import { Plus, Check } from 'lucide-react';

export default function UomPage() {
  const [uoms, setUoms]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm]     = useState({ code: '', name: '', description: '', isBase: false });
  const [error, setError]   = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');

  const fetchUoms = async () => {
    setLoading(true);
    const { data } = await api.get('/items/uom');
    setUoms(data); setLoading(false);
  };

  useEffect(() => { fetchUoms(); }, []);

  const handleSubmit = async () => {
    if (!form.code || !form.name) { setError('Code and name required'); return; }
    setError(''); setSaving(true);
    try {
      await api.post('/items/uom', form);
      setSuccess(`✅ UOM ${form.code} created`);
      setForm({ code: '', name: '', description: '', isBase: false });
      fetchUoms();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed');
    } finally { setSaving(false); }
  };

  const inputClass = "border-2 border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500";

  return (
    <AppLayout>
      <PageHeader title="Unit of Measure" subtitle="Manage measurement units" />
      <div className="grid grid-cols-3 gap-6">
        {/* Form */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-bold text-gray-700 mb-4">Add New UOM</h3>
          {error   && <div className="mb-3 p-2 bg-red-50 border border-red-300 rounded text-red-700 text-xs">{error}</div>}
          {success && <div className="mb-3 p-2 bg-green-50 border border-green-300 rounded text-green-700 text-xs">{success}</div>}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Code <span className="text-red-500">*</span></label>
              <input type="text" value={form.code} onChange={(e) => setForm(p => ({ ...p, code: e.target.value }))}
                placeholder="NOS" style={{ color: '#111827', backgroundColor: '#ffffff' }} className={`w-full ${inputClass}`} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Name <span className="text-red-500">*</span></label>
              <input type="text" value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="Numbers" style={{ color: '#111827', backgroundColor: '#ffffff' }} className={`w-full ${inputClass}`} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Description</label>
              <input type="text" value={form.description} onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))}
                placeholder="Count of items" style={{ color: '#111827', backgroundColor: '#ffffff' }} className={`w-full ${inputClass}`} />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.isBase} onChange={(e) => setForm(p => ({ ...p, isBase: e.target.checked }))} className="accent-blue-600" />
              <span className="text-xs text-gray-700">Base UOM</span>
            </label>
            <button onClick={handleSubmit} disabled={saving}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2 rounded-lg text-sm font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors">
              <Plus size={14} />{saving ? 'Adding...' : 'Add UOM'}
            </button>
          </div>
        </div>

        {/* List */}
        <div className="col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-700">All UOMs ({uoms.length})</h3>
          </div>
          {loading ? (
            <div className="p-12 text-center"><div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" /></div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Code','Name','Description','Base','Items','Status'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {uoms.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-bold font-mono text-blue-600">{u.code}</td>
                    <td className="px-4 py-3 text-gray-800 font-medium">{u.name}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{u.description || '—'}</td>
                    <td className="px-4 py-3">{u.isBase ? <Check size={14} className="text-green-600" /> : '—'}</td>
                    <td className="px-4 py-3 text-center"><span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">{u._count?.items || 0}</span></td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{u.isActive ? 'Active' : 'Inactive'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
