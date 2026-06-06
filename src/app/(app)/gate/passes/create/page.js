'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import api from '@/lib/api';

const UNITS = ['NOS','KG','TON','MTR','LTR','BOX','SET','PCS'];

export default function CreateGatePassPage() {
  const router = useRouter();
  const [plants, setPlants] = useState([]);
  const [form, setForm] = useState({
    plantId: '', type: 'RETURNABLE',
    purpose: '', carrierName: '', carrierMobile: '',
    carrierIdProof: '', vehicleNumber: '',
    itemDescription: '', quantity: '', unit: 'NOS',
    estimatedValue: '', validFrom: '', validTo: '', remarks: '',
  });
  const [error, setError]   = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { api.get('/masters/plants').then(({ data }) => setPlants(data)); }, []);

  const handleChange = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.plantId || !form.purpose || !form.carrierName || !form.itemDescription || !form.quantity) {
      setError('Plant, purpose, carrier name, item and quantity are required');
      return;
    }
    setError(''); setSaving(true);
    try {
      const payload = { ...form };
      payload.quantity = parseFloat(payload.quantity);
      if (payload.estimatedValue) payload.estimatedValue = parseFloat(payload.estimatedValue);
      else delete payload.estimatedValue;
      if (!payload.validFrom)  delete payload.validFrom;
      if (!payload.validTo)    delete payload.validTo;
      if (!payload.vehicleNumber)  delete payload.vehicleNumber;
      if (!payload.carrierIdProof) delete payload.carrierIdProof;

      const { data } = await api.post('/gate-passes', payload);
      router.push(`/gate/passes/${data.id}`);
    } catch (err) {
      const msg = err.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : msg || 'Failed to create gate pass');
    } finally { setSaving(false); }
  };

  const inputClass = "w-full border-2 border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500";
  const labelClass = "block text-sm font-semibold text-gray-700 mb-1";

  return (
    <AppLayout>
      <PageHeader title="New Gate Pass" subtitle="Request authorization for material exit" />
      <div className="max-w-2xl">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          {error && <div className="mb-4 p-3 bg-red-50 border-2 border-red-300 rounded-lg text-red-700 text-sm font-medium">{error}</div>}

          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Pass Details</h3>
          <div className="grid grid-cols-2 gap-4 mb-5">
            <div>
              <label className={labelClass}>Plant <span className="text-red-500">*</span></label>
              <select name="plantId" value={form.plantId} onChange={handleChange}
                style={{ color: '#111827', backgroundColor: '#ffffff' }} className={inputClass}>
                <option value="">Select Plant</option>
                {plants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Pass Type <span className="text-red-500">*</span></label>
              <select name="type" value={form.type} onChange={handleChange}
                style={{ color: '#111827', backgroundColor: '#ffffff' }} className={inputClass}>
                <option value="RETURNABLE">Returnable</option>
                <option value="NON_RETURNABLE">Non-Returnable</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className={labelClass}>Purpose <span className="text-red-500">*</span></label>
              <input type="text" name="purpose" value={form.purpose} onChange={handleChange}
                placeholder="Taking laptop for client demo at Pune office"
                style={{ color: '#111827', backgroundColor: '#ffffff' }} className={inputClass} />
            </div>
          </div>

          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Carrier Details</h3>
          <div className="grid grid-cols-2 gap-4 mb-5">
            <div>
              <label className={labelClass}>Carrier Name <span className="text-red-500">*</span></label>
              <input type="text" name="carrierName" value={form.carrierName} onChange={handleChange}
                placeholder="Ramesh Kumar"
                style={{ color: '#111827', backgroundColor: '#ffffff' }} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Carrier Mobile</label>
              <input type="text" name="carrierMobile" value={form.carrierMobile} onChange={handleChange}
                placeholder="9876543210"
                style={{ color: '#111827', backgroundColor: '#ffffff' }} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>ID Proof</label>
              <input type="text" name="carrierIdProof" value={form.carrierIdProof} onChange={handleChange}
                placeholder="AADHAAR: 1234-5678-9012"
                style={{ color: '#111827', backgroundColor: '#ffffff' }} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Vehicle Number</label>
              <input type="text" name="vehicleNumber" value={form.vehicleNumber} onChange={handleChange}
                placeholder="MH01AB1234"
                style={{ color: '#111827', backgroundColor: '#ffffff' }} className={inputClass} />
            </div>
          </div>

          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Item Details</h3>
          <div className="grid grid-cols-2 gap-4 mb-5">
            <div className="col-span-2">
              <label className={labelClass}>Item Description <span className="text-red-500">*</span></label>
              <input type="text" name="itemDescription" value={form.itemDescription} onChange={handleChange}
                placeholder="Dell Laptop 15 inch + charger + bag"
                style={{ color: '#111827', backgroundColor: '#ffffff' }} className={inputClass} />
            </div>
            <div className="grid grid-cols-2 gap-3 col-span-2">
              <div>
                <label className={labelClass}>Quantity <span className="text-red-500">*</span></label>
                <input type="number" name="quantity" value={form.quantity} onChange={handleChange}
                  placeholder="1"
                  style={{ color: '#111827', backgroundColor: '#ffffff' }} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Unit</label>
                <select name="unit" value={form.unit} onChange={handleChange}
                  style={{ color: '#111827', backgroundColor: '#ffffff' }} className={inputClass}>
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className={labelClass}>Estimated Value (₹)</label>
              <input type="number" name="estimatedValue" value={form.estimatedValue} onChange={handleChange}
                placeholder="75000"
                style={{ color: '#111827', backgroundColor: '#ffffff' }} className={inputClass} />
            </div>
          </div>

          {form.type === 'RETURNABLE' && (
            <>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Return Window</h3>
              <div className="grid grid-cols-2 gap-4 mb-5">
                <div>
                  <label className={labelClass}>Valid From</label>
                  <input type="datetime-local" name="validFrom" value={form.validFrom} onChange={handleChange}
                    style={{ color: '#111827', backgroundColor: '#ffffff' }} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Return By</label>
                  <input type="datetime-local" name="validTo" value={form.validTo} onChange={handleChange}
                    style={{ color: '#111827', backgroundColor: '#ffffff' }} className={inputClass} />
                </div>
              </div>
            </>
          )}

          <div className="flex gap-3 pt-5 border-t border-gray-100">
            <button onClick={handleSubmit} disabled={saving}
              className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {saving ? 'Creating...' : 'Create Gate Pass'}
            </button>
            <button onClick={() => router.push('/gate/passes')}
              className="border-2 border-gray-300 text-gray-700 px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
