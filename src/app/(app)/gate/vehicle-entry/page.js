'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import api from '@/lib/api';
import { Search, Truck } from 'lucide-react';

const PURPOSES = ['INWARD','OUTWARD','INTERNAL','SERVICE','OTHER'];

export default function VehicleEntryPage() {
  const router = useRouter();
  const [search, setSearch]     = useState('');
  const [vehicles, setVehicles] = useState([]);
  const [plants, setPlants]     = useState([]);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ plantId: '', driverName: '', driverMobile: '', driverLicense: '', purpose: 'INWARD', inWeight: '', materialDescription: '', supplierName: '', customerName: '', poNumber: '', remarks: '' });
  const [error, setError]   = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/masters/plants').then(({ data }) => setPlants(data));
  }, []);

  const searchVehicles = async () => {
    if (!search.trim()) return;
    try {
      const { data } = await api.get(`/vehicles?search=${search}`);
      setVehicles(data);
    } catch {}
  };

  const handleEntry = async () => {
    if (!selected) { setError('Select a vehicle first'); return; }
    if (!form.plantId || !form.driverName || !form.purpose) { setError('Plant, driver name and purpose are required'); return; }
    setError(''); setSaving(true);
    try {
      const payload = { vehicleId: selected.id, ...form };
      if (form.inWeight) payload.inWeight = parseFloat(form.inWeight);
      else delete payload.inWeight;
      const { data } = await api.post('/vehicle-logs/entry', payload);
      setSuccess(`✅ ${selected.vehicleNumber} entry logged — ${data.logNumber}`);
      setSelected(null); setSearch(''); setVehicles([]);
      setForm({ plantId: '', driverName: '', driverMobile: '', driverLicense: '', purpose: 'INWARD', inWeight: '', materialDescription: '', supplierName: '', customerName: '', poNumber: '', remarks: '' });
    } catch (err) {
      setError(err.response?.data?.message || 'Entry failed');
    } finally { setSaving(false); }
  };

  const inputClass = "w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500";
  const labelClass = "block text-xs font-semibold text-gray-700 mb-1";

  return (
    <AppLayout>
      <PageHeader title="Vehicle Entry" subtitle="Log vehicle entry at gate" />
      {error   && <div className="mb-4 p-3 bg-red-50 border-2 border-red-300 rounded-lg text-red-700 text-sm font-medium">{error}</div>}
      {success && <div className="mb-4 p-3 bg-green-50 border-2 border-green-300 rounded-lg text-green-700 text-sm font-medium">{success}</div>}

      <div className="grid grid-cols-2 gap-6">
        {/* Search Vehicle */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-bold text-gray-700 mb-4">Step 1 — Find Vehicle</h3>
          <div className="flex gap-2 mb-4">
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchVehicles()}
              placeholder="Search vehicle number..."
              style={{ color: '#111827', backgroundColor: '#ffffff' }}
              className="flex-1 border-2 border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
            <button onClick={searchVehicles} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors">
              <Search size={15} />
            </button>
          </div>
          <div className="space-y-2 max-h-52 overflow-y-auto">
            {vehicles.map((v) => (
              <div key={v.id} onClick={() => setSelected(v)}
                className={`p-3 rounded-lg border-2 cursor-pointer transition-colors ${selected?.id === v.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}>
                <p className="font-bold text-gray-900 font-mono">{v.vehicleNumber}</p>
                <p className="text-xs text-gray-500">{v.vehicleType} · {v.ownerName || 'Unknown owner'}</p>
              </div>
            ))}
          </div>
          <button onClick={() => router.push('/gate/vehicles/create')}
            className="w-full mt-3 border-2 border-dashed border-gray-300 text-gray-500 py-2 rounded-lg text-sm hover:border-blue-400 hover:text-blue-600 transition-colors">
            + Register New Vehicle
          </button>
        </div>

        {/* Entry Form */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-bold text-gray-700 mb-4">Step 2 — Entry Details</h3>
          {selected && (
            <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2">
              <Truck size={16} className="text-blue-600" />
              <div>
                <p className="font-bold text-blue-800 font-mono">{selected.vehicleNumber}</p>
                <p className="text-xs text-blue-600">{selected.vehicleType} · {selected.ownerName}</p>
              </div>
            </div>
          )}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={labelClass}>Plant <span className="text-red-500">*</span></label>
                <select value={form.plantId} onChange={(e) => setForm(p => ({ ...p, plantId: e.target.value }))}
                  style={{ color: '#111827', backgroundColor: '#ffffff' }} className={inputClass}>
                  <option value="">Select Plant</option>
                  {plants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Purpose <span className="text-red-500">*</span></label>
                <select value={form.purpose} onChange={(e) => setForm(p => ({ ...p, purpose: e.target.value }))}
                  style={{ color: '#111827', backgroundColor: '#ffffff' }} className={inputClass}>
                  {PURPOSES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={labelClass}>Driver Name <span className="text-red-500">*</span></label>
                <input type="text" value={form.driverName} onChange={(e) => setForm(p => ({ ...p, driverName: e.target.value }))}
                  placeholder="Suresh Kumar" style={{ color: '#111827', backgroundColor: '#ffffff' }} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Driver Mobile</label>
                <input type="text" value={form.driverMobile} onChange={(e) => setForm(p => ({ ...p, driverMobile: e.target.value }))}
                  placeholder="9876543210" style={{ color: '#111827', backgroundColor: '#ffffff' }} className={inputClass} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={labelClass}>IN Weight (kg)</label>
                <input type="number" value={form.inWeight} onChange={(e) => setForm(p => ({ ...p, inWeight: e.target.value }))}
                  placeholder="5200.5" style={{ color: '#111827', backgroundColor: '#ffffff' }} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>PO Number</label>
                <input type="text" value={form.poNumber} onChange={(e) => setForm(p => ({ ...p, poNumber: e.target.value }))}
                  placeholder="PO-26-27-0001" style={{ color: '#111827', backgroundColor: '#ffffff' }} className={inputClass} />
              </div>
            </div>
            <div>
              <label className={labelClass}>Material Description</label>
              <input type="text" value={form.materialDescription} onChange={(e) => setForm(p => ({ ...p, materialDescription: e.target.value }))}
                placeholder="Steel Rods - 50 bundles" style={{ color: '#111827', backgroundColor: '#ffffff' }} className={inputClass} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={labelClass}>Supplier Name</label>
                <input type="text" value={form.supplierName} onChange={(e) => setForm(p => ({ ...p, supplierName: e.target.value }))}
                  placeholder="ABC Steel Suppliers" style={{ color: '#111827', backgroundColor: '#ffffff' }} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Customer Name</label>
                <input type="text" value={form.customerName} onChange={(e) => setForm(p => ({ ...p, customerName: e.target.value }))}
                  placeholder="XYZ Customer" style={{ color: '#111827', backgroundColor: '#ffffff' }} className={inputClass} />
              </div>
            </div>
          </div>
          <button onClick={handleEntry} disabled={saving || !selected}
            className="w-full mt-4 flex items-center justify-center gap-2 bg-green-600 text-white py-3 rounded-lg text-sm font-bold hover:bg-green-700 disabled:opacity-50 transition-colors">
            <Truck size={16} /> {saving ? 'Logging...' : 'Log Vehicle Entry'}
          </button>
        </div>
      </div>
    </AppLayout>
  );
}
