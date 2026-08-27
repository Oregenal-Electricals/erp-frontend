'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import api from '@/lib/api';
import { Eye, UserPlus } from 'lucide-react';

const TYPE_COLORS = {
  TRUCK: 'bg-blue-100 text-blue-700', TEMPO: 'bg-green-100 text-green-700',
  CAR: 'bg-purple-100 text-purple-700', TWO_WHEELER: 'bg-orange-100 text-orange-700',
  CONTAINER: 'bg-red-100 text-red-700', TANKER: 'bg-teal-100 text-teal-700',
  OTHER: 'bg-gray-100 text-gray-600',
};

const TABS = [
  { key: 'visitors', label: 'Visitors' },
  { key: 'vehicles', label: 'Vehicle Log' },
];

export default function VisitorsAndVehiclesPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('visitors');

  const [visitors, setVisitors] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchVisitors = useCallback(async (q) => {
    const params = q ? `?search=${q}` : '';
    const { data } = await api.get(`/visitors${params}`);
    setVisitors(data);
  }, []);

  const fetchVehicles = useCallback(async (q) => {
    const params = q ? `?search=${q}` : '';
    const { data } = await api.get(`/vehicles${params}`);
    setVehicles(data);
  }, []);

  useEffect(() => {
    setLoading(true);
    setSearch('');
    const load = activeTab === 'visitors' ? fetchVisitors('') : fetchVehicles('');
    load.finally(() => setLoading(false));
  }, [activeTab, fetchVisitors, fetchVehicles]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      setLoading(true);
      const load = activeTab === 'visitors' ? fetchVisitors(search) : fetchVehicles(search);
      load.finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(debounce);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <PageHeader
          title="Visitors & Vehicle Log"
          subtitle={activeTab === 'visitors' ? 'Registered visitors — new visitors are added via Check-in' : 'Auto-populated from Gate Inward, Visitor check-in, and other gate activity'}
          action={activeTab === 'visitors' ? (
            <button onClick={() => router.push('/gate/check-in')}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
              <UserPlus size={16} /> Check In Visitor
            </button>
          ) : null}
        />

        <div className="flex gap-1 mb-4 border-b border-gray-200">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${activeTab === t.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="mb-4">
          <input type="text"
            placeholder={activeTab === 'visitors' ? 'Search name, mobile, ID, company...' : 'Search vehicle number, owner...'}
            value={search} onChange={(e) => setSearch(e.target.value)}
            style={{ color: '#111827', backgroundColor: '#ffffff' }}
            className="border-2 border-gray-300 rounded-lg px-3 py-2 text-sm w-72 focus:outline-none focus:border-blue-500" />
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : activeTab === 'visitors' ? (
            visitors.length === 0 ? (
              <div className="p-12 text-center text-gray-400">No visitors found</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {['Name', 'Mobile', 'Company', 'ID Proof', 'Total Visits', 'Status', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {visitors.map((v) => (
                    <tr key={v.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{v.firstName} {v.lastName}</p>
                        {v.designation && <p className="text-xs text-gray-400">{v.designation}</p>}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{v.mobile}</td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{v.visitorCompany || '—'}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {v.idProofType?.replace(/_/g, ' ')} ···{v.idProofNumber?.slice(-4)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-medium">
                          {v._count?.logs || 0}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {v.isBlacklisted ? (
                          <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full font-medium">Blacklisted</span>
                        ) : (
                          <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-medium">Active</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => router.push(`/gate/visitors/${v.id}`)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                          <Eye size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          ) : (
            vehicles.length === 0 ? (
              <div className="p-12 text-center text-gray-400">No vehicles found</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {['Vehicle No', 'Type', 'Owner', 'Mobile', 'Company Vehicle', 'Total Trips', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {vehicles.map((v) => (
                    <tr key={v.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono font-bold text-gray-900">{v.vehicleNumber}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[v.vehicleType] || ''}`}>
                          {v.vehicleType}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{v.ownerName || '—'}</td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{v.ownerMobile || '—'}</td>
                      <td className="px-4 py-3 text-center">
                        {v.isCompanyVehicle
                          ? <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">Yes</span>
                          : <span className="bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full">No</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-medium">{v._count?.logs || 0}</span>
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => router.push(`/gate/vehicles/${v.id}`)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                          <Eye size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}
        </div>
      </div>
    </AppLayout>
  );
}
