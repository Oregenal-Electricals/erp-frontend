'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import api from '@/lib/api';

export default function EditPlantPage() {
  const router = useRouter();
  const { id } = useParams();
  const [form, setForm] = useState({});
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get(`/masters/plants/${id}`),
      api.get('/masters/companies'),
    ])
      .then(([plantRes, compRes]) => {
        setForm(plantRes.data);
        setCompanies(compRes.data);
      })
      .catch(() => setError('Failed to load data'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await api.put(`/masters/plants/${id}`, form);
      router.push('/masters/plant');
    } catch (err) {
      const msg = err.response?.data?.message;
      setError(
        Array.isArray(msg) ? msg.join(', ') : msg || 'Failed to update plant',
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </AppLayout>
    );

  return (
    <AppLayout>
      <PageHeader title="Edit Plant" subtitle={`Editing: ${form.name || ''}`} />
      <div className="max-w-3xl">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company <span className="text-red-500">*</span>
                </label>
                <select
                  name="companyId"
                  required
                  value={form.companyId || ''}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              {[
                ['Plant Code', 'code', true, 'PLT001', false],
                ['Plant Name', 'name', true, 'Mumbai Plant', true],
                ['GSTIN', 'gstin', false, '27AABCA1234Z1ZX', true],
                ['Address', 'address', true, '', true],
                ['City', 'city', true, 'Mumbai', false],
                ['State', 'state', true, 'Maharashtra', false],
                ['Country', 'country', false, 'India', false],
                ['Pincode', 'pincode', true, '400001', false],
                ['Phone', 'phone', false, '', false],
                ['Email', 'email', false, '', false],
              ].map(([label, name, req, ph, full]) => (
                <div key={name} className={full ? 'col-span-2' : ''}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {label} {req && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="text"
                    name={name}
                    required={req}
                    placeholder={ph}
                    value={form[name] || ''}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-6 pt-5 border-t border-gray-100">
              <button
                type="submit"
                disabled={saving}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Saving...' : 'Update Plant'}
              </button>
              <button
                type="button"
                onClick={() => router.push('/masters/plant')}
                className="border border-gray-300 text-gray-700 px-6 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}
