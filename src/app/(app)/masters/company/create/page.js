'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import api from '@/lib/api';

const FIELDS = [
  {
    label: 'Company Code',
    name: 'code',
    required: true,
    placeholder: 'COMP001',
    hint: 'Unique identifier (2-20 chars)',
  },
  {
    label: 'Company Name',
    name: 'name',
    required: true,
    placeholder: 'Acme Electronics Pvt Ltd',
  },
  {
    label: 'Legal Name',
    name: 'legalName',
    required: true,
    placeholder: 'Acme Electronics Private Limited',
  },
  {
    label: 'PAN',
    name: 'pan',
    required: false,
    placeholder: 'AABCA1234Z',
    hint: '10-char PAN number',
  },
  { label: 'TAN', name: 'tan', required: false, placeholder: 'MUMA12345A' },
  {
    label: 'CIN',
    name: 'cin',
    required: false,
    placeholder: 'U12345MH2020PTC123456',
  },
  {
    label: 'GSTIN',
    name: 'gstin',
    required: false,
    placeholder: '27AABCA1234Z1ZX',
    hint: '15-char GSTIN',
  },
  {
    label: 'MSME Number',
    name: 'msmeNumber',
    required: false,
    placeholder: '',
  },
  {
    label: 'Address',
    name: 'address',
    required: true,
    placeholder: '123 Industrial Area',
    full: true,
  },
  { label: 'City', name: 'city', required: true, placeholder: 'Mumbai' },
  { label: 'State', name: 'state', required: true, placeholder: 'Maharashtra' },
  { label: 'Country', name: 'country', required: false, placeholder: 'India' },
  {
    label: 'Pincode',
    name: 'pincode',
    required: true,
    placeholder: '400069',
    hint: '6 digits',
  },
  {
    label: 'Phone',
    name: 'phone',
    required: false,
    placeholder: '+91-22-12345678',
  },
  {
    label: 'Email',
    name: 'email',
    required: false,
    placeholder: 'info@company.com',
    type: 'email',
  },
  {
    label: 'Website',
    name: 'website',
    required: false,
    placeholder: 'https://www.company.com',
  },
];

export default function CreateCompanyPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    country: 'India',
    currencyCode: 'INR',
    timezone: 'Asia/Kolkata',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await api.post('/masters/companies', form);
      router.push('/masters/company');
    } catch (err) {
      const msg = err.response?.data?.message;
      setError(
        Array.isArray(msg) ? msg.join(', ') : msg || 'Failed to create company',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <PageHeader
        title="Create Company"
        subtitle="Add a new company to the system"
      />

      <div className="max-w-3xl">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          {error && (
            <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-4">
              {FIELDS.map(
                ({ label, name, required, placeholder, hint, full, type }) => (
                  <div key={name} className={full ? 'col-span-2' : ''}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {label}
                      {required && (
                        <span className="text-red-500 ml-0.5">*</span>
                      )}
                    </label>
                    <input
                      type={type || 'text'}
                      name={name}
                      required={required}
                      value={form[name] || ''}
                      onChange={handleChange}
                      placeholder={placeholder}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    {hint && (
                      <p className="text-xs text-gray-400 mt-0.5">{hint}</p>
                    )}
                  </div>
                ),
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 mt-6 pt-5 border-t border-gray-100">
              <button
                type="submit"
                disabled={saving}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? 'Saving...' : 'Save Company'}
              </button>
              <button
                type="button"
                onClick={() => router.push('/masters/company')}
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
