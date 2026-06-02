'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import api from '@/lib/api';

export default function CreateBranchPage() {
  const router = useRouter();
  const [form, setForm] = useState({ country: 'India', branchType: 'SALES' });
  const [companies, setCompanies] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/masters/companies').then(({ data }) => setCompanies(data));
  }, []);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await api.post('/masters/branches', form);
      router.push('/masters/branch');
    } catch (err) {
      const msg = err.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : msg || 'Failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <PageHeader title="Create Branch" subtitle="Add a new branch" />
      <div className="max-w-2xl">
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
                  <option value="">Select Company</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Branch Type
                </label>
                <select
                  name="branchType"
                  value={form.branchType}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="SALES">Sales</option>
                  <option value="OFFICE">Office</option>
                  <option value="WAREHOUSE">Warehouse</option>
                </select>
              </div>
              {[
                ['Code', 'code', true, 'BRN001', false],
                ['Branch Name', 'name', true, 'Delhi Branch', true],
                ['GSTIN', 'gstin', false, '07AABCA1234Z1ZX', true],
                ['Address', 'address', true, '', true],
                ['City', 'city', true, 'New Delhi', false],
                ['State', 'state', true, 'Delhi', false],
                ['Pincode', 'pincode', true, '110001', false],
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
                {saving ? 'Saving...' : 'Save Branch'}
              </button>
              <button
                type="button"
                onClick={() => router.push('/masters/branch')}
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
