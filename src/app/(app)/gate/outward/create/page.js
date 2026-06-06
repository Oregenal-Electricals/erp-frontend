'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import api from '@/lib/api';

const UNITS = ['NOS','KG','TON','MTR','LTR','BOX','BUNDLE','BAG','ROLL','SET','PCS'];

export default function CreateGateOutwardPage() {
  const router = useRouter();
  const [plants, setPlants]           = useState([]);
  const [vehicleLogs, setVehicleLogs] = useState([]);
  const [form, setForm] = useState({
    plantId: '', vehicleLogId: '',
    customerName: '', customerMobile: '', customerAddress: '', customerGstin: '',
    salesOrderNumber: '', deliveryChallanNumber: '', invoiceNumber: '', invoiceAmount: '',
    materialDescription: '', quantity: '', unit: 'NOS',
    grossWeight: '', netWeight: '', packageCount: '',
    remarks: '',
  });
  const [error, setError]   = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/masters/plants').then(({ data }) => setPlants(data));
    api.get('/vehicle-logs/active').then(({ data }) => setVehicleLogs(data));
  }, []);

  const handleChange = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.plantId || !form.customerName || !form.materialDescription || !form.quantity) {
      setError('Plant, customer, material and quantity are required');
      return;
    }
    setError(''); setSaving(true);
    try {
      const payload = { ...form };
      if (payload.quantity)      payload.quantity      = parseFloat(payload.quantity);
      if (payload.grossWeight)   payload.grossWeight   = parseFloat(payload.grossWeight);
      if (payload.netWeight)     payload.netWeight     = parseFloat(payload.netWeight);
      if (payload.invoiceAmount) payload.invoiceAmount = parseFloat(payload.invoiceAmount);
      if (payload.packageCount)  payload.packageCount  = parseInt(payload.packageCount);
      if (!payload.vehicleLogId)  delete payload.vehicleLogId;
      if (!payload.invoiceAmount) delete payload.invoiceAmount;
      if (!payload.grossWeight)   delete payload.grossWeight;
      if (!payload.netWeight)     delete payload.netWeight;
      if (!payload.packageCount)  delete payload.packageCount;

      const { data } = await api.post('/gate-outward', payload);
      router.push(`/gate/outward/${data.id}`);
    } catch (err) {
      const msg = err.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : msg || 'Failed to create GOE');
    } finally { setSaving(false); }
  };

  const inputClass = "w-full border-2 border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500";
  const labelClass = "block text-sm font-semibold text-gray-700 mb-1";

  return (
    <AppLayout>
      <PageHeader title="New Gate Outward Entry" subtitle="Record goods dispatched from gate" />
      <div className="max-w-3xl">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          {error && <div className="mb-4 p-3 bg-red-50 border-2 border-red-300 rounded-lg text-red-700 text-sm font-medium">{error}</div>}

          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Gate Information</h3>
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
              <label className={labelClass}>Link to Vehicle (Optional)</label>
              <select name="vehicleLogId" value={form.vehicleLogId} onChange={handleChange}
                style={{ color: '#111827', backgroundColor: '#ffffff' }} className={inputClass}>
                <option value="">Select Vehicle</option>
                {vehicleLogs.map(v => <option key={v.id} value={v.id}>{v.vehicle?.vehicleNumber} — {v.logNumber}</option>)}
              </select>
            </div>
          </div>

          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Customer Information</h3>
          <div className="grid grid-cols-3 gap-4 mb-5">
            <div>
              <label className={labelClass}>Customer Name <span className="text-red-500">*</span></label>
              <input type="text" name="customerName" value={form.customerName} onChange={handleChange}
                placeholder="XYZ Electronics Ltd"
                style={{ color: '#111827', backgroundColor: '#ffffff' }} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Mobile</label>
              <input type="text" name="customerMobile" value={form.customerMobile} onChange={handleChange}
                placeholder="9876543210"
                style={{ color: '#111827', backgroundColor: '#ffffff' }} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>GSTIN</label>
              <input type="text" name="customerGstin" value={form.customerGstin} onChange={handleChange}
                placeholder="27XYZAB1234Z1ZX"
                style={{ color: '#111827', backgroundColor: '#ffffff' }} className={inputClass} />
            </div>
            <div className="col-span-3">
              <label className={labelClass}>Customer Address</label>
              <input type="text" name="customerAddress" value={form.customerAddress} onChange={handleChange}
                placeholder="123 Customer Street, Mumbai"
                style={{ color: '#111827', backgroundColor: '#ffffff' }} className={inputClass} />
            </div>
          </div>

          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Order / Dispatch Details</h3>
          <div className="grid grid-cols-4 gap-4 mb-5">
            <div>
              <label className={labelClass}>Sales Order#</label>
              <input type="text" name="salesOrderNumber" value={form.salesOrderNumber} onChange={handleChange}
                placeholder="SO-26-27-0001"
                style={{ color: '#111827', backgroundColor: '#ffffff' }} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Delivery Challan#</label>
              <input type="text" name="deliveryChallanNumber" value={form.deliveryChallanNumber} onChange={handleChange}
                placeholder="DC-26-27-0001"
                style={{ color: '#111827', backgroundColor: '#ffffff' }} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Invoice Number</label>
              <input type="text" name="invoiceNumber" value={form.invoiceNumber} onChange={handleChange}
                placeholder="INV-2024-001"
                style={{ color: '#111827', backgroundColor: '#ffffff' }} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Invoice Amount (₹)</label>
              <input type="number" name="invoiceAmount" value={form.invoiceAmount} onChange={handleChange}
                placeholder="250000"
                style={{ color: '#111827', backgroundColor: '#ffffff' }} className={inputClass} />
            </div>
          </div>

          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Material Details</h3>
          <div className="grid grid-cols-2 gap-4 mb-5">
            <div className="col-span-2">
              <label className={labelClass}>Material Description <span className="text-red-500">*</span></label>
              <input type="text" name="materialDescription" value={form.materialDescription} onChange={handleChange}
                placeholder="Finished PCB Boards - 500 nos"
                style={{ color: '#111827', backgroundColor: '#ffffff' }} className={inputClass} />
            </div>
            <div className="grid grid-cols-3 gap-3 col-span-2">
              <div>
                <label className={labelClass}>Quantity <span className="text-red-500">*</span></label>
                <input type="number" name="quantity" value={form.quantity} onChange={handleChange}
                  placeholder="500"
                  style={{ color: '#111827', backgroundColor: '#ffffff' }} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Unit</label>
                <select name="unit" value={form.unit} onChange={handleChange}
                  style={{ color: '#111827', backgroundColor: '#ffffff' }} className={inputClass}>
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Package Count</label>
                <input type="number" name="packageCount" value={form.packageCount} onChange={handleChange}
                  placeholder="10"
                  style={{ color: '#111827', backgroundColor: '#ffffff' }} className={inputClass} />
              </div>
            </div>
            <div>
              <label className={labelClass}>Gross Weight (kg)</label>
              <input type="number" name="grossWeight" value={form.grossWeight} onChange={handleChange}
                placeholder="150.5"
                style={{ color: '#111827', backgroundColor: '#ffffff' }} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Net Weight (kg)</label>
              <input type="number" name="netWeight" value={form.netWeight} onChange={handleChange}
                placeholder="148.0"
                style={{ color: '#111827', backgroundColor: '#ffffff' }} className={inputClass} />
            </div>
          </div>

          <div className="flex gap-3 pt-5 border-t border-gray-100">
            <button onClick={handleSubmit} disabled={saving}
              className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {saving ? 'Creating...' : 'Create GOE'}
            </button>
            <button onClick={() => router.push('/gate/outward')}
              className="border-2 border-gray-300 text-gray-700 px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
