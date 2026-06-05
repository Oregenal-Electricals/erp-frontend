'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import api from '@/lib/api';
import { Search, UserCheck } from 'lucide-react';

export default function CheckInPage() {
  const router = useRouter();
  const [search, setSearch]     = useState('');
  const [visitors, setVisitors] = useState([]);
  const [plants, setPlants]     = useState([]);
  const [users, setUsers]       = useState([]);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ plantId: '', hostEmployeeId: '', purpose: '', vehicleNumber: '', itemsCarried: '', areasToVisit: '' });
  const [error, setError]   = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/masters/plants').then(({ data }) => setPlants(data));
    api.get('/users').then(({ data }) => setUsers(data));
  }, []);

  const searchVisitors = async () => {
    if (!search.trim()) return;
    try {
      const { data } = await api.get(`/visitors?search=${search}`);
      setVisitors(data);
    } catch {}
  };

  const handleCheckIn = async () => {
    if (!selected) { setError('Select a visitor first'); return; }
    if (!form.plantId || !form.purpose) { setError('Plant and purpose are required'); return; }
    setError(''); setSaving(true);
    try {
      const { data } = await api.post('/visitor-logs/check-in', { visitorId: selected.id, ...form });
      setSuccess(`✅ ${selected.firstName} ${selected.lastName} checked in — Pass: ${data.logNumber}`);
      setSelected(null); setSearch(''); setVisitors([]);
      setForm({ plantId: '', hostEmployeeId: '', purpose: '', vehicleNumber: '', itemsCarried: '', areasToVisit: '' });
    } catch (err) {
      setError(err.response?.data?.message || 'Check-in failed');
    } finally { setSaving(false); }
  };

  const inputClass = "w-full border-2 border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500";

  return (
    <AppLayout>
      <PageHeader title="Visitor Check-in" subtitle="Register visitor entry at gate" />

      {error   && <div className="mb-4 p-3 bg-red-50 border-2 border-red-300 rounded-lg text-red-700 text-sm font-medium">{error}</div>}
      {success && <div className="mb-4 p-3 bg-green-50 border-2 border-green-300 rounded-lg text-green-700 text-sm font-medium">{success}</div>}

      <div className="grid grid-cols-2 gap-6">
        {/* Search Visitor */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-bold text-gray-700 mb-4">Step 1 — Find Visitor</h3>
          <div className="flex gap-2 mb-4">
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchVisitors()}
              placeholder="Search by name or mobile..."
              style={{ color: '#111827', backgroundColor: '#ffffff' }}
              className="flex-1 border-2 border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
            <button onClick={searchVisitors}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors">
              <Search size={15} />
            </button>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {visitors.map((v) => (
              <div key={v.id}
                onClick={() => setSelected(v)}
                className={`p-3 rounded-lg border-2 cursor-pointer transition-colors ${selected?.id === v.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}>
                <p className="font-medium text-gray-900 text-sm">{v.firstName} {v.lastName}</p>
                <p className="text-xs text-gray-500">{v.mobile} · {v.visitorCompany || 'Individual'}</p>
                {v.isBlacklisted && <p className="text-xs text-red-600 font-medium mt-1">⚠️ Blacklisted</p>}
              </div>
            ))}
          </div>

          <button onClick={() => router.push('/gate/visitors/create')}
            className="w-full mt-4 border-2 border-dashed border-gray-300 text-gray-500 py-2 rounded-lg text-sm hover:border-blue-400 hover:text-blue-600 transition-colors">
            + Register New Visitor
          </button>
        </div>

        {/* Check-in Form */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-bold text-gray-700 mb-4">Step 2 — Check-in Details</h3>

          {selected && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="font-bold text-blue-800">{selected.firstName} {selected.lastName}</p>
              <p className="text-xs text-blue-600">{selected.mobile} · {selected.visitorCompany}</p>
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Plant <span className="text-red-500">*</span></label>
              <select value={form.plantId} onChange={(e) => setForm(p => ({ ...p, plantId: e.target.value }))}
                style={{ color: '#111827', backgroundColor: '#ffffff' }} className={inputClass}>
                <option value="">Select Plant</option>
                {plants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Host Employee</label>
              <select value={form.hostEmployeeId} onChange={(e) => setForm(p => ({ ...p, hostEmployeeId: e.target.value }))}
                style={{ color: '#111827', backgroundColor: '#ffffff' }} className={inputClass}>
                <option value="">Select Host (Optional)</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.firstName} {u.lastName} — {u.role}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Purpose <span className="text-red-500">*</span></label>
              <input type="text" value={form.purpose} onChange={(e) => setForm(p => ({ ...p, purpose: e.target.value }))}
                placeholder="Meeting, Delivery, Audit..."
                style={{ color: '#111827', backgroundColor: '#ffffff' }} className={inputClass} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Vehicle Number</label>
                <input type="text" value={form.vehicleNumber} onChange={(e) => setForm(p => ({ ...p, vehicleNumber: e.target.value }))}
                  placeholder="MH01AB1234"
                  style={{ color: '#111827', backgroundColor: '#ffffff' }} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Items Carried</label>
                <input type="text" value={form.itemsCarried} onChange={(e) => setForm(p => ({ ...p, itemsCarried: e.target.value }))}
                  placeholder="Laptop, Documents"
                  style={{ color: '#111827', backgroundColor: '#ffffff' }} className={inputClass} />
              </div>
            </div>
          </div>

          <button onClick={handleCheckIn} disabled={saving || !selected}
            className="w-full mt-4 flex items-center justify-center gap-2 bg-green-600 text-white py-3 rounded-lg text-sm font-bold hover:bg-green-700 disabled:opacity-50 transition-colors">
            <UserCheck size={16} />
            {saving ? 'Checking in...' : 'Check In Visitor'}
          </button>
        </div>
      </div>
    </AppLayout>
  );
}
