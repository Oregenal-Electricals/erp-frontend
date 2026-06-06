'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import api from '@/lib/api';

const UNITS      = ['NOS','KG','TON','MTR','LTR','BOX','SET','PCS'];
const EXIT_TYPES = ['PERSONAL','OFFICIAL','MEDICAL','EMERGENCY'];

export default function CreateGatePassPage() {
  const router = useRouter();
  const [plants, setPlants] = useState([]);
  const [users, setUsers]   = useState([]);
  const [form, setForm] = useState({
    plantId: '', type: 'RETURNABLE',
    purpose: '', carrierName: '', carrierMobile: '',
    carrierIdProof: '', vehicleNumber: '',
    itemDescription: '', quantity: '', unit: 'NOS',
    estimatedValue: '', validFrom: '', validTo: '', remarks: '',
    employeeId: '', exitType: 'PERSONAL',
    expectedReturnTime: '', departmentName: '',
  });
  const [error, setError]   = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/masters/plants').then(({ data }) => setPlants(data));
    api.get('/users').then(({ data }) => setUsers(data));
  }, []);

  const handleChange = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));
  const isStaffExit  = form.type === 'STAFF_EXIT';
  const isReturnable = form.type === 'RETURNABLE';

  const handleEmployeeChange = (e) => {
    const userId = e.target.value;
    const user   = users.find(u => u.id === userId);
    setForm(p => ({
      ...p,
      employeeId:    userId,
      carrierName:   user ? `${user.firstName} ${user.lastName}` : p.carrierName,
      carrierMobile: user?.phone || p.carrierMobile,
      departmentName: user?.role || p.departmentName,
    }));
  };

  const handleSubmit = async () => {
    if (!form.plantId || !form.purpose || !form.carrierName || !form.itemDescription || !form.quantity) {
      setError('Plant, purpose, carrier name, item and quantity are required'); return;
    }
    if (isStaffExit && !form.employeeId) { setError('Employee is required for staff exit pass'); return; }
    setError(''); setSaving(true);
    try {
      const payload = { ...form };
      payload.quantity = parseFloat(payload.quantity);
      if (payload.estimatedValue)      payload.estimatedValue      = parseFloat(payload.estimatedValue); else delete payload.estimatedValue;
      if (!payload.validFrom)          delete payload.validFrom;
      if (!payload.validTo)            delete payload.validTo;
      if (!payload.vehicleNumber)      delete payload.vehicleNumber;
      if (!payload.carrierIdProof)     delete payload.carrierIdProof;
      if (!payload.employeeId)         delete payload.employeeId;
      if (!payload.expectedReturnTime) delete payload.expectedReturnTime;
      if (!payload.departmentName)     delete payload.departmentName;
      if (!isStaffExit)                delete payload.exitType;

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
      <PageHeader title="New Gate Pass" subtitle="Request authorization for exit" />
      <div className="max-w-2xl">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          {error && <div className="mb-4 p-3 bg-red-50 border-2 border-red-300 rounded-lg text-red-700 text-sm font-medium">{error}</div>}

          {/* Pass Type Selector */}
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Pass Type</h3>
          <div className="grid grid-cols-3 gap-2 mb-5">
            {[
              { value: 'RETURNABLE',     label: 'Returnable',     desc: 'Items must return'          },
              { value: 'NON_RETURNABLE', label: 'Non-Returnable', desc: 'Items exit permanently'     },
              { value: 'STAFF_EXIT',     label: 'Staff Exit',     desc: 'Employee leaving premises'  },
            ].map((t) => (
              <button key={t.value} type="button"
                onClick={() => setForm(p => ({ ...p, type: t.value }))}
                className={`p-3 rounded-xl border-2 text-left transition-colors ${form.type === t.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}>
                <p className={`text-sm font-bold ${form.type === t.value ? 'text-blue-700' : 'text-gray-700'}`}>{t.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{t.desc}</p>
              </button>
            ))}
          </div>

          {/* Gate Details */}
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
              <label className={labelClass}>Purpose <span className="text-red-500">*</span></label>
              <input type="text" name="purpose" value={form.purpose} onChange={handleChange}
                placeholder={isStaffExit ? "Doctor appointment" : "Client demo, Delivery..."}
                style={{ color: '#111827', backgroundColor: '#ffffff' }} className={inputClass} />
            </div>
          </div>

          {/* Staff Exit Section */}
          {isStaffExit && (
            <>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Employee Details</h3>
              <div className="grid grid-cols-2 gap-4 mb-5 p-4 bg-orange-50 rounded-xl border border-orange-200">
                <div className="col-span-2">
                  <label className={labelClass}>Employee <span className="text-red-500">*</span></label>
                  <select value={form.employeeId} onChange={handleEmployeeChange}
                    style={{ color: '#111827', backgroundColor: '#ffffff' }} className={inputClass}>
                    <option value="">Select Employee</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.firstName} {u.lastName} — {u.employeeCode || u.role}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Exit Type</label>
                  <select name="exitType" value={form.exitType} onChange={handleChange}
                    style={{ color: '#111827', backgroundColor: '#ffffff' }} className={inputClass}>
                    {EXIT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Department</label>
                  <input type="text" name="departmentName" value={form.departmentName} onChange={handleChange}
                    placeholder="Production"
                    style={{ color: '#111827', backgroundColor: '#ffffff' }} className={inputClass} />
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>Expected Return Time</label>
                  <input type="datetime-local" name="expectedReturnTime" value={form.expectedReturnTime} onChange={handleChange}
                    style={{ color: '#111827', backgroundColor: '#ffffff' }} className={inputClass} />
                </div>
              </div>
            </>
          )}

          {/* Carrier Details */}
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

          {/* Item Details */}
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
            {isStaffExit ? 'Items Carried' : 'Item Details'}
          </h3>
          <div className="grid grid-cols-2 gap-4 mb-5">
            <div className="col-span-2">
              <label className={labelClass}>Description <span className="text-red-500">*</span></label>
              <input type="text" name="itemDescription" value={form.itemDescription} onChange={handleChange}
                placeholder={isStaffExit ? "Personal bag, lunch box" : "Dell Laptop + charger"}
                style={{ color: '#111827', backgroundColor: '#ffffff' }} className={inputClass} />
            </div>
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
            {!isStaffExit && (
              <div>
                <label className={labelClass}>Estimated Value (₹)</label>
                <input type="number" name="estimatedValue" value={form.estimatedValue} onChange={handleChange}
                  placeholder="75000"
                  style={{ color: '#111827', backgroundColor: '#ffffff' }} className={inputClass} />
              </div>
            )}
          </div>

          {/* Return Window — Returnable only */}
          {isReturnable && (
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
