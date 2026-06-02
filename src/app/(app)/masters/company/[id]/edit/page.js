'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import api from '@/lib/api';

const FIELDS = [
  { label: 'Company Code',  name: 'code',       required: true,  placeholder: 'COMP001'                    },
  { label: 'Company Name',  name: 'name',        required: true,  placeholder: 'Acme Electronics Pvt Ltd'  },
  { label: 'Legal Name',    name: 'legalName',   required: true,  placeholder: 'Acme Electronics Pvt Ltd'  },
  { label: 'PAN',           name: 'pan',         required: false, placeholder: 'AABCA1234Z'                 },
  { label: 'TAN',           name: 'tan',         required: false, placeholder: 'MUMA12345A'                 },
  { label: 'CIN',           name: 'cin',         required: false, placeholder: 'U12345MH2020PTC123456'      },
  { label: 'GSTIN',         name: 'gstin',       required: false, placeholder: '27AABCA1234Z1ZX'            },
  { label: 'MSME Number',   name: 'msmeNumber',  required: false, placeholder: ''                           },
  { label: 'Address',       name: 'address',     required: true,  placeholder: '123 Industrial Area', full: true },
  { label: 'City',          name: 'city',        required: true,  placeholder: 'Mumbai'                     },
  { label: 'State',         name: 'state',       required: true,  placeholder: 'Maharashtra'                },
  { label: 'Country',       name: 'country',     required: false, placeholder: 'India'                      },
  { label: 'Pincode',       name: 'pincode',     required: true,  placeholder: '400069'                     },
  { label: 'Phone',         name: 'phone',       required: false, placeholder: '+91-22-12345678'            },
  { label: 'Email',         name: 'email',       required: false, placeholder: 'info@company.com', type: 'email' },
  { label: 'Website',       name: 'website',     required: false, placeholder: 'https://www.company.com'   },
  { label: 'Currency Code', name: 'currencyCode',required: false, placeholder: 'INR'                        },
  { label: 'Timezone',      name: 'timezone',    required: false, placeholder: 'Asia/Kolkata'               },
];

// Only these fields are sent to PUT API — no nested relations
const ALLOWED_KEYS = [
  'code','name','legalName','pan','tan','cin','gstin','msmeNumber',
  'address','city','state','country','pincode','phone','email',
  'website','logoUrl','currencyCode','timezone',
];

export default function EditCompanyPage() {
  const router = useRouter();
  const { id } = useParams();
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetchCompany = async () => {
      try {
        const { data } = await api.get(`/masters/companies/${id}`);
        // Strip nested relations — only keep scalar fields
        const clean = {};
        ALLOWED_KEYS.forEach((k) => { if (data[k] !== undefined) clean[k] = data[k] ?? ''; });
        setForm(clean);
      } catch {
        setError('Failed to load company');
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchCompany();
  }, [id]);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async () => {
    if (!form.code || !form.name || !form.legalName || !form.address || !form.city || !form.state || !form.pincode) {
      setError('Please fill all required fields');
      return;
    }
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      // Only send allowed keys
      const payload = {};
      ALLOWED_KEYS.forEach((k) => { if (form[k] !== undefined) payload[k] = form[k] || undefined; });
      await api.put(`/masters/companies/${id}`, payload);
      setSuccess('Company updated successfully!');
      setTimeout(() => router.push('/masters/company'), 1000);
    } catch (err) {
      const msg = err.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : msg || 'Failed to update company');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader title="Edit Company" subtitle={`Editing: ${form.name || ''}`} />
      <div className="max-w-3xl">
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
            {FIELDS.map(({ label, name, required, placeholder, full, type }) => (
              <div key={name} className={full ? 'col-span-2' : ''}>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  {label}
                  {required && <span className="text-red-500 ml-0.5">*</span>}
                </label>
                <input
                  type={type || 'text'}
                  name={name}
                  value={form[name] || ''}
                  onChange={handleChange}
                  placeholder={placeholder}
                  style={{ color: '#111827', backgroundColor: '#ffffff' }}
                  className="w-full border-2 border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3 mt-6 pt-5 border-t border-gray-100">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving...' : 'Update Company'}
            </button>
            <button
              type="button"
              onClick={() => router.push('/masters/company')}
              className="border-2 border-gray-300 text-gray-700 px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
