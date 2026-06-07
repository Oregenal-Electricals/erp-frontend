'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import api from '@/lib/api';

const WH_TYPES = ['RAW_MATERIAL','FINISHED_GOOD','WIP','SPARE_PART','SCRAP','GENERAL'];

export default function CreateWarehousePage() {
  const router = useRouter();
  const [plants, setPlants] = useState([]);
  const [form, setForm] = useState({
    plantId: '', code: '', name: '', type: 'GENERAL',
    description: '', address: '', capacity: '', isDefault: false,
  });
  const [error, setError]   = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/masters/plants').then(({ data }) => setPlants(data));
  }, []);

  const handleChange = (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm(p => ({ ...p, [e.target.name]: val }));
  };

  const handleSubmit = async () => {
    if (!form.plantId || !form.code || !form.name || !form.type) {
      setError('Plant, code, name and type are required'); return;
    }
    setError(''); setSaving(true);
    try {
      const payload = { ...form };
      if (payload.capacity) payload.capacity = parseFloat(payload.capacity);
      else delete payload.capacity;
      const { data } = await api.post('/warehouses', payload);
      router.push(`/inventory/warehouses/${data.id}`);
    } catch (err) {
      const msg = err.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : msg || 'Failed');
    } finally { setSaving(false); }
  };

  const inputClass = "w-full border-2 border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500";
  const labelClass = "block text-sm font-semibold text-gray-700 mb-1";

  return (
    <AppLayout>
      <PageHeader title="New Warehouse" subtitle="Create a new storage location" />
      <div className="max-w-2xl">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          {error && <div className="mb-4 p-3 bg-red-50 border-2 border-red-300 rounded-lg text-red-700 text-sm">{error}</div>}

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className={labelClass}>Plant <span className="text-red-500">*</span></label>
              <select name="plantId" value={form.plantId} onChange={handleChange}
                style={{ color: '#111827', backgroundColor: '#ffffff' }} className={inputClass}>
                <option value="">Select Plant</option>
                {plants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Type <span className="text-red-500">*</span></label>
              <select name="type" value={form.type} onChange={handleChange}
                style={{ color: '#111827', backgroundColor: '#ffffff' }} className={inputClass}>
                {WH_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Code <span className="text-red-500">*</span></label>
              <input type="text" name="code" value={form.code} onChange={handleChange}
                placeholder="WH-RM-01" style={{ color: '#111827', backgroundColor: '#ffffff' }} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Name <span className="text-red-500">*</span></label>
              <input type="text" name="name" value={form.name} onChange={handleChange}
                placeholder="Raw Material Store" style={{ color: '#111827', backgroundColor: '#ffffff' }} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Capacity (sq.ft)</label>
              <input type="number" name="capacity" value={form.capacity} onChange={handleChange}
                placeholder="5000" style={{ color: '#111827', backgroundColor: '#ffffff' }} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Address</label>
              <input type="text" name="address" value={form.address} onChange={handleChange}
                placeholder="Bay 1, Building A" style={{ color: '#111827', backgroundColor: '#ffffff' }} className={inputClass} />
            </div>
            <div className="col-span-2">
              <label className={labelClass}>Description</label>
              <input type="text" name="description" value={form.description} onChange={handleChange}
                placeholder="Main raw material storage area" style={{ color: '#111827', backgroundColor: '#ffffff' }} className={inputClass} />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer mb-5">
            <input type="checkbox" name="isDefault" checked={form.isDefault} onChange={handleChange} className="w-4 h-4 accent-blue-600" />
            <span className="text-sm text-gray-700 font-medium">Set as default warehouse</span>
          </label>

          <div className="flex gap-3 pt-4 border-t border-gray-100">
            <button onClick={handleSubmit} disabled={saving}
              className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {saving ? 'Creating...' : 'Create Warehouse'}
            </button>
            <button onClick={() => router.push('/inventory/warehouses')}
              className="border-2 border-gray-300 text-gray-700 px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
