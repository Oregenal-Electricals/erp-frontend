'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import api from '@/lib/api';
import { Search, UserCheck, X } from 'lucide-react';

const ID_TYPES = ['AADHAAR', 'PAN', 'PASSPORT', 'DRIVING_LICENSE', 'VOTER_ID', 'EMPLOYEE_ID', 'OTHER'];

const BLANK_VISITOR = {
  firstName: '', lastName: '', mobile: '', email: '',
  visitorCompany: '', designation: '',
  idProofType: 'AADHAAR', idProofNumber: '',
};

export default function CheckInPage() {
  const router = useRouter();
  const [plants, setPlants] = useState([]);
  const [users, setUsers] = useState([]);

  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [selectedVisitorId, setSelectedVisitorId] = useState(null);

  const [visitor, setVisitor] = useState(BLANK_VISITOR);
  const [checkin, setCheckin] = useState({ plantId: '', hostEmployeeId: '', purpose: '', vehicleNumber: '', itemsCarried: '', areasToVisit: '' });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/masters/plants').then(({ data }) => setPlants(data));
    api.get('/users').then(({ data }) => setUsers(data));
  }, []);

  const searchVisitors = useCallback(async (q) => {
    if (!q.trim()) { setResults([]); return; }
    try {
      const { data } = await api.get(`/visitors?search=${encodeURIComponent(q)}`);
      setResults(data);
    } catch { /* ignore */ }
  }, []);

  function pickVisitor(v) {
    setSelectedVisitorId(v.id);
    setVisitor({
      firstName: v.firstName, lastName: v.lastName, mobile: v.mobile,
      email: v.email || '', visitorCompany: v.visitorCompany || '', designation: v.designation || '',
      idProofType: v.idProofType, idProofNumber: v.idProofNumber,
    });
    setSearch(`${v.firstName} ${v.lastName}`);
    setShowResults(false);
  }

  function clearVisitorSelection() {
    setSelectedVisitorId(null);
    setVisitor(BLANK_VISITOR);
    setSearch('');
    setResults([]);
  }

  const handleCheckIn = async () => {
    setError(''); setSuccess('');
    if (!visitor.firstName || !visitor.lastName || !visitor.mobile || !visitor.idProofNumber) {
      setError('First name, last name, mobile and ID proof are required');
      return;
    }
    if (!checkin.plantId || !checkin.purpose) {
      setError('Plant and purpose are required');
      return;
    }
    setSaving(true);
    try {
      let visitorId = selectedVisitorId;
      if (!visitorId) {
        const { data: created } = await api.post('/visitors', visitor);
        visitorId = created.id;
      }
      const { data } = await api.post('/visitor-logs/check-in', { visitorId, ...checkin });
      setSuccess(`✅ ${visitor.firstName} ${visitor.lastName} checked in — Pass: ${data.logNumber}`);
      clearVisitorSelection();
      setCheckin({ plantId: '', hostEmployeeId: '', purpose: '', vehicleNumber: '', itemsCarried: '', areasToVisit: '' });
    } catch (err) {
      const msg = err.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : msg || 'Check-in failed');
    } finally { setSaving(false); }
  };

  const inputClass = "w-full border-2 border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500";
  const labelClass = "block text-xs font-semibold text-gray-700 mb-1";

  return (
    <AppLayout>
      <div className="p-6 max-w-5xl mx-auto">
        <PageHeader title="Visitor Check-in" subtitle="Search an existing visitor or register a new one — everything happens on this page" />

        {error && <div className="mb-4 p-3 bg-red-50 border-2 border-red-300 rounded-lg text-red-700 text-sm font-medium">{error}</div>}
        {success && <div className="mb-4 p-3 bg-green-50 border-2 border-green-300 rounded-lg text-green-700 text-sm font-medium">{success}</div>}

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="mb-5 relative">
            <label className={labelClass}>Find Existing Visitor (optional — search by name or mobile)</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={search}
                onChange={e => { setSearch(e.target.value); searchVisitors(e.target.value); setShowResults(true); if (selectedVisitorId) clearVisitorSelection(); }}
                onFocus={() => search && setShowResults(true)}
                placeholder="Type a name or mobile number..."
                style={{ color: '#111827', backgroundColor: '#ffffff' }}
                className={inputClass}
              />
              {selectedVisitorId ? (
                <button type="button" onClick={clearVisitorSelection}
                  className="flex items-center gap-1 border-2 border-gray-300 text-gray-600 px-3 rounded-lg text-sm hover:bg-gray-50">
                  <X size={14} /> Clear
                </button>
              ) : (
                <button type="button" onClick={() => searchVisitors(search)}
                  className="bg-blue-600 text-white px-4 rounded-lg text-sm hover:bg-blue-700">
                  <Search size={15} />
                </button>
              )}
            </div>
            {showResults && results.length > 0 && !selectedVisitorId && (
              <div className="absolute z-20 mt-1 w-full bg-white border-2 border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {results.map(v => (
                  <div key={v.id} onMouseDown={() => pickVisitor(v)}
                    className="px-3 py-2.5 hover:bg-blue-50 cursor-pointer border-b last:border-b-0">
                    <p className="font-medium text-gray-900 text-sm">{v.firstName} {v.lastName}</p>
                    <p className="text-xs text-gray-500">{v.mobile} · {v.visitorCompany || 'Individual'}</p>
                    {v.isBlacklisted && <p className="text-xs text-red-600 font-medium mt-0.5">⚠️ Blacklisted</p>}
                  </div>
                ))}
              </div>
            )}
            {selectedVisitorId && (
              <p className="text-xs text-blue-600 mt-1">Using existing visitor record — details below are pre-filled and editable.</p>
            )}
          </div>

          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Visitor Details</h3>
          <div className="grid grid-cols-2 gap-4 mb-5">
            <div>
              <label className={labelClass}>First Name <span className="text-red-500">*</span></label>
              <input type="text" value={visitor.firstName} onChange={e => setVisitor(v => ({ ...v, firstName: e.target.value }))}
                placeholder="Rajesh" style={{ color: '#111827', backgroundColor: '#ffffff' }} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Last Name <span className="text-red-500">*</span></label>
              <input type="text" value={visitor.lastName} onChange={e => setVisitor(v => ({ ...v, lastName: e.target.value }))}
                placeholder="Kumar" style={{ color: '#111827', backgroundColor: '#ffffff' }} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Mobile <span className="text-red-500">*</span></label>
              <input type="text" value={visitor.mobile} onChange={e => setVisitor(v => ({ ...v, mobile: e.target.value }))}
                placeholder="9876543210" style={{ color: '#111827', backgroundColor: '#ffffff' }} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <input type="email" value={visitor.email} onChange={e => setVisitor(v => ({ ...v, email: e.target.value }))}
                placeholder="rajesh@company.com" style={{ color: '#111827', backgroundColor: '#ffffff' }} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Company</label>
              <input type="text" value={visitor.visitorCompany} onChange={e => setVisitor(v => ({ ...v, visitorCompany: e.target.value }))}
                placeholder="ABC Vendors Ltd" style={{ color: '#111827', backgroundColor: '#ffffff' }} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Designation</label>
              <input type="text" value={visitor.designation} onChange={e => setVisitor(v => ({ ...v, designation: e.target.value }))}
                placeholder="Sales Manager" style={{ color: '#111827', backgroundColor: '#ffffff' }} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>ID Proof Type <span className="text-red-500">*</span></label>
              <select value={visitor.idProofType} onChange={e => setVisitor(v => ({ ...v, idProofType: e.target.value }))}
                style={{ color: '#111827', backgroundColor: '#ffffff' }} className={inputClass}>
                {ID_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>ID Proof Number <span className="text-red-500">*</span></label>
              <input type="text" value={visitor.idProofNumber} onChange={e => setVisitor(v => ({ ...v, idProofNumber: e.target.value }))}
                placeholder="1234-5678-9012" style={{ color: '#111827', backgroundColor: '#ffffff' }} className={inputClass} />
            </div>
          </div>

          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Check-in Details</h3>
          <div className="grid grid-cols-2 gap-4 mb-5">
            <div>
              <label className={labelClass}>Plant <span className="text-red-500">*</span></label>
              <select value={checkin.plantId} onChange={e => setCheckin(c => ({ ...c, plantId: e.target.value }))}
                style={{ color: '#111827', backgroundColor: '#ffffff' }} className={inputClass}>
                <option value="">Select Plant</option>
                {plants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Host Employee</label>
              <select value={checkin.hostEmployeeId} onChange={e => setCheckin(c => ({ ...c, hostEmployeeId: e.target.value }))}
                style={{ color: '#111827', backgroundColor: '#ffffff' }} className={inputClass}>
                <option value="">Select Host (Optional)</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.firstName} {u.lastName} — {u.role}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className={labelClass}>Purpose <span className="text-red-500">*</span></label>
              <input type="text" value={checkin.purpose} onChange={e => setCheckin(c => ({ ...c, purpose: e.target.value }))}
                placeholder="Meeting, Delivery, Audit..."
                style={{ color: '#111827', backgroundColor: '#ffffff' }} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Vehicle Number</label>
              <input type="text" value={checkin.vehicleNumber} onChange={e => setCheckin(c => ({ ...c, vehicleNumber: e.target.value }))}
                placeholder="MH01AB1234" style={{ color: '#111827', backgroundColor: '#ffffff' }} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Items Carried</label>
              <input type="text" value={checkin.itemsCarried} onChange={e => setCheckin(c => ({ ...c, itemsCarried: e.target.value }))}
                placeholder="Laptop, Documents" style={{ color: '#111827', backgroundColor: '#ffffff' }} className={inputClass} />
            </div>
            <div className="col-span-2">
              <label className={labelClass}>Areas to Visit</label>
              <input type="text" value={checkin.areasToVisit} onChange={e => setCheckin(c => ({ ...c, areasToVisit: e.target.value }))}
                placeholder="Purchase Dept, Conference Room"
                style={{ color: '#111827', backgroundColor: '#ffffff' }} className={inputClass} />
            </div>
          </div>

          <div className="flex gap-3 pt-5 border-t border-gray-100">
            <button onClick={handleCheckIn} disabled={saving}
              className="flex items-center gap-2 bg-green-600 text-white px-6 py-2.5 rounded-lg text-sm font-bold hover:bg-green-700 disabled:opacity-50 transition-colors">
              <UserCheck size={16} />
              {saving ? 'Checking in...' : 'Check In Visitor'}
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
