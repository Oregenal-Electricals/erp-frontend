'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import api from '@/lib/api';

const ROLES = [
  'SUPER_ADMIN','CORPORATE_ADMIN','PLANT_HEAD','UNIT_HEAD',
  'PRODUCTION_HEAD','PLANNING_MANAGER','PURCHASE_MANAGER',
  'STORE_MANAGER','QC_MANAGER','FINANCE_MANAGER','HR_MANAGER',
  'SUPERVISOR','OPERATOR','VIEWER',
];

export default function EditUserPage() {
  const router = useRouter();
  const { id } = useParams();
  const [form, setForm]     = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    api.get(`/users/${id}`)
      .then(({ data }) => setForm({
        firstName:    data.firstName,
        lastName:     data.lastName,
        phone:        data.phone || '',
        role:         data.role,
        employeeCode: data.employeeCode || '',
      }))
      .catch(() => setError('Failed to load user'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async () => {
    setError(''); setSuccess(''); setSaving(true);
    try {
      await api.put(`/users/${id}`, form);
      setSuccess('User updated successfully!');
      setTimeout(() => router.push('/users'), 1000);
    } catch (err) {
      const msg = err.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : msg || 'Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "w-full border-2 border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition-colors";
  const labelClass = "block text-sm font-semibold text-gray-700 mb-1";

  if (loading) return (
    <AppLayout>
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    </AppLayout>
  );

  return (
    <AppLayout>
      <PageHeader title="Edit User" subtitle={`Editing: ${form.firstName || ''} ${form.lastName || ''}`} />
      <div className="max-w-2xl">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border-2 border-red-300 rounded-lg text-red-700 text-sm font-medium">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-3 bg-green-50 border-2 border-green-300 rounded-lg text-green-700 text-sm font-medium">
              ✅ {success}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Employee Code</label>
              <input type="text" name="employeeCode" value={form.employeeCode || ''}
                onChange={handleChange} placeholder="EMP0002"
                style={{ color: '#111827', backgroundColor: '#ffffff' }}
                className={inputClass} />
            </div>

            <div>
              <label className={labelClass}>Role <span className="text-red-500">*</span></label>
              <select name="role" value={form.role || 'VIEWER'} onChange={handleChange}
                style={{ color: '#111827', backgroundColor: '#ffffff' }}
                className={inputClass}>
                {ROLES.map((r) => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
              </select>
            </div>

            <div>
              <label className={labelClass}>First Name <span className="text-red-500">*</span></label>
              <input type="text" name="firstName" value={form.firstName || ''}
                onChange={handleChange} placeholder="John"
                style={{ color: '#111827', backgroundColor: '#ffffff' }}
                className={inputClass} />
            </div>

            <div>
              <label className={labelClass}>Last Name <span className="text-red-500">*</span></label>
              <input type="text" name="lastName" value={form.lastName || ''}
                onChange={handleChange} placeholder="Doe"
                style={{ color: '#111827', backgroundColor: '#ffffff' }}
                className={inputClass} />
            </div>

            <div className="col-span-2">
              <label className={labelClass}>Phone</label>
              <input type="text" name="phone" value={form.phone || ''}
                onChange={handleChange} placeholder="+91-9876543210"
                style={{ color: '#111827', backgroundColor: '#ffffff' }}
                className={inputClass} />
            </div>

            {/* Info box */}
            <div className="col-span-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-700 font-medium">
                ℹ️ Email and Company cannot be changed after creation. Use Reset Password to change password.
              </p>
            </div>
          </div>

          <div className="flex gap-3 mt-6 pt-5 border-t border-gray-100">
            <button type="button" onClick={handleSubmit} disabled={saving}
              className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {saving ? 'Saving...' : 'Update User'}
            </button>
            <button type="button" onClick={() => router.push('/users')}
              className="border-2 border-gray-300 text-gray-700 px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
