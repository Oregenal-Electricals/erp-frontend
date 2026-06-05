'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import api from '@/lib/api';

const ID_TYPES = ['AADHAAR','PAN','PASSPORT','DRIVING_LICENSE','VOTER_ID','EMPLOYEE_ID','OTHER'];

export default function RegisterVisitorPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    firstName: '', lastName: '', mobile: '', email: '',
    visitorCompany: '', designation: '',
    idProofType: 'AADHAAR', idProofNumber: '',
  });
  const [error, setError]   = useState('');
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.firstName || !form.lastName || !form.mobile || !form.idProofNumber) {
      setError('First name, last name, mobile and ID proof are required');
      return;
    }
    setError(''); setSaving(true);
    try {
      const { data } = await api.post('/visitors', form);
      router.push(`/gate/visitors/${data.id}`);
    } catch (err) {
      const msg = err.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : msg || 'Failed to register');
    } finally { setSaving(false); }
  };

  const inputClass = "w-full border-2 border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500";
  const labelClass = "block text-sm font-semibold text-gray-700 mb-1";

  return (
    <AppLayout>
      <PageHeader title="Register Visitor" subtitle="Add a new visitor to the system" />
      <div className="max-w-2xl">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          {error && <div className="mb-4 p-3 bg-red-50 border-2 border-red-300 rounded-lg text-red-700 text-sm font-medium">{error}</div>}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>First Name <span className="text-red-500">*</span></label>
              <input type="text" name="firstName" value={form.firstName} onChange={handleChange}
                placeholder="Rajesh" style={{ color: '#111827', backgroundColor: '#ffffff' }} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Last Name <span className="text-red-500">*</span></label>
              <input type="text" name="lastName" value={form.lastName} onChange={handleChange}
                placeholder="Kumar" style={{ color: '#111827', backgroundColor: '#ffffff' }} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Mobile <span className="text-red-500">*</span></label>
              <input type="text" name="mobile" value={form.mobile} onChange={handleChange}
                placeholder="9876543210" style={{ color: '#111827', backgroundColor: '#ffffff' }} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <input type="email" name="email" value={form.email} onChange={handleChange}
                placeholder="rajesh@company.com" style={{ color: '#111827', backgroundColor: '#ffffff' }} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Company</label>
              <input type="text" name="visitorCompany" value={form.visitorCompany} onChange={handleChange}
                placeholder="ABC Vendors Ltd" style={{ color: '#111827', backgroundColor: '#ffffff' }} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Designation</label>
              <input type="text" name="designation" value={form.designation} onChange={handleChange}
                placeholder="Sales Manager" style={{ color: '#111827', backgroundColor: '#ffffff' }} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>ID Proof Type <span className="text-red-500">*</span></label>
              <select name="idProofType" value={form.idProofType} onChange={handleChange}
                style={{ color: '#111827', backgroundColor: '#ffffff' }} className={inputClass}>
                {ID_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>ID Proof Number <span className="text-red-500">*</span></label>
              <input type="text" name="idProofNumber" value={form.idProofNumber} onChange={handleChange}
                placeholder="1234-5678-9012" style={{ color: '#111827', backgroundColor: '#ffffff' }} className={inputClass} />
            </div>
          </div>

          <div className="flex gap-3 mt-6 pt-5 border-t border-gray-100">
            <button onClick={handleSubmit} disabled={saving}
              className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {saving ? 'Registering...' : 'Register Visitor'}
            </button>
            <button onClick={() => router.push('/gate/visitors')}
              className="border-2 border-gray-300 text-gray-700 px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
