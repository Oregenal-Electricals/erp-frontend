'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import api from '@/lib/api';

const TYPES = ['TRUCK','TEMPO','CAR','TWO_WHEELER','CONTAINER','TANKER','OTHER'];

export default function RegisterVehiclePage() {
  const router = useRouter();
  const [form, setForm] = useState({ vehicleNumber: '', vehicleType: 'TRUCK', ownerName: '', ownerMobile: '', isCompanyVehicle: false, remarks: '' });
  const [error, setError]   = useState('');
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm(p => ({ ...p, [e.target.name]: val }));
  };

  const handleSubmit = async () => {
    if (!form.vehicleNumber || !form.vehicleType) { setError('Vehicle number and type are required'); return; }
    setError(''); setSaving(true);
    try {
      const { data } = await api.post('/vehicles', { ...form, vehicleNumber: form.vehicleNumber.toUpperCase() });
      router.push('/gate/vehicles');
    } catch (err) {
      const msg = err.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : msg || 'Failed to register');
    } finally { setSaving(false); }
  };

  const inputClass = "w-full border-2 border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500";
  const labelClass = "block text-sm font-semibold text-gray-700 mb-1";

  return (
    <AppLayout>
      <PageHeader title="Register Vehicle" subtitle="Add vehicle to the system" />
      <div className="max-w-lg">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          {error && <div className="mb-4 p-3 bg-red-50 border-2 border-red-300 rounded-lg text-red-700 text-sm font-medium">{error}</div>}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Vehicle Number <span className="text-red-500">*</span></label>
                <input type="text" name="vehicleNumber" value={form.vehicleNumber} onChange={handleChange}
                  placeholder="MH01AB1234" style={{ color: '#111827', backgroundColor: '#ffffff' }} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Vehicle Type <span className="text-red-500">*</span></label>
                <select name="vehicleType" value={form.vehicleType} onChange={handleChange}
                  style={{ color: '#111827', backgroundColor: '#ffffff' }} className={inputClass}>
                  {TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Owner Name</label>
                <input type="text" name="ownerName" value={form.ownerName} onChange={handleChange}
                  placeholder="Rajan Transport" style={{ color: '#111827', backgroundColor: '#ffffff' }} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Owner Mobile</label>
                <input type="text" name="ownerMobile" value={form.ownerMobile} onChange={handleChange}
                  placeholder="9876543210" style={{ color: '#111827', backgroundColor: '#ffffff' }} className={inputClass} />
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <input type="checkbox" name="isCompanyVehicle" id="isCompanyVehicle"
                checked={form.isCompanyVehicle} onChange={handleChange} className="w-4 h-4 accent-blue-600" />
              <label htmlFor="isCompanyVehicle" className="text-sm text-gray-700 cursor-pointer font-medium">Company owned vehicle</label>
            </div>
          </div>
          <div className="flex gap-3 mt-6 pt-5 border-t border-gray-100">
            <button onClick={handleSubmit} disabled={saving}
              className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {saving ? 'Registering...' : 'Register Vehicle'}
            </button>
            <button onClick={() => router.push('/gate/vehicles')}
              className="border-2 border-gray-300 text-gray-700 px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
