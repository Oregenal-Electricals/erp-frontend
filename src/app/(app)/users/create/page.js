'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import api from '@/lib/api';

export default function CreateUserPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    employeeCode: '', password: '', role: '',
    additionalRoles: [],
    companyId: '', mustChangePwd: true,
  });
  const [companies, setCompanies] = useState([]);
  const [roles, setRoles] = useState([]);
  const [error, setError]   = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/masters/companies').then(({ data }) => setCompanies(data));
    api.get('/roles').then(({ data }) => setRoles(data?.data || data || []));
  }, []);

  const handleChange = (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((prev) => ({ ...prev, [e.target.name]: val }));
  };

  const handleSubmit = async () => {
    if (!form.firstName || !form.lastName || !form.email || !form.password || !form.role || !form.companyId) {
      setError('Please fill all required fields');
      return;
    }
    setError('');
    setSaving(true);
    try {
      await api.post('/users', form);
      router.push('/users');
    } catch (err) {
      const msg = err.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : msg || 'Failed to create user');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "w-full border-2 border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition-colors";
  const labelClass = "block text-sm font-semibold text-gray-700 mb-1";

  return (
    <AppLayout>
      <PageHeader title="Create User" subtitle="Add a new system user" />
      <div className="max-w-2xl">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          {error && (
            <div className="mb-5 p-3 bg-red-50 border-2 border-red-300 rounded-lg text-red-700 text-sm font-medium">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className={labelClass}>Company <span className="text-red-500">*</span></label>
              <select name="companyId" value={form.companyId} onChange={handleChange}
                style={{ color: '#111827', backgroundColor: '#ffffff' }}
                className={inputClass}>
                <option value="">Select Company</option>
                {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div>
              <label className={labelClass}>Employee Code</label>
              <input type="text" name="employeeCode" value={form.employeeCode}
                onChange={handleChange} placeholder="EMP0003"
                style={{ color: '#111827', backgroundColor: '#ffffff' }}
                className={inputClass} />
            </div>

            <div>
              <label className={labelClass}>Primary Role <span className="text-red-500">*</span></label>
              <select name="role" value={form.role} onChange={handleChange}
                style={{ color: '#111827', backgroundColor: '#ffffff' }}
                className={inputClass}>
                {roles.map((r) => <option key={r.id} value={r.name}>{r.label}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className={labelClass}>Additional Roles <span className="text-xs font-normal text-gray-400">(optional — for users with multiple responsibilities)</span></label>
              <div className="grid grid-cols-2 gap-2 mt-1 p-3 border-2 border-gray-200 rounded-lg bg-gray-50">
                {roles.filter(r => r.name !== form.role).map(r => (
                  <label key={r.id} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input type="checkbox"
                      checked={form.additionalRoles.includes(r.name)}
                      onChange={e => {
                        setForm(prev => ({
                          ...prev,
                          additionalRoles: e.target.checked
                            ? [...prev.additionalRoles, r.name]
                            : prev.additionalRoles.filter(x => x !== r.name)
                        }));
                      }}
                      className="w-4 h-4 accent-blue-600"
                    />
                    {r.label}
                  </label>
                ))}
              </div>
              {form.additionalRoles.length > 0 && (
                <p className="text-xs text-blue-600 mt-1">
                  {form.additionalRoles.length} additional role(s) assigned — permissions will be merged
                </p>
              )}
            </div>

            <div>
              <label className={labelClass}>First Name <span className="text-red-500">*</span></label>
              <input type="text" name="firstName" value={form.firstName}
                onChange={handleChange} placeholder="John"
                style={{ color: '#111827', backgroundColor: '#ffffff' }}
                className={inputClass} />
            </div>

            <div>
              <label className={labelClass}>Last Name <span className="text-red-500">*</span></label>
              <input type="text" name="lastName" value={form.lastName}
                onChange={handleChange} placeholder="Doe"
                style={{ color: '#111827', backgroundColor: '#ffffff' }}
                className={inputClass} />
            </div>

            <div>
              <label className={labelClass}>Email <span className="text-red-500">*</span></label>
              <input type="email" name="email" value={form.email}
                onChange={handleChange} placeholder="john@company.com"
                style={{ color: '#111827', backgroundColor: '#ffffff' }}
                className={inputClass} />
            </div>

            <div>
              <label className={labelClass}>Phone</label>
              <input type="text" name="phone" value={form.phone}
                onChange={handleChange} placeholder="+91-9876543210"
                style={{ color: '#111827', backgroundColor: '#ffffff' }}
                className={inputClass} />
            </div>

            <div className="col-span-2">
              <label className={labelClass}>Password <span className="text-red-500">*</span></label>
              <input type="password" name="password" value={form.password}
                onChange={handleChange} placeholder="Min 8 chars, 1 uppercase, 1 number"
                style={{ color: '#111827', backgroundColor: '#ffffff' }}
                className={inputClass} />
              <p className="text-xs text-gray-400 mt-1">
                Min 8 characters · At least 1 uppercase · At least 1 number
              </p>
            </div>

            <div className="col-span-2 flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <input type="checkbox" name="mustChangePwd" id="mustChangePwd"
                checked={form.mustChangePwd} onChange={handleChange}
                className="w-4 h-4 accent-blue-600" />
              <label htmlFor="mustChangePwd" className="text-sm text-gray-700 cursor-pointer">
                <span className="font-semibold">Force password change</span> on first login
              </label>
            </div>
          </div>

          <div className="flex gap-3 mt-6 pt-5 border-t border-gray-100">
            <button type="button" onClick={handleSubmit} disabled={saving}
              className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {saving ? 'Creating...' : 'Create User'}
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
